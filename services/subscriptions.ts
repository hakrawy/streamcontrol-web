import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';
import * as api from './api';

export type SubscriptionCodeStatus = 'active' | 'disabled' | 'expired';

export interface SubscriptionCode {
  id: string;
  code: string;
  label: string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  status: SubscriptionCodeStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usedBy: Array<{ sessionId: string; usedAt: string; expiresAt: string }>;
}

export interface SubscriptionSession {
  sessionId: string;
  codeId: string;
  code: string;
  startedAt: string;
  expiresAt: string;
}

const CODES_SETTING_KEY = 'subscription_codes';
const SESSION_KEY = 'subscription_session';
const supabase = getSupabaseClient();

function id(prefix = 'sub') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateSubscriptionCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts = Array.from({ length: 3 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  );
  return parts.join('-');
}

function parseCodes(raw: string | undefined) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed as SubscriptionCode[] : [];
  } catch {
    return [];
  }
}

function normalizeCode(value: string) {
  const compact = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact.replace(/(.{4})(?=.)/g, '$1-');
}

function effectiveStatus(code: SubscriptionCode): SubscriptionCodeStatus {
  if (code.status === 'disabled') return 'disabled';
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) return 'expired';
  if (code.maxUses > 0 && code.usedCount >= code.maxUses) return 'expired';
  return 'active';
}

function fromDbCode(row: any): SubscriptionCode {
  return {
    id: row.id,
    code: row.code,
    label: row.label || 'Subscription',
    durationDays: Number(row.duration_days || 30),
    maxUses: Number(row.max_uses || 1),
    usedCount: Number(row.used_count || 0),
    status: row.status || 'active',
    createdAt: row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || null,
    lastUsedAt: row.last_used_at || null,
    usedBy: Array.isArray(row.subscription_code_uses)
      ? row.subscription_code_uses.map((use: any) => ({
          sessionId: use.session_id,
          usedAt: use.used_at,
          expiresAt: use.expires_at,
        }))
      : [],
  };
}

async function fetchDbCodes() {
  const { data, error } = await supabase
    .from('subscription_codes')
    .select('*, subscription_code_uses(session_id, used_at, expires_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromDbCode).map((code) => ({ ...code, status: effectiveStatus(code) }));
}

async function fetchSettingsCodes() {
  const settings = await api.fetchAppSettings().catch(() => ({} as Record<string, string>));
  return parseCodes(settings[CODES_SETTING_KEY]).map((code) => ({ ...code, status: effectiveStatus(code) }));
}

function mergeCodes(primary: SubscriptionCode[], fallback: SubscriptionCode[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((code) => {
    const key = normalizeCode(code.code);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchSubscriptionCodes() {
  const fallbackCodes = await fetchSettingsCodes();
  try {
    const merged = mergeCodes(await fetchDbCodes(), fallbackCodes);
    if (merged.length > fallbackCodes.length) {
      await saveCodes(merged).catch(() => null);
    }
    return merged;
  } catch {
    // Fallback keeps the project usable before the production migration is applied.
  }
  return fallbackCodes;
}

async function saveCodes(codes: SubscriptionCode[]) {
  await api.upsertAppSetting(CODES_SETTING_KEY, JSON.stringify(codes));
}

export async function createSubscriptionCode(input: { label?: string; durationDays: number; maxUses: number; expiresAt?: string | null }) {
  const current = await fetchSubscriptionCodes();
  let codeValue = generateSubscriptionCode();
  while (current.some((code) => code.code === codeValue)) codeValue = generateSubscriptionCode();
  try {
    const { data, error } = await supabase
      .from('subscription_codes')
      .insert({
        code: codeValue,
        label: input.label || 'Subscription',
        duration_days: Math.max(1, Number(input.durationDays) || 30),
        max_uses: Math.max(1, Number(input.maxUses) || 1),
        status: 'active',
        expires_at: input.expiresAt || null,
      })
      .select()
      .single();
    if (error) throw error;
    const created = fromDbCode(data);
    const fallbackCodes = await fetchSettingsCodes();
    await saveCodes(mergeCodes([created], fallbackCodes)).catch(() => null);
    return created;
  } catch {
    // Use settings fallback when the table is not installed.
  }
  const next: SubscriptionCode = {
    id: id('code'),
    code: codeValue,
    label: input.label || 'Subscription',
    durationDays: Math.max(1, Number(input.durationDays) || 30),
    maxUses: Math.max(1, Number(input.maxUses) || 1),
    usedCount: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt || null,
    lastUsedAt: null,
    usedBy: [],
  };
  await saveCodes([next, ...current]);
  return next;
}

export async function updateSubscriptionCode(idValue: string, patch: Partial<SubscriptionCode>) {
  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.label !== undefined) payload.label = patch.label;
    if (patch.durationDays !== undefined) payload.duration_days = patch.durationDays;
    if (patch.maxUses !== undefined) payload.max_uses = patch.maxUses;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.expiresAt !== undefined) payload.expires_at = patch.expiresAt;
    const { data, error } = await supabase.from('subscription_codes').update(payload).eq('id', idValue).select().single();
    if (error) throw error;
    return fromDbCode(data);
  } catch {
    // Fallback below.
  }
  const current = await fetchSubscriptionCodes();
  const next = current.map((code) => code.id === idValue ? { ...code, ...patch, status: patch.status || code.status } : code);
  await saveCodes(next);
  return next.find((code) => code.id === idValue) || null;
}

export async function deleteSubscriptionCode(idValue: string) {
  try {
    const { error } = await supabase.from('subscription_codes').delete().eq('id', idValue);
    if (error) throw error;
    return;
  } catch {
    // Fallback below.
  }
  const current = await fetchSubscriptionCodes();
  await saveCodes(current.filter((code) => code.id !== idValue));
}

export async function validateSubscriptionCode(rawCode: string) {
  const current = await fetchSubscriptionCodes();
  const normalized = normalizeCode(rawCode);
  const match = current.find((code) => normalizeCode(code.code) === normalized);
  if (!match) throw new Error('Subscription code was not found.');
  const status = effectiveStatus(match);
  if (status === 'disabled') throw new Error('Subscription code is disabled.');
  if (status === 'expired') throw new Error('Subscription code is expired or fully used.');

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + match.durationDays * 24 * 60 * 60 * 1000);
  const session: SubscriptionSession = {
    sessionId: id('session'),
    codeId: match.id,
    code: match.code,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  try {
    const { error: updateError } = await supabase
      .from('subscription_codes')
      .update({
        used_count: match.usedCount + 1,
        last_used_at: startedAt.toISOString(),
        updated_at: startedAt.toISOString(),
      })
      .eq('id', match.id);
    if (updateError) throw updateError;
    await supabase.from('subscription_code_uses').insert({
      code_id: match.id,
      session_id: session.sessionId,
      used_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  } catch {
    // Fallback below.
  }
  const nextCodes = current.map((code) => code.id === match.id
    ? {
        ...code,
        usedCount: code.usedCount + 1,
        lastUsedAt: startedAt.toISOString(),
        usedBy: [{ sessionId: session.sessionId, usedAt: startedAt.toISOString(), expiresAt: expiresAt.toISOString() }, ...(code.usedBy || [])].slice(0, 100),
      }
    : code
  );
  await saveCodes(nextCodes).catch(() => null);
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function getSubscriptionSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as SubscriptionSession;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSubscriptionSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

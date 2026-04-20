import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import type { ExternalImportItem, ExternalImportProvider, ExternalImportPreview } from '../../services/externalImport';

export interface EdgeImportPreviewResult extends Partial<ExternalImportPreview> {
  items: ExternalImportItem[];
  validated?: number;
  skipped?: number;
  failedSamples?: string[];
  liveCount?: number;
  vodCount?: number;
  seriesCount?: number;
  endpointStatus?: Array<{ name: string; ok: boolean; message: string }>;
}

export interface ValidateSubscriptionCodeResult {
  valid: boolean;
  sessionId?: string;
  subscriptionId?: string;
  codeId?: string;
  code?: string;
  label?: string;
  startedAt?: string;
  expiresAt?: string | null;
  durationDays?: number;
  maxUses?: number;
  usedCount?: number;
  message?: string;
  [key: string]: any;
}

let supabaseClient: SupabaseClient | null = null;

function readEnv(name: string) {
  const processValue = (typeof process !== 'undefined' && process.env ? process.env[name] : '') || '';
  const metaValue = typeof import.meta !== 'undefined' ? ((import.meta as any).env?.[name] || '') : '';
  return String(processValue || metaValue || '').trim();
}

function createSupabaseClient(): SupabaseClient {
  const url = readEnv('VITE_SUPABASE_URL') || readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY') || readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
}

function normalizePath(path: string) {
  return String(path || '').trim().replace(/^\/+/, '');
}

function extractMessage(error: unknown) {
  if (!error) return 'Request failed.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  const typed = error as Record<string, any>;
  return typed?.message || typed?.error || typed?.msg || 'Request failed.';
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeImportPreview(provider: ExternalImportProvider, requestedUrl: string, payload: any): EdgeImportPreviewResult {
  const source = payload && typeof payload === 'object' ? (payload.data && typeof payload.data === 'object' ? payload.data : payload) : {};
  const preview = source.preview && typeof source.preview === 'object' ? source.preview : source;
  const items = toArray<ExternalImportItem>(preview.items || source.items);
  const warnings = toArray<string>(preview.warnings || source.warnings);
  const endpointStatus = toArray<{ name: string; ok: boolean; message: string }>(preview.endpointStatus || source.endpointStatus);
  const total = Number(preview.total ?? source.total ?? items.length) || 0;
  const liveCount = Number(preview.liveCount ?? source.liveCount ?? items.filter((item) => item.type === 'channel').length) || 0;
  const vodCount = Number(preview.vodCount ?? source.vodCount ?? items.filter((item) => item.type === 'movie').length) || 0;
  const seriesCount = Number(preview.seriesCount ?? source.seriesCount ?? items.filter((item) => item.type === 'series').length) || 0;
  const validatedValue = preview.validated ?? source.validated;
  const skippedValue = preview.skipped ?? source.skipped;
  const failedSamples = toArray<string>(preview.failedSamples || source.failedSamples);

  return {
    provider,
    requestedUrl,
    resolvedUrl: String(preview.resolvedUrl || source.resolvedUrl || requestedUrl),
    sourceKind: preview.sourceKind || source.sourceKind || 'unknown',
    contentType: preview.contentType || source.contentType || 'application/json',
    total,
    items,
    warnings,
    validated: Number.isFinite(Number(validatedValue)) ? Number(validatedValue) : total,
    skipped: Number.isFinite(Number(skippedValue)) ? Number(skippedValue) : 0,
    failedSamples,
    liveCount,
    vodCount,
    seriesCount,
    endpointStatus,
  };
}

function normalizeSubscriptionResult(rawCode: string, payload: any): ValidateSubscriptionCodeResult {
  const normalized = payload && typeof payload === 'object' ? (payload.data && typeof payload.data === 'object' ? payload.data : payload) : {};
  const valid = Boolean(normalized.valid ?? normalized.isValid ?? normalized.ok ?? normalized.subscriptionId ?? normalized.codeId ?? normalized.sessionId);
  return {
    ...normalized,
    valid,
    code: String(normalized.code || rawCode).trim().toUpperCase(),
    sessionId: normalized.sessionId || normalized.session_id || normalized.session || undefined,
    subscriptionId: normalized.subscriptionId || normalized.subscription_id || normalized.id || normalized.codeId || normalized.code_id || undefined,
    codeId: normalized.codeId || normalized.code_id || normalized.subscriptionId || normalized.id || undefined,
    expiresAt: normalized.expiresAt || normalized.expires_at || null,
    startedAt: normalized.startedAt || normalized.started_at || undefined,
    message: normalized.message || normalized.error || normalized.reason || undefined,
  };
}

export async function callFunction<T = any>(path: string, body: Record<string, any> = {}): Promise<T> {
  const name = normalizePath(path);
  if (!name) throw new Error('Function name is required.');

  const { data, error } = await getSupabaseClient().functions.invoke(name, { body });
  if (error) throw new Error(extractMessage(error));

  const payload = data as any;
  if (payload && typeof payload === 'object') {
    if (payload.error && !payload.data) {
      throw new Error(extractMessage(payload.error));
    }
    if (payload.success === false || payload.ok === false) {
      throw new Error(extractMessage(payload.error || payload.message || payload.reason));
    }
  }

  return payload as T;
}

export async function importXtream(input: { host: string; username: string; password: string; fullUrl?: string; includeSeriesInfo?: boolean; maxSeriesInfoRequests?: number }) {
  const payload = await callFunction<any>('import-xtream', input);
  return normalizeImportPreview('custom', input.fullUrl || input.host, payload);
}

export async function importM3U(input: { m3uUrl: string }) {
  const payload = await callFunction<any>('import-m3u', input);
  return normalizeImportPreview('playlist', input.m3uUrl, payload);
}

export async function validateSubscriptionCode(input: { code: string }) {
  const payload = await callFunction<any>('validate-subscription-code', input);
  return normalizeSubscriptionResult(input.code, payload);
}

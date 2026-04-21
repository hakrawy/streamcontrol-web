import { getSupabaseClient } from '@/template';

type EdgeBody = Record<string, unknown>;

export interface ImportOperationResult {
  imported?: number;
  total?: number;
  validated?: number;
  skipped?: number;
  failedSamples?: string[];
  importedSeries?: number;
  importedEpisodes?: number;
  warnings?: string[];
  items?: unknown[];
  message?: string;
  [key: string]: unknown;
}

export interface SubscriptionValidationResult {
  valid?: boolean;
  subscriptionId?: string;
  codeId?: string;
  sessionId?: string;
  expiresAt?: string | null;
  startedAt?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

const supabase = getSupabaseClient();

function normalizeFunctionError(error: any, fallback: string) {
  if (!error) return fallback;
  const parts = [
    error.message,
    error.details,
    error.hint,
    error.context?.body?.message,
    error.context?.body?.error,
  ].filter(Boolean);
  return parts.length > 0 ? String(parts.join(': ')) : fallback;
}

export async function callFunction<T = unknown>(path: string, body: EdgeBody = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(path, {
    body,
  });

  if (error) {
    throw new Error(normalizeFunctionError(error, `Edge function "${path}" failed.`));
  }

  return data as T;
}

function cleanValue(value: string) {
  return String(value || '').trim();
}

export async function importXtream(input: { host: string; username: string; password: string }) {
  const host = cleanValue(input.host);
  const username = cleanValue(input.username);
  const password = cleanValue(input.password);

  if (!host || !username || !password) {
    throw new Error('Host, username, and password are required.');
  }

  return callFunction<ImportOperationResult>('import-xtream', {
    host,
    username,
    password,
  });
}

export async function importM3U(input: { m3uUrl: string }) {
  const m3uUrl = cleanValue(input.m3uUrl);

  if (!m3uUrl) {
    throw new Error('M3U URL is required.');
  }

  return callFunction<ImportOperationResult>('import-m3u', {
    m3uUrl,
  });
}

export async function validateSubscriptionCode(input: { code: string }) {
  const code = cleanValue(input.code);

  if (!code) {
    throw new Error('Subscription code is required.');
  }

  return callFunction<SubscriptionValidationResult>('validate-subscription-code', {
    code,
  });
}

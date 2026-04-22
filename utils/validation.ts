/**
 * Input validation utilities for the application.
 * Provides comprehensive validation for forms, URLs, emails, and data.
 */

import type { StreamSource } from '../services/api';

// ===== EMAIL VALIDATION =====
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ===== URL VALIDATION =====
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidStreamUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  try {
    const parsed = new URL(url);
    const validProtocols = ['http:', 'https:'];
    const validExtensions = ['.m3u8', '.mp4', '.mpd', '.webm', '.ts', '.mkv'];
    const ext = parsed.pathname.toLowerCase().slice(parsed.pathname.lastIndexOf('.'));
    return validProtocols.includes(parsed.protocol) || validExtensions.includes(ext);
  } catch {
    return false;
  }
}

// ===== STRING VALIDATION =====
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 3 && trimmed.length <= 30 && /^[a-zA-Z0-9_]+$/.test(trimmed);
}

export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8;
}

export function isValidTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  const trimmed = title.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

// ===== NUMBER VALIDATION =====
export function isValidRating(rating: number): boolean {
  return typeof rating === 'number' && rating >= 0 && rating <= 10;
}

export function isValidYear(year: number): boolean {
  return (
    typeof year === 'number' &&
    Number.isInteger(year) &&
    year >= 1900 &&
    year <= new Date().getFullYear() + 5
  );
}

export function isValidDuration(duration: string): boolean {
  if (!duration || typeof duration !== 'string') return false;
  const match = duration.match(/^(\d{1,3})\s*h(?:our)?s?\s*(?:(\d{1,2})\s*min(?:utes?)?)?$/i);
  if (!match) {
    const mins = parseInt(duration, 10);
    return !isNaN(mins) && mins > 0 && mins <= 600;
  }
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60;
}

// ===== STREAM SOURCE VALIDATION =====
export function isValidStreamSource(source: unknown): source is StreamSource {
  if (!source || typeof source !== 'object') return false;
  const s = source as StreamSource;
  return typeof s.label === 'string' && typeof s.url === 'string' && isValidUrl(s.url);
}

export function validateStreamSources(sources: unknown[]): sources is StreamSource[] {
  if (!Array.isArray(sources)) return false;
  return sources.every(isValidStreamSource);
}

// ===== CONTENT ID VALIDATION =====
export function isValidContentId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return id.length > 0 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);
}

// ===== JSON VALIDATION =====
export function isValidJson(json: string): boolean {
  if (!json || typeof json !== 'string') return false;
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

export function safeJsonParse<T = unknown>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// ===== ARRAY VALIDATION =====
export function isNonEmptyArray<T>(arr: unknown): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

export function isArrayOf<T>(arr: unknown[], validator: (item: unknown) => boolean): arr is T[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(validator);
}

// ===== DATE VALIDATION =====
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!isValidDateString(dateStr)) return false;
  const date = new Date(dateStr);
  return date.toISOString() === dateStr;
}

// ===== SANITIZATION =====
export function sanitizeString(str: string, maxLength = 200): string {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string): string {
  if (!isValidEmail(email)) return '';
  return email.trim().toLowerCase();
}

export function sanitizeUrl(url: string): string {
  if (!isValidUrl(url)) return '';
  return url.trim();
}

// ===== VALIDATION RESULT =====
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function createValidationResult(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return createValidationResult(allErrors);
}
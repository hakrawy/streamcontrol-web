/**
 * Formatting utilities for the application.
 * Provides consistent formatting for dates, numbers, durations, and display values.
 */

import { format, formatDistanceToNow, formatDuration, intervalToDuration, parseISO } from 'date-fns';

// ===== DATE FORMATTING =====
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MM/dd/yy');
}

// ===== DURATION FORMATTING =====
export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatPlaybackDuration(seconds: number): string {
  const duration = intervalToDuration({
    start: 0,
    end: seconds * 1000,
  });
  
  return formatDuration(duration, { format: ['hours', 'minutes'] }) || '0m';
}

export function formatDurationFromSecs(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== NUMBER FORMATTING =====
export function formatViewers(count: number, compact = true): string {
  if (compact) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
  }
  return count.toLocaleString();
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// ===== TEXT_FORMATTING =====
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function titleCase(text: string): string {
  return text
    .split(' ')
    .map((word) => capitalizeFirst(word))
    .join(' ');
}

export function formatGenre(genre: string | string[]): string {
  const genres = Array.isArray(genre) ? genre : [genre];
  return genres.slice(0, 2).join(', ');
}

// ===== YEAR FORMATTING =====
export function formatYear(year: number): string {
  return year?.toString() || '';
}

export function formatYearRange(start: number, end?: number | null): string {
  if (!end || end === start) {
    return start.toString();
  }
  return `${start} - ${end}`;
}

// ===== STRING FORMATTING =====
export function formatPlaybackSpeed(speed: number): string {
  if (speed === 1) return '1x';
  return `${speed}x`;
}

export function formatQuality(quality: string): string {
  return quality.toUpperCase();
}

export function formatLanguage(lang: string): string {
  const languageMap: Record<string, string> = {
    en: 'English',
    ar: 'Arabic',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    pt: 'Portuguese',
    ru: 'Russian',
  };
  return languageMap[lang] || lang;
}
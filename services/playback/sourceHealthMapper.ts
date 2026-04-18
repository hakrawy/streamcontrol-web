import type { PlaybackSource } from './types';

export function mapSourceHealthMeta(source?: PlaybackSource | null) {
  const score = Math.max(0, Math.min(100, Math.round(source?.healthScore ?? 0)));
  if (score >= 82) {
    return { label: `Healthy ${score}%`, tint: '#22C55E', background: 'rgba(34,197,94,0.16)' };
  }
  if (score >= 56) {
    return { label: `Stable ${score}%`, tint: '#F59E0B', background: 'rgba(245,158,11,0.16)' };
  }
  return { label: score > 0 ? `Risk ${score}%` : 'Unverified', tint: '#EF4444', background: 'rgba(239,68,68,0.16)' };
}


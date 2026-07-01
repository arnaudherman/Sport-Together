import { localDayKey, previousDayKey } from '@/domain/usecases/streak';

/** « il y a 12 min », « il y a 3 h », « hier », « 28 juin ». */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Regroupe le feed par jour local : « Aujourd'hui » / « Hier » / « Plus tôt ». */
export function dayBucketLabel(iso: string, tzOffsetMinutes: number, todayKey: string): string {
  const key = localDayKey(iso, tzOffsetMinutes);
  if (key === todayKey) return "Aujourd'hui";
  if (key === previousDayKey(todayKey)) return 'Hier';
  return 'Plus tôt';
}

const AVATAR_PALETTE: { bg: string; fg: string }[] = [
  { bg: '#5a3a2d', fg: '#ffb894' },
  { bg: '#2d4a5a', fg: '#94d6ff' },
  { bg: '#3a5a2d', fg: '#b8ff94' },
  { bg: '#3a2d5a', fg: '#c9b8ff' },
  { bg: '#5a2d3a', fg: '#ff94b8' },
  { bg: '#5a512d', fg: '#f5e594' },
];

/** Couleur d'avatar déterministe à partir d'un identifiant. */
export function avatarColor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Initiale majuscule d'un nom. */
export function initial(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

/** Handle @ à partir d'un pseudo (minuscules, sans espaces ni accents). */
export function handle(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `@${base || 'user'}`;
}

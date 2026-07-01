/**
 * Design system v2 « Obsidienne » — sport premium nocturne (voir docs/DESIGN-SYSTEM.md,
 * maquette de référence docs/mockups/target-a-obsidienne.html). Source unique des
 * tokens ; les composants ne codent pas de couleurs en dur.
 */
export const colors = {
  bg: '#0A0C10', // near-black bleuté
  surface: '#141821', // panel1 (utiliser <Surface> pour le dégradé complet)
  surfaceElevated: '#1A2030',
  border: 'rgba(255,255,255,0.06)', // hairline UNIQUEMENT (filets) — jamais de boxy
  text: '#F2F4F8',
  textMuted: '#8B93A3',
  textFaint: '#565E6E',
  accent: '#FF5A1F', // orange — rare et précieux
  accent2: '#FFA26B', // départ des dégradés d'accent
  accentSoft: 'rgba(255,90,31,0.14)',
  onAccent: '#0A0C10', // encre/icône sur aplat orange
  success: '#3DDC97', // récup / validé
  danger: '#FF5A66',
  gold: '#F5C451',
  track: 'rgba(255,255,255,0.08)', // fond des barres/anneaux
} as const;

/** Dégradés de la DA — centralisés pour ne pas coder les hex en dur dans les écrans. */
export const gradients = {
  accent: ['#FFA26B', '#FF5A1F'] as const, // CTA, barre d'XP, anneau
  panel: ['#141821', '#10131A'] as const, // surface des cartes (160°)
  halo: ['#182032', 'rgba(24,32,50,0)'] as const, // halo discret en haut d'écran
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const font = {
  display: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, color: colors.text } as const,
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: colors.text } as const,
  /** Chiffres-héros : grands et ULTRA-LIGHT (le contraste vient de la taille). */
  stat: { fontSize: 34, fontWeight: '200', letterSpacing: -1, color: colors.text } as const,
  title: { fontSize: 15, fontWeight: '700', color: colors.text } as const,
  body: { fontSize: 14.5, fontWeight: '400', color: colors.text } as const,
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  } as const,
} as const;

/** Ombre douce des cartes (DA : la profondeur vient de l'ombre, pas des bordures). */
export const cardShadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.45,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 12 },
  elevation: 10,
} as const;

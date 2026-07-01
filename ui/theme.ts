/**
 * Design system — DA « dark cinématique, accent chaud » (voir docs/DESIGN-SYSTEM.md).
 * Source unique des tokens visuels ; les composants ne codent pas de couleurs en dur.
 */
export const colors = {
  bg: '#0B0B0D', // fond near-black tiède
  surface: '#161514', // cartes
  surfaceElevated: '#1D1B19',
  border: '#2A2825',
  text: '#F5F4F2',
  textMuted: '#8A8784',
  textFaint: '#5B5854',
  accent: '#F0652F', // orange chaud
  accentSoft: 'rgba(240,101,47,0.16)',
  onAccent: '#0B0B0D', // encre/icône sur aplat orange (== bg)
  success: '#4ADE80',
  danger: '#F2555A', // erreurs (corail chaud, cohérent avec la DA)
  gold: '#F5C451',
  track: '#2A2825', // barres de progression (fond)
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const font = {
  display: { fontSize: 32, fontWeight: '800', color: colors.text } as const,
  h1: { fontSize: 22, fontWeight: '800', color: colors.text } as const,
  stat: { fontSize: 26, fontWeight: '800', color: colors.text } as const,
  title: { fontSize: 16, fontWeight: '700', color: colors.text } as const,
  body: { fontSize: 15, fontWeight: '400', color: colors.text } as const,
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  } as const,
} as const;

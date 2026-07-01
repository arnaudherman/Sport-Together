# Sport Together — Direction Artistique & Design System

> DA **« dark cinématique, accent chaud »** (inspirée de la référence Promethee).
> Objectif : une app premium, motivante, gamifiée, où chaque écran donne envie de
> revenir. Les tokens vivent dans `ui/theme.ts` — aucune couleur en dur ailleurs.

## Principes

1. **Sombre et cinématique.** Fond near-black tiède ; les visuels forts (hero
   images peintes/chaudes) portent l'émotion. On respire, beaucoup de noir.
2. **Un seul accent chaud.** L'orange (`#F0652F`) est rare et précieux : CTA
   principal, XP, progression, éléments actifs. Jamais décoratif.
3. **Les chiffres sont des héros.** Gros, bold (niveau, XP, streak, durée). Les
   labels sont petits, gris, en MAJUSCULES espacées.
4. **Cartes calmes.** Surfaces sombres élevées, bordure 1px discrète, radius
   généreux (14–20). Peu d'ombres, beaucoup de contraste maîtrisé.
5. **Récompense visible.** Chaque action loggée se voit (XP gagné, palier
   franchi) — la DA sert la motivation, pas la décoration.

## Tokens (`ui/theme.ts`)

| Rôle | Token | Valeur |
|---|---|---|
| Fond | `colors.bg` | `#0B0B0D` |
| Carte | `colors.surface` | `#161514` |
| Bordure | `colors.border` | `#2A2825` |
| Texte | `colors.text` | `#F5F4F2` |
| Texte muet | `colors.textMuted` | `#8A8784` |
| **Accent** | `colors.accent` | `#F0652F` |
| Positif | `colors.success` | `#4ADE80` |
| Or (médailles) | `colors.gold` | `#F5C451` |
| Radius | `radius.{sm,md,lg,pill}` | `10 / 14 / 20 / 999` |

Typo : `font.{display,h1,stat,title,body,label}` — display/stat en 800, `label`
en 700 MAJ espacé gris.

## Composants signature

- **CTA pilule** orange plein (« Lancer la session » → chez nous « Logger »).
- **Pill de niveau** (`Niveau 12`) : fond surface, texte clair.
- **Barre d'XP / de progression** : track sombre + remplissage orange arrondi.
- **Chips de réaction** (👏 💪) : arrondies, actives = fond accent-soft + texte orange.
- **Badge de streak** : flamme + nombre, ton chaud.
- **Radar de compétences** (7–8 axes) : trame sombre + polygone orange (profil).
- **Heatmap** type contribution : cases sombres → orange (assiduité 90 j).
- **Hero / cover** : image cinématique chaude en tête de profil.

## Application

Restyler écran par écran en partant du **feed** (l'écran central). Chaque écran :
fond `colors.bg`, contenu en cartes `colors.surface`, un seul accent orange par
zone d'action. Voir `ui/feed-view.tsx` (maquette de référence).

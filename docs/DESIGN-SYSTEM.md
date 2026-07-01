# Design System v2 — « Obsidienne » (sport premium nocturne)

> **Verrouillé le 2026-07-02 avec le porteur.** Référence : Whoop nocturne — sobre,
> haut de gamme, données mises en scène. La maquette qui fait foi :
> **`docs/mockups/target-a-obsidienne.html`** (rendu `renders/target-a-obsidienne.png`).
> Tout écran RN doit être **comparé à cette maquette avant commit** (capture /preview).
> L'ancienne DA « Prometheus / RPG sombre » (v1) est abandonnée.

## 1. Principes

1. **Premium sobre, pas gamer.** La gamification (XP, niveaux, série, paliers) est
   présentée comme de la *donnée sportive* (anneaux, barres fines, jalons) — jamais
   comme un HUD de jeu.
2. **Jamais de boxy.** Aucune carte à bordure dure : les surfaces sont des **dégradés**
   sombres portés par des **ombres douces**. Les séparations se font par l'espace et
   des filets `hairline`.
3. **Les chiffres sont des héros, en finesse.** Les valeurs clés sont grandes et
   **ultra-light** (weight 200, letter-spacing serré) — le contraste vient de la taille,
   pas de la graisse.
4. **L'orange est rare et précieux.** Un seul accent (`#FF5A1F`, dégradé vers `#FFA26B`),
   réservé aux actions primaires, à la progression et aux moments de récompense. Jamais
   décoratif.
5. **La photo fait partie du langage.** Posts avec photo, covers de profil — toujours
   avec un overlay sombre pour garder la lisibilité et l'ambiance nocturne.
6. **Vraie app iOS.** Tab bar persistante (Accueil / Découvrir / ＋ / Groupes / Profil),
   ＋ central en pilule dégradée ; les écrans de détail s'empilent par-dessus.

## 2. Tokens (`ui/theme.ts`)

| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#0A0C10` | fond d'écran (near-black bleuté) + halo radial discret en haut |
| `panel1 → panel2` | `#141821 → #10131A` | surface des cartes (dégradé 160°) |
| `text` | `#F2F4F8` | texte principal |
| `textMuted` | `#8B93A3` | texte secondaire |
| `textFaint` | `#565E6E` | légendes / placeholders (jamais du contenu) |
| `accent` | `#FF5A1F` | action / progression / récompense |
| `accent2` | `#FFA26B` | départ des dégradés d'accent |
| `gradients.accent` | `[#FFA26B, #FF5A1F]` | CTA, barre d'XP, anneau |
| `success` | `#3DDC97` | récup / validé |
| `hair` | `rgba(255,255,255,0.06)` | filets, tracks |
| `track` | `rgba(255,255,255,0.08)` | fond des barres/anneaux |
| `onAccent` | `#0A0C10` | encre sur aplat orange |
| `radius` | sm 12 · md 16 · **lg 22** · pill 999 | cartes en lg |
| ombre carte | `0 14px 30px rgba(0,0,0,0.45)` | + highlight 1px `rgba(255,255,255,0.05)` en haut |

**Typo** (SF système) : display 34/800 serré · **héros num 34–46/200** · title 15/700 ·
body 14–15/400 · label 11/700 letterspacing 1.5 UPPERCASE (`textFaint`).

## 3. Composants signature

- **`Surface`** : carte dégradée (panel1→panel2, 160°), radius 22, ombre douce,
  highlight 1px en haut. *Remplace toutes les cartes à bordure.*
- **`Ring`** : anneau de données SVG (stroke 5.5–7, dégradé accent, fond `track`,
  extrémités rondes), valeur ultra-light au centre + légende UPPERCASE dessous.
  Usages : série (jours), % vers le niveau suivant, récompense du composer.
- **`TabBar`** : 5 onglets, fond `rgba(13,15,21,0.86)` + blur, filet hairline en haut,
  icônes Ionicons, actif = blanc, inactif = `textFaint` ; **＋ central** 46px en pilule
  dégradée accent avec glow.
- **Bandeau « toi »** (accueil) : Surface compacte = Ring série + « Niveau N » +
  barre d'XP fine dégradée + méta (série protégée 😴, quêtes 2/3).
- **Carte de post** : avatar rond, nom + @handle · temps, badge type discret
  (`hair` bg) ; **photo** 16:9 radius 16 si présente ; ligne de stats en chiffres
  ultra-light (durée, allure, `+XP` en accent) ; engagement à droite (💬 👏).
- **Post « repos »** : compact, point `success` + « Récup » — jamais culpabilisant.
- **Sparkline** : polyline fine (2.5) grise → accent, pour les pas/tendances.
- **Paliers (arbre)** : jalons ronds reliés par un fil — accompli = accent plein,
  courant = anneau accent + glow, à venir = `hair`. Labels 10.5 en dessous.
- **Profil** : cover photo avec dégradé vers `bg`, avatar 92 chevauchant, stats héros
  (SÉANCES / JOURS DE SUITE / XP) en 40/200 avec labels UPPERCASE.
- **Composer** : sheet radius 28 par-dessus le fond, poignée, `PUBLIER DANS` +
  `TYPE` en labels UPPERCASE, sélections = fond `accentSoft` + liseré accent
  (jamais de bordure sur les non-sélectionnés), module récompense = Surface avec
  Ring % niveau + `+50 XP` héros.

## 4. Ce qui est banni

- Bordures dures sur les cartes (`borderWidth` + `borderColor` visibles).
- Chiffres-héros en gras massif (c'était la v1) — ici c'est **light**.
- Orange décoratif, emojis en guise d'icônes de chrome, écrans sans tab bar,
  états vides « morts » (toujours un CTA), zéros sans mise en scène.

## 5. Méthode (inchangée, elle a fait ses preuves)

Nouvel écran ⇒ **maquette d'abord** (HTML → PNG → validation porteur) ⇒ code RN
fidèle ⇒ **capture comparée à la maquette** ⇒ gate ⇒ commit.

# Sport Together — Gamification & Arbres de compétences

> **But :** pousser les gens à aller plus loin — dans le corps, le souffle,
> l'hygiène de vie et l'esprit — par une **progression personnelle visible** et une
> **entraide** entre amis. Inspiration assumée : le *holy graph* de l'école 42.

## Philosophie (l'âme — décidée avec le porteur)

- **Progression contre soi-même, pas contre les autres.** XP, niveaux et arbres
  mesurent *ton* chemin. **Pas de classement compétitif mondial** — ce serait
  contraire aux anti-objectifs verrouillés (vision §8 : « le groupe avant
  l'individu », « pas de comparaison compétitive », « zéro toxic-stress »).
- **Le social tire vers le haut par l'ENTRAIDE.** Le levier collectif n'est pas
  « qui est le meilleur », c'est « **aide un ami à franchir un palier** » (ex. une
  quête « aider Léa à passer 15 tractions »). L'aidant est récompensé autant que
  l'aidé. C'est le nudge bienveillant, transformé en jeu coopératif.

## 1. Le moteur : XP → Niveaux → Boosts

- **XP par goal loggé** (`domain/usecases/gamification.ts`) : séance 50, pas 30,
  repas 20 (ajustable). Réagir/encourager rapporte un peu (récompense la présence).
- **Niveaux** : courbe quadratique douce (`xpForLevel(n) = 50·n²`) — rapide au
  début, plus long ensuite ; un `Niveau N` toujours atteignable.
- **Boosts (motivation)** :
  - **Streak** = multiplicateur d'XP (le `boost ×2.0` de la référence).
  - **Journée parfaite** du groupe = bonus d'XP collectif (célébré, jamais punitif).
  - **Quêtes hebdo** : petits objectifs à cocher (« 3 séances », « aider 1 ami »).
  - **Saisons** : remise à zéro douce périodique (esprit *piscine* 42) pour
    relancer tout le monde ensemble, avec un titre gagné conservé.

## 2. Les arbres de compétences (le cœur)

Une **carte de nœuds à débloquer** par domaine. Chaque nœud = un palier concret ;
le franchir donne de l'XP + un badge + **ouvre les nœuds suivants**. L'arbre EST la
réponse visuelle à « jusqu'où je peux aller ».

- **Corps / Muscu** : 5 pompes → 20 d'affilée → gainage 1 min → 1ʳᵉ traction stricte
  → 15 tractions → développé couché à 1× poids de corps → …
- **Souffle / Cardio** : marcher 5k → courir 5k sans s'arrêter → 10k → 10k < 55 min
  → semi → …
- **Hygiène de vie** : 7 j sans écran après 22h → 30 j d'hydratation → 20 repas
  maison → sommeil régulier 14 j → …
- **Esprit / Lecture & Philo** : lire 1 livre → 5 livres → tenir un carnet 30 j →
  méditer 10 j → un essai de philo → …

Un nœud se valide par un **log de goal** (parfois avec preuve photo) ou une
**validation par un pair** du groupe (le témoin d'un exploit). Les arbres sont
**additifs** : en ajouter un = nouvelles données, pas de refonte (cohérent
ADR-0002).

## 3. Les quêtes d'entraide (le social non-toxique)

- Un membre peut **lancer une quête sur un ami** : « Aide **Léa** à débloquer *15
  tractions* ». Pendant la quête, l'aidant encourage, propose un plan, valide les
  paliers intermédiaires.
- **Récompense partagée** quand le palier tombe : l'aidé gagne le nœud + XP ;
  l'**aidant gagne de l'XP de mentorat** et un badge d'entraide.
- Effet visé : on progresse *ensemble*, personne ne « perd », et aider devient
  aussi gratifiant que réussir. C'est la traduction ludique du différenciateur.

## 4. Modèle de données (esquisse — additif)

Nouvelles tables, sans toucher l'existant :
- `skill_nodes` (catalogue : domaine, libellé, prérequis, xp) — statique/seedé.
- `user_skill_progress` (user_id, node_id, unlocked_at) — RLS par utilisateur.
- `quests` (mentor_id, target_id, group_id, node_id, statut) — RLS par groupe.
- L'XP courant reste **dérivable du feed** (`xpFromFeed`) ou matérialisé plus tard.
Les garde-fous restent : **aucune comparaison chiffrée toxique**, entraide only.

## 5. Séquencement (ne pas tout front-loader)

La **boucle core reste la colonne vertébrale** (log → le groupe voit → réaction →
streak). La gamification est une **couche par-dessus** :
1. **v1** : nouvelle DA + **XP/niveaux/streak-boost** + **un seul arbre (Muscu)**.
2. **v2** : quêtes d'entraide + 2ᵉ arbre.
3. **v3** : saisons, arbres Esprit/Hygiène, radar de compétences, profils riches.

On prouve d'abord que la boucle + la progression perso accrochent, *puis* on
étend — fidèle au garde-fou « pas de feature avant que la boucle core soit prouvée ».

---
name: preview-screenshot
description: Produit une capture du rendu RÉEL des écrans Sport Together (RN) pour la montrer au porteur, via export web + Chrome headless. À utiliser après un changement visuel, ou dès que le porteur veut « voir » l'app. Le simulateur iOS n'est pas capturable directement dans cet environnement.
---

# Capture d'écran du rendu réel — Sport Together

La route `app/preview.tsx` rend les écrans réels (Feed, Groupe, Profil, Progression,
Logger) avec des données mock. On l'exporte en web et on la capture en Chrome headless.

## Recette

Depuis la racine du dépôt :

1. **Mode mock** requis (le preview passe des ids de démo). S'assurer que `.env` n'a pas
   les vars `EXPO_PUBLIC_SUPABASE_*` actives (sinon les écrans appellent Supabase sans
   session → vides). En mock, `DEMO_FEED` (groupe `demo-group`) peuple les écrans.
2. **Export web** : `rm -rf dist && npx expo export --platform web`
   (le static rendering génère `dist/preview.html`).
3. **Router-friendly path** : `mkdir -p dist/preview && cp dist/preview.html dist/preview/index.html`
   (le routeur attend `/preview`, pas `/preview.html`).
4. **Servir** (background) : `python3 -m http.server 8092 --directory dist`
5. **Capturer** :
   ```
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
     --disable-gpu --hide-scrollbars --force-device-scale-factor=1.5 \
     --virtual-time-budget=6000 --user-data-dir=/tmp/chrome-st \
     --screenshot=/tmp/st-app.png --window-size=2160,900 "http://localhost:8092/preview/"
   ```
   `--virtual-time-budget` laisse les données mock async se charger avant la capture.
6. **Montrer** : lire l'image avec l'outil Read (`/tmp/st-app.png`) → elle s'affiche au porteur.
7. **Nettoyer** : arrêter le serveur (`pkill -f "http.server 8092"`).

## Notes

- Un PNG anormalement petit (~70 Ko) = page « Unmatched Route » : vérifier l'étape 3.
- Même technique pour rendre un `.html` statique (ex. maquette) en PNG.
- Refaire une capture **après chaque** changement visuel plutôt que d'affirmer « c'est fait ».

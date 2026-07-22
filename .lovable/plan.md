## Empêcher les captures d'écran — limites & plan de mitigation

### Réalité technique (important)
Sur le web (navigateur mobile ou desktop), **il est impossible de bloquer réellement les captures d'écran**. Contrairement aux apps natives (Android `FLAG_SECURE`, iOS via SwiftUI), les navigateurs n'exposent aucune API permettant de détecter ou empêcher un screenshot système. Aucun site (Netflix, banques, etc.) n'y arrive côté web — ils ne font que dissuader.

Je te propose donc un ensemble de **mesures dissuasives** cumulées, cohérentes avec la protection déjà en place (`ImageProtection.tsx`).

### Mesures ajoutées

1. **Masquage à la perte de focus / changement d'onglet**
   Sur mobile, ouvrir le sélecteur de captures ou passer en multitâche déclenche souvent `visibilitychange` ou `blur`. On floute alors tout le contenu (`filter: blur(40px)`) jusqu'au retour sur la page.

2. **Overlay anti-capture sur images sensibles**
   Ajout d'un calque invisible (watermark diagonal semi-transparent avec email/IP de l'utilisateur connecté si dispo, sinon timestamp) sur les images produits. Rend toute capture identifiable/traçable.

3. **Détection PrintScreen (desktop)**
   Écoute des touches `PrintScreen`, `Ctrl+P`, `Ctrl+Shift+S` → vide le presse-papier + affiche un avertissement.

4. **Meta / headers dissuasifs**
   - `<meta name="robots" content="noimageindex">` pour empêcher indexation des images
   - CSS `-webkit-user-select: none`, `-webkit-touch-callout: none` renforcés sur mobile

5. **Message utilisateur clair**
   Petit toast la première fois : « Les captures d'écran de ce site sont interdites et traçables. »

### Fichiers modifiés
- `src/components/security/ImageProtection.tsx` — ajout des listeners `visibilitychange`, `blur`, PrintScreen + injection du blur global
- `src/index.css` — classe `.screenshot-blur` (blur global temporaire) + renforcement `user-select` mobile
- `src/components/security/ScreenshotWatermark.tsx` *(nouveau)* — overlay watermark diagonal traçable
- `src/App.tsx` — monte `<ScreenshotWatermark />` global
- `index.html` — meta `noimageindex`

### Ce que ça NE fera PAS
- Bloquer une capture système iOS/Android → **impossible en web**
- Empêcher une photo de l'écran avec un autre appareil → **impossible**
- Bloquer les outils de capture pro (OBS, etc.) → **impossible**

Pour un vrai blocage, il faudrait passer par une **app native** (React Native / Capacitor avec `FLAG_SECURE`). Je peux le préparer si tu veux aller jusque-là.

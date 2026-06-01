## Problème

Sur la capture d'écran, le bouton rond ✨ (UnifiedFab — `src/components/layout/UnifiedFab.tsx`) se superpose au champ « Posez votre question… » du widget chatbot (`src/components/layout/ChatBotWidget.tsx`).

Cause : tous les FAB sont positionnés via `cornerStyle()` (`src/lib/fabPosition.ts`) avec `zIndex: 50`, identique au panneau du chatbot (`z-50`). Le bouton Sparkles est ancré bottom‑right comme le panneau (360×520 px, bottom‑6 right‑6), donc il se retrouve visuellement par‑dessus l'input.

## Correctif (UI uniquement, pas de logique métier)

1. **`src/components/layout/ChatBotWidget.tsx`**
   - Faire passer le panneau ouvert à `z-[60]` (au‑dessus des FAB en `z-50`).
   - Faire de même pour le bouton « ouvrir le chat » trigger pour rester cliquable.

2. **`src/components/layout/UnifiedFab.tsx`**
   - Lorsque le chatbot est ouvert (lire un état global via `window` event déjà émis, ou ajouter un petit contexte/observer sur `body[data-chat-open]`), masquer/atténuer le socle Sparkles et le Dock pour libérer le coin bas‑droit et éviter tout chevauchement de zone cliquable.
   - Solution simple : `ChatBotWidget` ajoute/retire `document.body.dataset.chatOpen = '1'` à l'ouverture/fermeture ; `UnifiedFab` lit cet attribut via un petit hook et applique `opacity-0 pointer-events-none` quand actif.

3. **`src/lib/fabPosition.ts`** (facultatif, défensif)
   - Réduire le `zIndex` par défaut de `cornerStyle` à `40` pour que tout panneau modal/dialogue passe naturellement au‑dessus des FAB. Vérifier les autres consommateurs (UnifiedFab Dock, SocleStack) restent fonctionnels.

## Vérification

- Ouvrir le chatbot sur desktop (1540px) et mobile (375px) via le navigateur de preview : la zone « Posez votre question… » et le bouton « Envoyer » doivent être entièrement libres, aucun bouton FAB ne doit chevaucher.
- Fermer le chatbot : le bouton Sparkles réapparaît à sa place et reste cliquable.
- Vérifier qu'aucun autre overlay (Newsletter popup, Mega menu) n'est régressé.

Pas de changement backend, pas de migration, pas de modification de la logique des FAB ou du chatbot — uniquement positionnement/z-index/visibilité conditionnelle.

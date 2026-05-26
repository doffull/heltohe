
# Plan — Bannière vocale, transition glossy, header animé

Périmètre strict : **uniquement** les 3 ajouts demandés. Aucune autre modification.

---

## 1. Bannière "Commandes vocales + Assistant IGRA"

Nouvelle **section éditable** côté admin (donc modifiable depuis le tableau de bord, comme les autres sections home).

- Nouveau composant `src/components/home/VoiceAssistantBanner.tsx`
  - Visuel Industrial Luxury : fond glass/chamfer, icône micro (Mic) + icône bot (Bot), titre + sous-titre + CTA.
  - Texte par défaut : « Commandez à la voix », « Dites ce que vous cherchez — IGRA, votre assistant IA, répond à toutes vos questions ».
  - 2 boutons : "Activer la voix" (déclenche le FAB voice déjà présent) / "Parler à IGRA" (ouvre le ChatBotWidget).
- Enregistré comme **bloc home** dans `HomeBlocksEditor` (clé `voiceBanner`) avec :
  - `enabled`, `title`, `subtitle`, `voiceCtaLabel`, `chatCtaLabel`, `position`.
  - Champs stockés dans `design_settings.homeBlocks` (système existant).
- Rendu dans `src/pages/Home.tsx` à la position définie, comme les autres blocs.
- Éditable également dans l'éditeur visuel (onglet Sections existant).

> Pas de migration DB nécessaire : on réutilise `design_settings.homeBlocks`.

---

## 2. Transition de page glossy — "Tige chromée + désaturation + zoom"

Remplacement de l'overlay `FlashOverlay` actuel dans `src/App.tsx` par une transition plus moderne :

- Composant `src/components/transitions/ChromeBarTransition.tsx`
  - **Phase A (sortie 350ms)** : la page courante se désature (`filter: grayscale + slight zoom 1.05`) avec un léger blur.
  - **Phase B (passage de tige 450ms)** : une **barre chromée verticale** (gradient argent/blanc/gris avec sheen animé) traverse l'écran de gauche à droite, avec reflets et trace lumineuse.
  - **Phase C (entrée 350ms)** : la nouvelle page entre depuis grayscale+zoom vers couleur normale (`scale 1`, `grayscale 0`).
- Implémentation via Framer Motion (déjà utilisé) + CSS gradient + `mix-blend-mode: overlay` pour la sheen.
- Plug-in dans `AnimatedRoutes` (remplace `FlashOverlay`). Variants `pageVariants` ajustés pour intégrer le filtre grayscale + scale.
- Tokens sémantiques uniquement (chrome utilise `foreground` / `background` avec opacités), pas de couleurs en dur.

---

## 3. Header — logo glossy + effet "frozen loop"

Dans `src/components/layout/Header.tsx` et `src/components/layout/BrandLogo.tsx` :

### 3a. Logo glossy animé
- Sur `BrandLogo variant="header"` : ajout d'un sheen animé en boucle douce (gradient blanc translucide qui traverse le logo toutes les ~6s), masqué par la forme du logo.
- Légère respiration `scale: [1, 1.015, 1]` sur 8s pour effet "glass vivant".

### 3b. Header "frozen loop"
- Sur le `<header>` : superposition d'une couche `pointer-events-none` :
  - Backdrop-filter renforcé (déjà présent).
  - Animation lente d'une **ligne de givre/condensation** (gradient horizontal très subtil qui glisse de gauche à droite toutes les ~10s).
  - Léger grain glacé via gradient radial animé (opacité 5%).
- Pas d'impact sur l'interactivité (couche overlay au-dessus en `pointer-events-none`).

---

## Détails techniques

- **Fichiers créés** :
  - `src/components/home/VoiceAssistantBanner.tsx`
  - `src/components/transitions/ChromeBarTransition.tsx`
- **Fichiers modifiés** (minimal, uniquement pour brancher) :
  - `src/App.tsx` — remplace `FlashOverlay` par `ChromeBarTransition`, ajuste `pageVariants`.
  - `src/pages/Home.tsx` — rend `VoiceAssistantBanner` selon position.
  - `src/components/admin/HomeBlocksEditor.tsx` — ajoute l'entrée `voiceBanner`.
  - `src/components/layout/Header.tsx` — overlay "frozen loop".
  - `src/components/layout/BrandLogo.tsx` — sheen + respiration sur variant header.

Aucun autre fichier ne sera touché. Aucune migration DB, aucun changement de logique métier, d'auth, de RLS, ou de routes.

---

## Vérification

- Build TypeScript.
- Smoke visuel sur preview : home, navigation entre 2 pages (transition), header animé, bannière voice visible et éditable en admin.

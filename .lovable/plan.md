# Plan — Améliorations admin & expérience d'accueil

## 1. Bouton « Ajouter une section » bien visible (Admin → Icônes accueil)
- Dans `HomeCustomSectionsEditor.tsx`, ajouter en haut un bandeau d'action avec un **gros bouton « + Ajouter une section »** qui ouvre un menu (Hero, Image, Vidéo, Slider, Titre, Sous-titre, Texte, Grille produits).
- Dans `PageBuilder.tsx`, déplacer la barre de sélection des types de sections en **sticky en haut** + ajouter un bouton flottant « + Ajouter » en bas de la liste pour les longues pages.
- Surfacer un état vide pédagogique : « Aucune section. Cliquez sur + pour ajouter du contenu personnalisé. »

## 2. Réactiver la roulette + ordre d'apparition au chargement
- Vérification : `roulette_config.enabled = true` en base. Le composant `RouletteFab` se cache si `segments.length === 0` — vérifier qu'il existe au moins 1 segment actif, sinon insérer un jeu par défaut (6 cartes).
- Orchestrer une **séquence d'apparition** dans `Home.tsx` (nouveau hook `useHomepageIntroSequence`) :
  1. **CGV popup** (si non acceptées) → bloque
  2. **Roulette / Jeu de cartes** auto-ouverte 1×/24h (clé `lvtk:roulette:lastSeen` en localStorage)
  3. Sidebar / autres popups ensuite
- `RouletteFab` : retirer le délai aléatoire actuel, écouter un event `lvtk:intro:open-roulette` déclenché par la séquence.

## 3. Finaliser la transition « shutter » + gestionnaire de transitions
- Compléter `PageShatterTransition.tsx` : finir les variantes (timing courbes, easing, sheen métallique sur les cellules, fallback `prefers-reduced-motion`).
- Créer **`src/components/transitions/transitionRegistry.ts`** listant les transitions disponibles : `shatter`, `fade`, `chrome-bar`, `none`.
- Nouvelle page admin **`/admin/transitions`** (`AdminTransitions.tsx`) :
  - Sélecteur de transition active (stockée dans `design_settings.pageTransition`)
  - Réglages : durée, easing, intensité, désactiver pour `prefers-reduced-motion`
  - Aperçu live (bouton « Tester la transition »)
- Brancher `App.tsx` (`AnimatedRoutes`) pour lire `designSettings.pageTransition` et choisir dynamiquement le composant.
- Ajouter l'entrée « Transitions » dans la sidebar admin (`Admin.tsx`).

## 4. Analytique des bannières
- Migration : nouvelle table `banner_analytics` (banner_id, banner_type, event `view|click|dismiss`, session_hash, url, created_at) + RLS : insert public, select admin.
- Hook `useBannerAnalytics()` exposant `trackView/Click/Dismiss`.
- Instrumenter : `VoiceAssistantBanner`, `PopupBanner`, `NewsletterPopupHost`, `LoyaltyBanner`, `PromoBanner`, `PromoCountdown`.
- Nouvelle page admin **`/admin/banners-analytics`** : tableau (vues, clics, dismiss, CTR, taux de conversion sur 7/30j) + graphique simple.

## 5. FAB configurable + fallbacks micro + mode démo
- **FAB configurable** : compléter `UnifiedFabEditor` pour exposer tous les réglages (taille, opacité, variante glossy/glass/neon, position desktop/mobile, badge, action). Stocker dans `design_settings.fabConfig`.
- **Fallbacks micro** dans `VoiceCommandFab.tsx` :
  - Détecter `SpeechRecognition` indisponible → bascule UI « Écrire à IGRA »
  - HTTPS manquant → toast + lien doc
  - `permissions.query({name:'microphone'})` → afficher état (granted/denied/prompt)
  - `denied` → modal expliquant comment réautoriser (Chrome/Safari/Firefox)
  - Tester aussi sur iOS Safari (utiliser `webkitSpeechRecognition`).
- **Mode démo** :
  - Toggle dans `/admin/settings` → `design_settings.demoMode = true`
  - Effets : sidebar visible en permanence, roulette auto-ouverte à chaque visite, popups réinitialisés à chaque chargement, badge « DEMO » en bas à droite
  - Hook `useDemoMode()` consommé par PopupBanner, RouletteFab, Sidebar, NewsletterPopupHost.

## Détails techniques
- **Fichiers créés** : `AdminTransitions.tsx`, `transitionRegistry.ts`, `useHomepageIntroSequence.ts`, `useBannerAnalytics.ts`, `useDemoMode.ts`, page `AdminBannersAnalytics.tsx`.
- **Fichiers modifiés** : `HomeCustomSectionsEditor.tsx`, `PageBuilder.tsx`, `Home.tsx`, `App.tsx`, `Admin.tsx`, `RouletteFab.tsx`, `VoiceCommandFab.tsx`, `UnifiedFabEditor.tsx`, `PageShatterTransition.tsx`, bannières instrumentées.
- **Migration** : table `banner_analytics` + RLS + index.
- **Data seed** (si vide) : INSERT de 6 segments roulette par défaut.

## Ordre d'exécution
1. Bouton « Ajouter section » (rapide, UX)
2. Migration analytics + hook
3. Réactivation roulette + séquence intro
4. Finition shutter + page transitions
5. FAB configurable + fallbacks micro
6. Mode démo + instrumentation bannières
7. Smoke test (build, navigation, séquence intro, micro denied/granted)
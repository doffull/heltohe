# Plan — Polish, transitions, card game & UX fixes

## 1. Suppression de la transition "barre métallique"
- Supprimer `ChromeBarTransition` de `src/App.tsx` (et le fichier `src/components/transitions/ChromeBarTransition.tsx`).
- Remplacer par une transition **décomposition / recomposition** (effet "shatter / rebuild") :
  - Nouveau composant `src/components/transitions/PageShatterTransition.tsx`.
  - Variants Framer Motion sur la `<motion.div>` qui wrappe les Routes :
    - **Exit** : la page se fragmente — `filter: blur(0→8px)`, `scale: 1→1.08`, `opacity: 1→0`, léger `rotateX` ; combiné à un overlay grid (12 cellules) où chaque cellule part dans une direction aléatoire avec stagger 20ms.
    - **Enter** : 12 cellules reconviennent au centre (translate aléatoire → 0, opacity 0→1) avec stagger 15ms, puis page `blur 6→0`, `scale 1.04→1`, `opacity 0→1`.
  - Durée totale ≈ 600ms, ease `[0.22, 1, 0.36, 1]`.
  - Respecte `prefers-reduced-motion` (fallback simple fade 200ms).

## 2. Réactivation du jeu de cartes (ex‑roulette)
- La FAB cadeau dans `FabStack.tsx` est conditionnée par `rouletteConfig?.enabled`. Vérifier en base et **forcer `enabled=true`** via insert si nécessaire.
- Confirmer que `RouletteFab` ouvre bien le **jeu de cartes** (3‑6 cartes face cachée) — sinon, brancher le composant `CardGameModal` à la place de la roue.
- Ajouter un badge "Jeu" visible et un libellé "Tentez votre chance" sur la FAB.
- S'assurer que la config admin (`/admin/roulette`) permet de basculer entre roue/cartes et de définir le nombre de cartes (3–6).

## 3. Bannière IGRA / commande vocale — version premium colorée
- Refonte de `src/components/home/VoiceAssistantBanner.tsx` :
  - Fond **gradient bleu premium** (deep navy → electric blue → cyan glow), conserve l'esprit chamfer/glass.
  - Halo radial bleu animé (slow pulse), liseré chromé fin, micro‑particules.
  - Deux CTA différenciés :
    - **"Commandez à la voix"** — primary bleu glossy avec icône Mic animée (pulse à l'idle).
    - **"Parler à IGRA"** — secondary glass blanc/cyan avec icône Bot.
  - Typo : eyebrow "NOUVEAU · IA VOCALE" + titre + sous‑titre court.
  - Respecte `prefers-reduced-motion`.
- Tokens HSL ajoutés dans `index.css` : `--voice-blue-deep`, `--voice-blue-bright`, `--voice-cyan-glow` + utilitaire `.voice-gradient`.

## 4. Activation vocale — permissions & robustesse
- Audit de `src/components/voice/VoiceCommandFab.tsx` + `supabase/functions/voice-command` :
  - Appel explicite à `navigator.mediaDevices.getUserMedia({ audio: true })` **avant** d'initier la reconnaissance, avec gestion des 3 états : `granted` / `denied` / `prompt`.
  - Toasts clairs : "Microphone refusé — activez‑le dans les réglages du navigateur" avec lien d'aide.
  - Détection `SpeechRecognition` indisponible → fallback message + bouton chat.
  - Affichage explicite d'un état "Écoute…" avec animation + bouton stop.
  - Test contexte HTTPS (sinon message d'erreur).

## 5. Éditeur IGRA admin complet
- Page `/admin/chatbot` (`AdminChatbot.tsx`) étendue :
  - Onglets : **Identité** (nom, avatar, ton), **Prompt système**, **FAQ rapide**, **Commandes vocales** (mots‑clés → action), **Apparence** (couleurs bulle, position), **Logs**.
  - Persistance via `admin_config` clé `chatbot_settings` (extension de l'existant).
  - Sauvegarde manuelle explicite (pas d'auto‑save).

## 6. Sidebar — pop‑up max 1× / jour après fermeture
- Dans `src/context/SidebarContext.tsx` (et/ou le composant qui re‑ouvre auto) :
  - Quand l'utilisateur **ferme** la sidebar, écrire `localStorage.setItem('sidebar_dismissed_at', Date.now())`.
  - Le timer de réapparition (actuellement 10s–1min) ne se déclenche **que si** `Date.now() - dismissed_at > 24h`.
  - Sinon, la sidebar reste fermée jusqu'au prochain refresh manuel par l'utilisateur ou au lendemain.
  - Idem pour `PopupBanner` / `NewsletterPopupHost` : clé `popup_dismissed_at_<id>` avec TTL 24h.

## 7. Accessibilité des animations
- Hook utilitaire `useReducedMotion()` (déjà fourni par Framer Motion) appliqué à :
  - `PageShatterTransition`, `VoiceAssistantBanner`, `BrandLogo` (sheen/breathe), header "frozen" overlay, FABs.
- Si `reduce` → animations désactivées (durée 0 ou simple fade).
- Ajout d'attributs `aria-hidden="true"` sur les overlays décoratifs purs.
- Vérifier focus visible sur les FABs et CTA bannière.

## 8. Warnings `fetchpriority`
- Recherche globale des `<img fetchPriority="...">` mal cassés (React attend `fetchPriority` camelCase, certains endroits utilisent `fetchpriority`).
- Correction dans : `HeroSlider`, `BrandLogo`, `ProductCard`, `CategoryGrid`, tout composant image LCP.
- Sur les images non‑critiques : `loading="lazy"` + `decoding="async"`.

## 9. Tests événements
- Ajout de tests Vitest :
  - `VoiceAssistantBanner.test.tsx` : clic CTA voix dispatch `lvtk:open-voice`, clic IGRA dispatch `lvtk:open-chatbot`.
  - `SidebarContext.test.ts` : après dismiss, pas de re‑open avant 24h.
  - `PageShatterTransition.test.tsx` : rend les enfants, respecte reduced‑motion.

## 10. Vérification finale
- Build + smoke test :
  - Home charge sans erreur console.
  - FAB jeu de cartes visible et cliquable.
  - Bannière IGRA rendue avec gradient bleu.
  - Transition shatter fonctionne entre 2 routes.
  - Sidebar ne réapparaît pas après fermeture (test localStorage).
  - Vocal : prompt permission micro affiché.

## Fichiers touchés

**Créés**
- `src/components/transitions/PageShatterTransition.tsx`
- `src/components/home/__tests__/VoiceAssistantBanner.test.tsx`
- `src/context/__tests__/SidebarContext.test.ts`

**Modifiés**
- `src/App.tsx` (remplace ChromeBar par Shatter, pageVariants simplifiés)
- `src/components/home/VoiceAssistantBanner.tsx` (refonte premium bleu)
- `src/components/voice/VoiceCommandFab.tsx` (permissions micro)
- `src/components/layout/FabStack.tsx` (jeu cartes visible)
- `src/context/SidebarContext.tsx` (TTL 24h)
- `src/components/home/PopupBanner.tsx` + `NewsletterPopupHost.tsx` (TTL 24h)
- `src/pages/admin/AdminChatbot.tsx` (éditeur IGRA complet)
- `src/index.css` (tokens bleu IGRA, retrait keyframes barre chrome inutilisée)
- `src/components/layout/Header.tsx` + `BrandLogo.tsx` (reduced‑motion)
- Composants image (fetchPriority camelCase)

**Supprimés**
- `src/components/transitions/ChromeBarTransition.tsx`

**Données**
- 1 `insert` éventuel : `UPDATE roulette_config SET enabled=true WHERE config_key='main'` si désactivé.

Aucune migration de schéma nécessaire.
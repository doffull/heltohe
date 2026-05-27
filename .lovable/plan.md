
# Plan de stabilisation complète + refonte jeu

Objectif : zéro régression visuelle entre éditeur et site publié, médias toujours présents (fallback partout), jeu repensé (cartes à gratter par défaut + sélecteur de type de jeu dans l'admin), micro vocal blindé, et tout ce qui est édité dans Lovable persisté côté base et rejoué identiquement sur le site.

---

## 1. Logo & header — robustes partout

- `src/components/layout/BrandLogo.tsx` : composant unique réutilisé par `MainLayout`, `Header`, `Footer`, `Sidebar`, pages auth. 
  - Source : `designSettings.logoUrl` → fallback image storage → fallback texte (nom du site) → fallback constant final.
  - Gère `onError` → bascule sur texte sans casser la mise en page (hauteur réservée).
  - Cache image en mémoire pour éviter le "flash" entre routes.
- Suppression de tous les `<img src={logoUrl}>` directs au profit de `<BrandLogo />`.

## 2. Fallback médias externes (images / vidéos)

- Nouveau utilitaire `src/lib/safeMedia.ts` : `<SafeImage>` et `<SafeVideo>` avec `onError` → `/placeholder.svg`, `loading="lazy"`, `decoding="async"`, dimensions réservées (anti-CLS).
- Adoption dans : `HeroSlider`, `CategoryGrid`, `ProductCard`, `ProductImageGallery`, `RelatedProducts`, `TechwearHero`, `PageRenderer`, `HomeCustomSections`, `LoyaltyBanner`, `PromoBanner`.
- Détection des URL WordPress cassées → bascule immédiate sur placeholder, log silencieux pour `admin/audit`.

## 3. Persistence garantie des réglages (édition = production)

- Migration : ajouter colonne `settings_json jsonb` sur `design_settings` (catch-all des nouveaux champs) + trigger `updated_at`.
- `useDesignSettings` : merge `settings_json` avec colonnes typées, cache `localStorage` (`lvtk-design-cache`) servi instantanément au boot, remplacé dès que la requête réseau revient.
- `AppContext` : `initializedRef` déjà en place — confirmer qu'aucune écriture côté UI n'écrase l'état réseau (effet réciproque uniquement quand l'utilisateur clique "Save").
- Idem pour `useHomeBlocks`, `useHomeFabButtons`, `useCategories`, `useProducts` : cache local + `placeholderData` pour que l'URL publique ne montre jamais d'écran vide.

## 4. Refonte du jeu — remplacement de la roulette

Le design actuel est rejeté. Nouveau système :

- **Nouveau composant `GameCardScratch`** (cartes à gratter) — design industriel minimal Helvetica-MP, biseaux 45°, 3 cartes face cachée, le joueur en choisit une et la "gratte" (canvas mask). Animation Motion sobre.
- **Admin `AdminRoulette` renommé `AdminGames`** avec sélecteur de type de jeu (radio cards) :
  1. `scratch` — Cartes à gratter (par défaut, nouveau design)
  2. `wheel` — Roulette classique (conservée pour ceux qui aiment)
  3. `mystery` — Boîte mystère (1 clic, ouverture animée)
  4. `flash` — Promo flash (compte à rebours + clic unique)
- Le choix est stocké dans `roulette_config.game_type` (nouvelle colonne `text default 'scratch'`).
- Le FAB et la page publique lisent `game_type` et montent le composant correspondant — la logique serveur `spin_roulette` reste identique (segments + cooldown + code promo).
- Aperçu live dans l'admin de chaque type avant publication.

## 5. Micro vocal — fallback durci + validation Edge

Côté client (`VoiceCommandFab.tsx`) :
- Limite UI dure : transcript coupé à 240 caractères, compteur visible, bouton "Envoyer" désactivé sous 3 caractères ou au-dessus de la limite.
- Erreurs SpeechRecognition tracées avec type (`no-speech`, `aborted`, `not-allowed`, `network`, `audio-capture`, `service-not-allowed`) → toast spécifique + log `client_error_logs`.
- Simulation forcée du 404 / 400 de l'edge function avec message utilisateur clair et retry manuel (pas de boucle).
- Auto-restart `no-speech` plafonné à 2, ensuite affichage "Aucune voix détectée — clic pour relancer".

Côté Edge (`supabase/functions/voice-command/index.ts`) :
- Validation Zod : `transcript: string().min(2).max(240)`, sinon `400 INVALID_TRANSCRIPT` (déjà partiellement en place, durcir).
- Réponse `404 NO_INTENT` propre quand Gemini ne renvoie rien d'exploitable, au lieu d'un crash.
- CORS et logs structurés (`level`, `code`, `latency_ms`).

## 6. Analytics / chat / roulette — chargement différé

- `useVisitorTracking`, `ChatBotWidget`, `RouletteFab` montés via `requestIdleCallback` (fallback `setTimeout(0)`) après LCP — réduit le TTI mobile.
- Erreurs `Failed to fetch` (visitor-tracking) silencieuses, retry exponentiel borné (max 2).

## 7. Performance — pages < 1s

- Lazy-load des routes admin (`React.lazy` + `Suspense`) — déjà partiellement, étendre aux gros pages (`AdminProducts`, `AdminDesign`, `AdminOrders`).
- Preload du logo + image hero LCP via `<link rel="preload">` injecté par `HeroSlider`.
- `AnimatePresence mode="wait"` → vérifier qu'il n'y a qu'un seul enfant à la fois (warning console actuel) dans `FadeTransition` et `PageShatterTransition`.
- Query defaults déjà durcis (étape précédente) — confirmer.

## 8. Sécurité (rappel utilisateur)

- Lancer `supabase--linter` après migrations, fixer Security Definer / search_path restants.
- Vérifier RLS sur `roulette_config` (lecture publique OK, écriture admin only) après ajout `game_type`.

---

## Détails techniques (référence dev)

```text
Nouveaux fichiers
├─ src/components/layout/BrandLogo.tsx
├─ src/lib/safeMedia.ts           (SafeImage, SafeVideo)
├─ src/components/games/
│  ├─ GameCardScratch.tsx         (nouveau, défaut)
│  ├─ GameWheel.tsx               (refactor de RouletteFab existant)
│  ├─ GameMysteryBox.tsx
│  ├─ GameFlashPromo.tsx
│  └─ GameRouter.tsx              (lit game_type, monte le bon)
└─ supabase/migrations/<ts>_game_type_and_settings_json.sql

Migrations
- ALTER TABLE roulette_config ADD COLUMN game_type text NOT NULL DEFAULT 'scratch';
- ALTER TABLE design_settings ADD COLUMN settings_json jsonb DEFAULT '{}'::jsonb;

Fichiers modifiés (principaux)
- src/components/layout/{MainLayout,Header,Footer,Sidebar}.tsx
- src/components/home/{HeroSlider,CategoryGrid,TechwearHero,LoyaltyBanner,PromoBanner}.tsx
- src/components/product/{ProductImageGallery,RelatedProducts}.tsx
- src/components/products/ProductCard.tsx
- src/components/layout/FabStack.tsx              (utilise GameRouter)
- src/components/voice/VoiceCommandFab.tsx       (limite + erreurs)
- supabase/functions/voice-command/index.ts      (Zod + 404 propre)
- src/pages/admin/AdminRoulette.tsx              (sélecteur de jeu + aperçu)
- src/hooks/useRoulette.ts                       (game_type)
- src/hooks/useDesignSettings.ts                 (cache local + settings_json)
- src/hooks/useVisitorTracking.ts                (idle + retry borné)
- src/App.tsx                                    (lazy admin routes)
```

## Hors scope (à confirmer si besoin)
- Pas de changement de stack ni de nouvelle dépendance lourde.
- Pas de migration de données existantes : `game_type` par défaut `'scratch'` — bascule transparente.
- Le jeu "wheel" reste disponible si tu veux revenir à l'ancien design depuis l'admin.

---

Confirme et je passe en build pour tout dérouler en une fois.

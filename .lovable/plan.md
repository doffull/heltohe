# Système de Roulette Quotidienne 🎰

Mise en place d'un jeu de roue à tourner une fois par jour, avec gains (livraison gratuite, % de réduction, etc.), gestion complète depuis l'admin.

## Vue d'ensemble

```text
┌──────────────────────────┐         ┌──────────────────────────┐
│  HOMEPAGE (Accueil)      │         │  ADMIN DASHBOARD         │
│  ──────────────────────  │         │  ──────────────────────  │
│  • Bouton flottant 🎁    │         │  • /admin/roulette       │
│  • Modal roue animée     │         │  • CRUD segments (lots)  │
│  • 1 spin / jour / user  │         │  • Activer/désactiver    │
│  • Génère code promo     │         │  • Probabilités & limites│
│  • Email du code         │         │  • Historique des gains  │
└──────────────────────────┘         └──────────────────────────┘
```

## Backend (Lovable Cloud)

**Nouvelles tables :**

1. **`roulette_config`** (singleton, config_key='main')
   - `enabled` bool, `title`, `subtitle`, `button_label`
   - `cooldown_hours` int (défaut 24)
   - `require_auth` bool (sinon utilise email + cookie)
   - `wheel_colors` jsonb (palette couleurs roue)

2. **`roulette_segments`** (les lots)
   - `id`, `label` (ex "−10%"), `description`
   - `reward_type`: `'percentage' | 'fixed_amount' | 'free_shipping' | 'nothing'`
   - `reward_value` numeric, `min_purchase` numeric
   - `probability_weight` int (poids pour tirage pondéré)
   - `color` hex, `icon`, `sort_order`, `is_active`
   - `max_wins_per_day` int nullable (limite globale)
   - `code_prefix` text (ex "SPIN10")

3. **`roulette_spins`** (historique + anti-triche)
   - `id`, `user_id` nullable, `email` nullable, `ip_hash` text
   - `segment_id`, `promo_code_id` nullable
   - `created_at`

**Fonction RPC `spin_roulette(p_email)`** (SECURITY DEFINER) :
- Vérifie cooldown (24h) par user_id ou email/ip_hash
- Vérifie `max_wins_per_day` du segment
- Tirage pondéré côté serveur (anti-triche : le client ne décide pas)
- Crée un `promo_codes` à usage unique (`usage_limit=1`) lié au gain
- Insère dans `roulette_spins`
- Retourne `{ segmentId, label, code, expiresAt }`

**RLS :** segments/config lisibles par tous (actifs uniquement) ; admin gère tout ; spins en SELECT uniquement par admin ou l'utilisateur lui-même.

**Edge function `send-roulette-reward`** : envoie le code promo gagné par email via Resend.

## Frontend

**Composants nouveaux :**
- `src/components/home/RouletteWheel.tsx` — roue SVG animée (rotation CSS, easing, son optionnel)
- `src/components/home/RouletteFab.tsx` — bouton flottant homepage (bottom-right, pulse + badge "1 spin"), ouvre modal Dialog
- `src/hooks/useRoulette.ts` — `useRouletteConfig`, `useRouletteSegments`, `useSpinRoulette`, `useCanSpin` (cooldown localStorage + check serveur)

**Intégration :**
- Monté dans `src/views/HomeView.tsx` (uniquement homepage)
- Cache si `roulette_config.enabled=false` ou si user a déjà spinné aujourd'hui (ou affiche un compte à rebours "Reviens dans 18h")
- Animation : rotation 4-5s ease-out, s'arrête sur le segment gagné (calculé serveur), confettis sur gain
- Style cohérent Industrial Luxury (Helvetica-MP, noir/blanc/gris, angles 45°)
- Mobile-first (modal full-screen <768px)

**Admin :**
- Nouvelle page `src/pages/admin/AdminRoulette.tsx` ajoutée à `Admin.tsx` + sidebar admin
- 3 onglets :
  1. **Configuration** : activer/désactiver, textes, cooldown
  2. **Lots (segments)** : table CRUD avec drag-and-drop ordre, édition inline (label, type récompense, valeur, probabilité, couleur, actif)
  3. **Historique** : liste des spins (date, user/email, lot gagné, code utilisé ou non)
- Aperçu live de la roue à droite

## Sécurité
- Tirage **toujours côté serveur** (RPC) — le frontend ne fait qu'animer le résultat reçu
- Cooldown vérifié serveur (pas de bypass via localStorage)
- Codes promo générés à usage unique avec `expires_at` (ex 7 jours)
- Anonymes : limite par `ip_hash` + email
- Honeypot sur le formulaire email anonyme (cf mémoire spam protection)

## Fichiers créés/modifiés
- **DB** : migration (3 tables + RPC + RLS + seed 6 segments par défaut)
- **Edge function** : `send-roulette-reward/index.ts`
- **Hooks** : `useRoulette.ts`
- **Composants** : `RouletteWheel.tsx`, `RouletteFab.tsx`, `RouletteModal.tsx`
- **Pages** : `AdminRoulette.tsx`
- **Modifs** : `HomeView.tsx`, `Admin.tsx` (route + nav admin)

Une fois approuvé, je passe en mode build et j'implémente.

# Plan — Itération vocal, FABs & Newsletter

## 1. Mode test commande vocale (dry-run)

**Objectif** : avant d'exécuter une action (ajout panier, navigation), afficher la transcription + l'action reconnue + bouton "Confirmer / Annuler".

- `VoiceCommandFab.tsx` :
  - Ajouter un état `pendingAction` qui stocke `{ transcript, action, message }` après l'appel à `voice-command`.
  - **Ne plus exécuter automatiquement** l'action dans `handleCommand`. À la place, afficher dans la modale :
    - Transcription brute (« Vous avez dit »)
    - Action interprétée traduite en français lisible (ex : « Ajouter T-shirt Noir taille M au panier »)
    - Boutons **Confirmer** (exécute) / **Réessayer** (relance le micro) / **Annuler**.
  - Toggle « Mode test » (par défaut **activé**) dans la modale ; persisté en `localStorage` (`voice_test_mode`).
  - Si mode test désactivé → comportement actuel (auto-exécution + TTS).
- Helper `formatActionLabel(action, products)` pour rendre l'action humainement lisible.

## 2. Onboarding vocal visible à l'arrivée

**Objectif** : faire connaître la commande vocale dès l'entrée sur le site.

- Nouveau composant `VoiceOnboardingHint.tsx` :
  - Pulse + tooltip animé attaché au FAB micro pendant ~6s à la première visite (`localStorage: voice_hint_seen`).
  - Texte : « Nouveau — Commandez à la voix », flèche vers le micro.
  - Mobile-first (360px) ; positionné au-dessus du FAB.
- Rendu uniquement si `designSettings.voiceCommandEnabled` et utilisateur sur la home.
- Toggle admin `voiceOnboardingHint` (par défaut true) dans Marketing → Voix.

## 3. Refonte des FABs (intégration discrète mais visible)

**Objectif** : que Roulette + Voix + Chatbot s'intègrent visuellement au site (Industrial Luxury, noir/blanc, 45°) au lieu de flotter en pastilles colorées.

- Créer `src/components/layout/FabStack.tsx` :
  - Conteneur unique en bas-droite (`fixed bottom-4 right-4 z-40`) qui empile verticalement les FABs avec un design unifié :
    - Forme carrée 44×44 avec **coin coupé 45°** (clip-path), bordure 1px `border-foreground/20`, fond `background/80 backdrop-blur`.
    - Icône monochrome `text-foreground`, label uppercase tracking-wider en tooltip.
    - Variante "primary" (Voix) → fond inversé pour appel à l'action.
  - Slots: VoiceCommandFab, RouletteFab, ChatBotWidget toggle.
- Refactor `VoiceCommandFab`, `RouletteFab`, `ChatBotWidget` pour exposer un bouton trigger via prop ou render-prop, et déléguer le rendu du bouton au `FabStack`.
- Suppression des positions fixes individuelles (`bottom-36`, etc.) → orchestrées par `FabStack`.
- Mounted dans `MainLayout.tsx` (non-admin uniquement).

## 4. Admin Newsletter — section dédiée et visible

**Objectif** : la newsletter doit avoir sa propre place dans la sidebar admin et un dashboard avec stats de conversion.

- Nouvelle page `src/pages/admin/AdminNewsletter.tsx` :
  - **Onglet Vue d'ensemble** : KPIs (abonnés totaux, abonnés 7j, taux conversion popup, top popup, désinscriptions).
  - **Onglet Abonnés** : liste filtrable (réutilise `useNewsletters`) + export CSV + suppression.
  - **Onglet Pop-ups** : déplace `NewsletterPopupsManager` ici.
  - **Onglet Sidebar widget** : toggles `showSidebarNewsletter`, `sidebarNewsletterTitle`, `sidebarNewsletterCta` (déplacés depuis Marketing).
  - **Onglet Configuration** : email d'expédition, fréquence par défaut, RGPD checkbox text.
- Ajout entrée « Newsletter » dans la sidebar admin (`Admin.tsx` ou route registry) avec icône `Mail`.
- Retirer la duplication dans `AdminMarketing.tsx`.

## 5. Tracking conversions newsletter

**Objectif** : mesurer combien d'abonnements proviennent de chaque source.

- **Migration DB** :
  - Ajouter colonnes à `newsletters` :
    - `source text` (`sidebar`, `popup`, `roulette`, `footer`, `manual`)
    - `popup_id uuid` (nullable, ref `newsletter_popups`)
    - `referrer_path text` (URL de la page d'inscription)
  - Ajouter table `newsletter_popup_views` :
    - `popup_id uuid`, `viewed_at timestamptz`, `session_id text`, `converted boolean default false`
  - RLS : insert public (avec validation), select admin only.
- **`subscribeToNewsletter`** : étendre signature `(email, opts: { source, popupId?, referrerPath? })`.
- **`NewsletterPopupHost`** :
  - Insert `newsletter_popup_views` quand un popup s'affiche.
  - À la conversion, mise à jour `converted = true`.
- **`SidebarNewsletter`** : passe `source: 'sidebar'`.
- **Stats RPC** `get_newsletter_stats()` (security definer) renvoyant les agrégats utilisés par le dashboard.

## 6. Configuration roue — notifications & préférences

**Objectif** : compléter la config roulette demandée.

- Ajouter à `roulette_config` :
  - `notify_admin_on_win boolean default true`
  - `notify_admin_email text` (fallback `admin_config.admin_notification_email`)
  - `auto_open_on_landing boolean default true`
  - `auto_open_delay_ms integer default 1500`
  - `show_after_dismiss_hours integer default 24`
- Section **Notifications & Préférences** dans `AdminRoulette.tsx` (toggles + champs).
- `RouletteFab` lit `auto_open_*` et `show_after_dismiss_hours` depuis la config.
- Edge function `spin-roulette` envoie un email admin (Resend) si `notify_admin_on_win` et que le segment a une valeur ≥ seuil (réutilise `send-order-notification` pattern).

## 7. Détails techniques

**Fichiers à créer**
- `src/components/voice/VoiceOnboardingHint.tsx`
- `src/components/layout/FabStack.tsx`
- `src/pages/admin/AdminNewsletter.tsx`
- `src/components/admin/NewsletterStatsTab.tsx`
- `src/components/admin/NewsletterSubscribersTab.tsx`
- Migration : `add_newsletter_tracking_and_roulette_prefs.sql`

**Fichiers à modifier**
- `VoiceCommandFab.tsx`, `RouletteFab.tsx`, `ChatBotWidget.tsx` (extraction trigger)
- `MainLayout.tsx` (mount FabStack au lieu de FABs individuels)
- `AdminMarketing.tsx` (retirer onglets newsletter/popups)
- `AdminRoulette.tsx` (notifications & préférences)
- `useNewsletterPopups.ts` (signature subscribe + tracking views)
- `SidebarNewsletter.tsx`, `NewsletterPopupHost.tsx` (sources tracking)
- `useDesignSettings.ts`, `types/index.ts` (`voiceOnboardingHint`)
- `App.tsx` (route `/admin/newsletter`)
- `supabase/functions/spin-roulette/index.ts` (notification admin)

**Sécurité / Mémoire projet respectée**
- RLS strict sur `newsletter_popup_views` (insert public via validation, select admin).
- Honeypot + délai 10s conservés sur tous les forms.
- Pas de logique sensible côté client.

## Hors-scope volontaire
- Pas de A/B testing popups (peut venir en v2).
- Pas de templates email automatisés newsletter (envoi reste manuel via Resend).
- Pas de modification du paiement vocal (sécurité).

# Plan : Live Edit, Tracking temps réel & Achat vocal complet

## 1. FAB vocal visible pour admin (quick win)

`MainLayout.tsx` cache actuellement `<FabStack />` quand `isAdmin = true`. On retire cette restriction pour que tu voies/testes la commande vocale, la roulette et le chat comme un visiteur.

## 2. Tracking visiteurs temps réel

### Tables (migration)
- `visitor_sessions` : `id`, `session_id` (cookie), `user_id`, `started_at`, `last_seen_at`, `user_agent`, `ip_hash`, `country`, `device`, `referrer`, `landing_path`.
- `page_views` : `session_id`, `path`, `title`, `viewed_at`, `duration_ms`.
- `click_events` : `session_id`, `path`, `element_label`, `element_selector`, `x`, `y`, `clicked_at`.
- RLS : insert public (anon), select admin uniquement. Realtime activé sur les 3 tables.

### Frontend
- Hook `useVisitorTracking()` monté dans `MainLayout` (sauf admin) :
  - Crée/relance une session (sessionStorage), heartbeat toutes les 15s sur `last_seen_at`.
  - Envoie un `page_view` à chaque changement de route.
  - Listener global de clic → enregistre les clics significatifs (boutons, liens, ajout panier).

### Admin dashboard
- Nouvelle page `/admin/live` (`AdminLive.tsx`) :
  - **Visiteurs en ligne** (sessions `last_seen_at > now()-30s`) avec liste live (Realtime).
  - **Carte parcours** : clic sur un visiteur → timeline ordonnée de ses page_views + clics.
  - **Top pages temps réel**, **clics chauds** par page (compteur), **derniers événements**.

## 3. Édition visuelle live (drag & drop + inline)

L'éditeur visuel existant (`src/components/visual-editor/`) gère déjà l'inline texte/couleurs sur quelques zones. On l'étend.

### Inline partout
- Étendre `InlineEditable` aux zones manquantes du site (titres de sections, sous-titres, descriptions catégories, CTA, footer, headings page produit).
- Sauvegarde directe dans `design_settings` ou la table source (categories, products selon la cible) via `data-editable-source`.
- Édition d'image : clic sur une image éditable → ouvre `MediaPicker` existant et update la source.

### Drag & drop des sections homepage
- `home_sections` (jsonb dans `design_settings`) déjà présent → ajouter un mode "réorganisation" dans `VisualEditorPanel` :
  - Survol = handle drag visible sur chaque section homepage.
  - Réordonner avec `@dnd-kit/sortable` (déjà disponible probablement, sinon ajouter).
  - Toggle visibilité par section, save manuel (cohérent avec la règle Admin "no auto-save").

### Activation
- Un seul toggle global "Mode édition live" déjà existant (`VisualEditorToggle`) qui active inline + drag & drop simultanément.

## 4. Achat 100% vocal end-to-end

### Edge function `voice-command` enrichie
Ajouter ces actions au tool calling :
- `add_to_cart` (existe déjà, on garde mode test confirmation).
- `set_address` : extrait nom, adresse, ville, code postal, téléphone depuis la dictée.
- `set_delivery` : `home` ou `relay` + ville si relay.
- `apply_promo` : code promo dicté.
- `place_order` : déclenche `validate_and_create_order` après confirmation vocale explicite ("je confirme ma commande").
- `read_cart` / `read_total` : lecture vocale du récap (synthèse vocale via `speechSynthesis`).

### VoiceCommandFab
- Conserver le **mode test** (transcription + action affichée + bouton "Confirmer / Annuler") avant chaque action sensible (ajout panier, adresse, paiement).
- Ajouter une **machine à états vocale** : idle → écoute → action proposée → confirmation → exécution → feedback vocal (TTS).
- Dialogue multi-tours : la session conserve le contexte (panier en cours, adresse partielle) jusqu'à `place_order` ou reset.
- Indicateur visuel d'étape (panier → livraison → paiement → confirmé).
- Lecture audio des prix/réponses via `window.speechSynthesis` (FR).

### Sécurité
- `place_order` côté front appelle la RPC `validate_and_create_order` existante (re-validation prix serveur conservée).
- Paiement reste manuel (virement/chèque) → la voix prépare la commande, l'utilisateur confirme le mode de paiement à l'oral, l'admin valide ensuite (flux 3-étapes inchangé).

### Onboarding
- L'indice "Nouveau · commandez à la voix" est déjà en place ; ajouter un mini tutoriel 3 étapes au 1er clic ("Dis le produit → la couleur/taille → confirme").

## Fichiers impactés

**Création**
- `supabase/migrations/<ts>_visitor_tracking.sql`
- `src/hooks/useVisitorTracking.ts`
- `src/pages/admin/AdminLive.tsx`
- `src/components/admin/LiveVisitorsPanel.tsx`, `LiveJourneyTimeline.tsx`

**Modification**
- `src/components/layout/MainLayout.tsx` (FAB pour admin + mount tracking)
- `supabase/functions/voice-command/index.ts` (nouvelles actions + multi-tours)
- `src/components/voice/VoiceCommandFab.tsx` (machine à états, TTS, checkout vocal)
- `src/components/visual-editor/VisualEditorPanel.tsx` + nouveau `SectionsDndEditor.tsx`
- `src/components/visual-editor/InlineEditable.tsx` (extension cibles + image)
- `src/pages/admin/Admin.tsx` (entrée sidebar "Live")

## Notes techniques
- Realtime via `supabase.channel().on('postgres_changes')` sur `visitor_sessions`.
- Pas de PII brute : `ip_hash` (sha256 + sel côté edge function light) plutôt que IP claire.
- Heatmap reportée (option choisie : "Basique maison").
- Drag & drop : si `@dnd-kit` absent, l'ajouter.

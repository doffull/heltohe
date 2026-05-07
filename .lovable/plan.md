## Résumé

Quatre chantiers indépendants :
1. **Fixes badge mannequin** (flush save + invalidation par-id)
2. **Commande vocale IA** (parler → ajouter au panier → checkout)
3. **Newsletter** (widget sidebar discret + créateur de pop-ups admin)
4. **Roulette d'accueil automatique** (au 1er visite/jour si non jouée)

---

## 1. Fixes badge mannequin (rapide)

- `src/context/AppContext.tsx` : exposer `flushDesignSettings()` qui annule le timer debounce et appelle `saveDesignSettings.mutateAsync` immédiatement.
- `src/components/admin/TechwearHeroTab.tsx` : ajouter un bouton **« Enregistrer »** explicite qui appelle `flushDesignSettings()` puis `toast.success`.
- `src/hooks/useProducts.ts` : dans `useUpdateProduct.onSuccess`, invalider aussi `['products', id]` pour rafraîchir la fiche produit en cours.

---

## 2. Commande vocale IA

**Approche** : bouton micro flottant (FAB) → enregistrement → transcription + intention via Lovable AI (Gemini) → action panier/navigation.

- **Edge function** `supabase/functions/voice-command/index.ts` :
  - Reçoit `{ transcript: string, cartContext, products[] }`.
  - Appelle Gemini avec **tool calling** pour extraire intention structurée :
    - `add_to_cart({ productQuery, size?, color?, quantity })`
    - `remove_from_cart({ productQuery })`
    - `navigate({ destination: 'cart'|'checkout'|'shop'|'product', productQuery? })`
    - `search({ query })`
    - `clarify({ message })`
  - Retourne JSON avec action + message vocal de confirmation.
- **Composant** `src/components/voice/VoiceCommandFab.tsx` :
  - Bouton micro fixe en bas-droite (mobile-first 360 px).
  - Web Speech API (`SpeechRecognition` `lang='fr-FR'`) pour STT navigateur (gratuit).
  - Fallback : enregistrement audio + envoi à Gemini si non supporté.
  - Affichage modal du transcript + réponse IA.
  - `SpeechSynthesisUtterance` pour réponse vocale.
- **Hook** `src/hooks/useVoiceCommand.ts` : exécute l'action retournée (navigateToProduct, addItem du CartContext, navigate `/panier`/`/checkout`).
- **Admin toggle** : ajout `voiceCommandEnabled` dans `design_settings` pour activer/désactiver globalement.

---

## 3. Newsletter (sidebar + pop-ups)

### a) Backend
- Migration : table `newsletter_popups` (`name`, `title`, `subtitle`, `cta_label`, `image_url`, `display_trigger` enum `on_load|exit_intent|scroll_50|delay`, `delay_seconds`, `frequency_days`, `is_active`, `targeting` jsonb).
- Réutiliser table `newsletters` existante (déjà présente via `useNewsletters`) pour stocker les emails.
- RLS : lecture publique des `newsletter_popups` actifs ; insertion publique dans `newsletters` (déjà en place).

### b) Sidebar widget
- `src/components/layout/SidebarNewsletter.tsx` : champ email + CTA discret, intégré au bas de `Sidebar.tsx`.
- Contrôlé par `designSettings.showSidebarNewsletter` (boolean) + `sidebarNewsletterTitle/CtaLabel`.
- Anti-spam : honeypot + délai 10s (cohérent avec règles projet).

### c) Pop-up frontend
- `src/components/home/NewsletterPopup.tsx` : Dialog shadcn déclenché selon `display_trigger`.
- LocalStorage `nl_popup_seen_<id>` pour respecter `frequency_days`.
- Honeypot + délai 10s.

### d) Admin
- Nouvel onglet dans `AdminMarketing.tsx` : **« Pop-ups Newsletter »** (CRUD).
- Liste + formulaire : titre, sous-titre, image, déclencheur, délai, fréquence, actif.
- Aperçu live du pop-up.

---

## 4. Roulette d'accueil automatique

- `src/components/home/RouletteFab.tsx` existe déjà → ajouter logique d'**ouverture auto au 1er chargement** :
  - Vérifier `localStorage.getItem('roulette_last_spin')` (date ISO).
  - Si absent OU plus vieux qu'aujourd'hui (cooldown défini dans `roulette_config`) → ouvrir le modal après 1.5s sur la home.
  - Stocker `roulette_last_spin` lors du `spin_roulette` réussi.
- Côté DB : déjà géré (cooldown server-side), mais on évite l'ouverture inutile de la modale.
- Toggle admin : `designSettings.rouletteAutoOpen` (boolean) dans `AdminRoulette`.

---

## Détails techniques

| Fichier | Action |
|---|---|
| `src/context/AppContext.tsx` | + `flushDesignSettings`, expose dans context |
| `src/components/admin/TechwearHeroTab.tsx` | + bouton « Enregistrer » avec toast |
| `src/hooks/useProducts.ts` | invalidation `['products', id]` |
| `supabase/functions/voice-command/index.ts` | nouveau (Gemini tool calling) |
| `src/components/voice/VoiceCommandFab.tsx` | nouveau |
| `src/hooks/useVoiceCommand.ts` | nouveau |
| `src/App.tsx` | monter `<VoiceCommandFab />` dans MainLayout |
| migration SQL | table `newsletter_popups` + RLS |
| `src/hooks/useNewsletterPopups.ts` | nouveau (CRUD) |
| `src/components/layout/SidebarNewsletter.tsx` | nouveau |
| `src/components/layout/Sidebar.tsx` | intégrer widget |
| `src/components/home/NewsletterPopup.tsx` | nouveau |
| `src/pages/admin/AdminMarketing.tsx` | + onglet pop-ups |
| `src/components/home/RouletteFab.tsx` | logique auto-open |
| `src/pages/admin/AdminRoulette.tsx` | toggle auto-open |
| `src/types/index.ts` | + champs design_settings |
| `src/hooks/useDesignSettings.ts` | mapping nouveaux champs |
| migration SQL | colonnes `voice_command_enabled`, `roulette_auto_open`, `show_sidebar_newsletter`, `sidebar_newsletter_*` sur `design_settings` |

## Ce qui n'est pas inclus
- Paiement vocal (sécurité) : la commande vocale s'arrête au checkout, l'utilisateur valide manuellement le paiement.
- Pas de TTS premium (utilisation `SpeechSynthesis` natif navigateur).

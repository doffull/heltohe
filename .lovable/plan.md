# Plan — Éditeur live, Voice Shopping & FAB unifié

## 1. Éditeur visuel — Drag & Drop sections + Inline généralisé

**a) Drag & Drop sections homepage**
- Ajouter `home_sections` (jsonb ordonné) dans `design_settings` :
  ```
  [{ id, type: "hero" | "techwear" | "categories" | "products" | "looks" | "newsletter" | "flash" | "loyalty", visible, props }]
  ```
- Refactor `Index.tsx` pour boucler sur `home_sections` au lieu d'un ordre figé
- Nouveau panneau `HomeSectionsEditor.tsx` (admin → Design) avec `@dnd-kit/sortable` :
  - Réordonnancement par drag
  - Toggle visibilité
  - Bouton "Ajouter une section" (catalogue de blocs)
  - Sauvegarde explicite (cohérent avec règle "no auto-save")
- En mode édition live (super admin), poignées de drag visibles directement sur la home

**b) Inline editing généralisé**
- Étendre `InlineEditable` à : titres de sections, sous-titres, CTA labels, footer, page produit (nom court, descriptions catégories), badges
- Convention : `data-editable-source="design_settings.{path}"` ou `products.{id}.{field}`
- Ajouter wrapper `<EditableImage>` (utilise `MediaPicker` existant) pour toutes les images de la home
- Indicateur visuel discret (contour pointillé au hover) en mode édition

## 2. Achat vocal connecté au catalogue réel

**a) Recherche sémantique produit**
- Nouvelle action vocale `search_products` dans `voice-command/index.ts` :
  - Parse : couleur, type, taille, mot-clé via Gemini 2.5 Flash
  - Query `products` (filtres : `is_active=true`, ILIKE name/description, color/size match)
  - Si <3 résultats : élargir + recommandations (même catégorie / look associé)
- Réponse structurée : `{ products: [...], spoken: "J'ai trouvé 4 doudous noirs..." }`

**b) Affichage des résultats vocaux**
- Nouveau composant `VoiceResultsSheet.tsx` (Sheet bottom mobile / side desktop) :
  - Liste produits avec image + prix + bouton "Ajouter" vocal-friendly
  - "Dis : ajoute le numéro 2 en taille M"
- Action `select_product_by_index` + `add_to_cart` enrichie (taille/couleur reconnues)

**c) Recommandations**
- Action `recommend` : si user dit "propose-moi", appelle Gemini avec catalogue résumé + historique session
- Retourne 3 produits + raison parlée

**d) Mise à jour `VoiceCommandFab.tsx`**
- Ajouter étape "Recherche" dans le stepper
- Persistance résultats dans state pour follow-up ("le 2ème", "le rouge")

## 3. FAB unifié — un seul socle flottant

**Règle :** notifications restent séparées (en haut). Tout le reste regroupé en bas-droite.

**Nouveau composant `UnifiedFab.tsx` :**
- Bouton principal flottant (cercle 56px, glassmorphism, halo animé, design futuriste cohérent Industrial Luxury)
- Au clic : déploiement radial/vertical de 3 sous-FAB :
  - 🎤 Commande vocale
  - 💬 Chatbot IA
  - 🎰 Jeux concours (roulette)
- Animation ouverture (spring), labels au hover
- Position par défaut : bottom-right, draggable en mode admin

**Suppression de `FabStack` actuel** → remplacé par `UnifiedFab` dans `MainLayout`

**Admin — `AdminHomeIcons.tsx` étendu :**
- Liste des 3 icônes du FAB unifié + bouton notifications
- Pour chaque : icône (IconPicker), label, visible on/off, ordre
- Position du socle : sliders `bottom`, `right` (séparés mobile/desktop) — preview live
- Couleur d'accent du halo, taille
- Sauvegarde dans `design_settings.unified_fab` (jsonb)
- Drag & drop direct sur preview homepage (mode édition) pour repositionner

## 4. Validation du tracking visiteurs

- Vérifier `useVisitorTracking` : insert session OK, page_views au changement de route, click_events sur éléments significatifs (`[data-track]`, boutons, liens produits)
- Tester `/admin/live` : visiteurs en ligne (heartbeat 15s), top pages temps réel (Realtime), timeline par session
- Ajouter compteur "X visiteurs en ligne" dans header admin
- Fix éventuel : exclure les sessions admin du tracking (déjà conditionné, à re-vérifier)

## Détails techniques

### Migrations
- `design_settings` : ajout colonnes `home_sections jsonb`, `unified_fab jsonb` (avec defaults sains)
- Trigger `sanitize_unified_fab` similaire à `sanitize_techwear_hero`

### Fichiers créés
- `src/components/admin/HomeSectionsEditor.tsx`
- `src/components/layout/UnifiedFab.tsx`
- `src/components/voice/VoiceResultsSheet.tsx`
- `src/hooks/useUnifiedFab.ts`
- `src/hooks/useHomeSections.ts`

### Fichiers modifiés
- `src/pages/Index.tsx` (rendu basé sur `home_sections`)
- `src/components/layout/MainLayout.tsx` (FabStack → UnifiedFab)
- `src/components/voice/VoiceCommandFab.tsx` (search + results)
- `supabase/functions/voice-command/index.ts` (search/recommend)
- `src/pages/admin/AdminHomeIcons.tsx` (config FAB unifié)
- `src/components/admin/InlineEditable.tsx` (extension)

### Diagramme FAB
```text
                    [Notifications] (haut)

                                      ┌─────┐
                                      │  🎤 │
                                      ├─────┤
                                      │  💬 │
                                      ├─────┤
                                      │  🎰 │
                                      └──┬──┘
                                         │
                                      ┌─────┐
                                      │  ✦  │  ← socle unifié
                                      └─────┘
```

## Ordre d'exécution
1. Migration `home_sections` + `unified_fab`
2. `UnifiedFab` + intégration MainLayout (quick win visuel)
3. Voice search/recommend + `VoiceResultsSheet`
4. `HomeSectionsEditor` + refactor `Index.tsx`
5. Inline généralisé
6. Admin config FAB + drag position
7. QA tracking

# Plan — Taille mannequin, Guide IA, Hero Techwear

## 1. Taille du mannequin sur les produits

**Schéma DB** (migration) — ajouter colonnes à `products`:
- `model_height` (text, ex "1m80")
- `model_size_worn` (text, ex "M")
- `model_name` (text, optionnel)

**Admin (`ProductForm.tsx`)** — nouvelle section pliable « Mannequin » avec 3 champs (taille, taille portée, nom).

**Front fiche produit**:
- **Badge sur l'image** (`ProductImageGallery.tsx`) : pastille discrète bas-gauche `« 📏 1m80 · taille M »` masquable.
- **Ligne sous la galerie** (`ProductInfo.tsx`) : ligne dédiée « Le mannequin mesure 1m80 et porte une taille M ».

## 2. Guide des tailles IA (Homme / Femme / Enfant)

**Page dédiée** `/guide-des-tailles` (nouveau `src/pages/SizeGuide.tsx` + route).
- Sélecteur catégorie (Homme/Femme/Enfant)
- Formulaire: taille (cm), poids (kg), tour poitrine/taille/hanches, morphologie
- Bouton « Trouver ma taille » → appel edge function `recommend-size`
- Résultat: taille recommandée + grille de produits compatibles + explications IA

**Modal réutilisable** `SizeGuideAIModal.tsx` (refonte de `SizeGuideModal.tsx`):
- Bouton « 🤖 Trouver ma taille » sur chaque fiche produit
- Pré-rempli avec catégorie/sizes du produit courant
- Lien « Guide complet » → page dédiée

**Edge Function** `supabase/functions/recommend-size/index.ts`:
- Reçoit: catégorie, mensurations, produit (optionnel)
- Appelle Lovable AI (`google/gemini-3-flash-preview`) avec tool calling structuré
- Retourne: `{ recommendedSize, confidence, alternativeSize, advice }`
- Côté serveur: matche avec produits actifs ayant cette taille

**Tables de référence taille** (JSON statique dans `src/lib/sizeCharts.ts`) — barème Homme/Femme/Enfant standard EU.

## 3. Bug Hero Techwear : changements non visibles après refresh

**Cause identifiée**: dans `useDesignSettings.ts`, le `dbToSettings` lit `techwear_hero` directement, mais après save :
- Le mutation `useSaveDesignSettings` `invalidateQueries` mais `useDesignSettings` a `staleTime: 0`
- `AppContext` ne re-synchronise PAS depuis le DB après le premier load (`initializedRef` bloque)
- → Sur la home, la version locale `INITIAL_DESIGN_SETTINGS` est utilisée si l'admin a save dans un autre onglet/refresh

**Fix**:
1. Dans `AppContext.tsx`: re-synchroniser `dbSettings → setDesignSettingsLocal` à chaque update DB **sauf** si une édition locale est en cours (flag `dirty` 5s ou `isPending` du mutation).
2. Dans `useSaveDesignSettings.ts`: `await refetch` après save pour s'assurer que le cache est frais avant de naviguer.
3. Dans `TechwearHero.tsx` (`useResolvedConfig`): retirer le `useMemo` figé sur `cfgRaw` — recalculer à chaque render quand `designSettings.techwearHero` change (vérifier la dépendance).
4. **Persister immédiatement** au lieu de debounce 800ms quand on modifie `techwearHero` (le débounce cause perte si refresh rapide). Ajouter méthode `flushDesignSettings()` exposée dans le contexte, appelée par le bouton « Enregistrer » de l'éditeur Techwear.

## 4. Hero Techwear mobile

`TechwearHero.tsx` + `home-techwear.css`:
- Carte mobile passe en pleine largeur (`100vw - 16px`), retirer transformations qui débordent
- Image: `object-fit: cover` + ratio fixe `4/5` mobile
- Stats / couleurs / tailles : grille 2 colonnes mobile, scroll horizontal pour swatches
- CTA: stack vertical, bouton pleine largeur
- Badge MODEL: top-right, plus petit (`text-[10px]`)
- Tester à 360px

## 5. Réorganisation admin Hero Techwear

`TechwearHeroTab.tsx` — refonte avec accordéons pliables (composant `Accordion` shadcn déjà dispo). 6 groupes:

```text
▼ 1. Slides            (liste, ajouter, dupliquer, ordre)
▶ 2. Identité          (nom, badge MODEL, CTA primaire/secondaire)
▶ 3. Produit lié       (sélecteur, bouton sync)
▶ 4. Médias & Couleurs (galerie d'images regroupée, par couleur, mobile/tablet/desktop)
▶ 5. Tailles & Stats   (visibleSizes, defaultSize, stats array)
▶ 6. Style & Background (imageFit, position, background type, switches d'affichage)
```

- Chaque accordéon avec chevron à droite (ouvert/fermé)
- Une seule ouverte à la fois par défaut (mode `single`)
- Section « Médias & Couleurs » : nouveau composant `ColorMediaGallery` qui regroupe toutes les images d'une slide dans une grille avec onglets « Desktop / Tablette / Mobile »
- Bouton « Enregistrer » sticky bas qui appelle `flushDesignSettings()` immédiatement (plus de débounce sur cet onglet)
- Réglages slider (autoplay/intervalle/flèches/dots) restent en haut, hors accordéon

## Détails techniques

**Migration SQL**:
```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS model_height text,
  ADD COLUMN IF NOT EXISTS model_size_worn text,
  ADD COLUMN IF NOT EXISTS model_name text;
```

**Types** : étendre `Product` dans `src/types/index.ts` + `dbToAppProduct`/`appToDbProduct` dans `useProducts.ts`.

**Edge function `recommend-size`**:
- `verify_jwt = false` (utilisable anonyme)
- Tool calling: `{ size: string, confidence: 0-100, alternative?: string, advice: string }`
- Prompt système intègre la table de tailles EU + mensurations utilisateur

**Routes**: ajouter `/guide-des-tailles` dans `App.tsx`. Lien dans header (menu) + footer.

## Fichiers touchés

- **Nouveau**: `src/pages/SizeGuide.tsx`, `src/components/product/SizeGuideAIModal.tsx`, `src/lib/sizeCharts.ts`, `src/components/admin/ColorMediaGallery.tsx`, `supabase/functions/recommend-size/index.ts`
- **Migration**: ajout colonnes `products` + config edge function
- **Édités**: `ProductForm.tsx`, `ProductImageGallery.tsx`, `ProductInfo.tsx`, `useProducts.ts`, `types/index.ts`, `TechwearHeroTab.tsx`, `TechwearHero.tsx`, `home-techwear.css`, `useDesignSettings.ts`, `AppContext.tsx`, `App.tsx`, `Header.tsx`, `Footer.tsx`
- **Supprimé**: ancien `SizeGuideModal.tsx` (remplacé)

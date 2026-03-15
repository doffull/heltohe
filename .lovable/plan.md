
## Diagnostic

**Cause 1 (Erreur 400 save)** : La colonne `sidebar_brand_position` est envoyée dans l'upsert `design_settings` mais elle n'existe pas dans la table. Le code `settingsToDb()` dans `useDesignSettings.ts` inclut `sidebar_brand_position: (s as any).sidebarBrandPosition ?? 'top'` mais aucune migration n'a été créée pour ajouter cette colonne.

**Cause 2 (Warning React console)** : `BrandBlockPreview` est défini comme une fonction component INSIDE du corps de `SidebarLivePreview()`. React essaie de lui passer une ref (car utilisé comme JSX) → warning "Function components cannot be given refs". Ce n'est pas bloquant mais produit du bruit.

## Corrections

### Fix 1 — Migration SQL
Ajouter la colonne manquante :
```sql
ALTER TABLE public.design_settings 
ADD COLUMN IF NOT EXISTS sidebar_brand_position TEXT DEFAULT 'top';
```

### Fix 2 — React warning (BrandBlockPreview)
Dans `AdminDesign.tsx`, `BrandBlockPreview` est déclaré à l'intérieur du render de `SidebarLivePreview`. Le déplacer hors du composant (ou le convertir en variable JSX `const brandBlock = hasBrand ? <div>...</div> : null`) pour éliminer le warning.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/` | ADD COLUMN `sidebar_brand_position TEXT DEFAULT 'top'` |
| `src/pages/admin/AdminDesign.tsx` | Convertir `BrandBlockPreview` en variable JSX inline (pas de composant imbriqué) |

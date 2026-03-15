
## Diagnostic précis

### Erreur DB confirmée
```
duplicate key value violates unique constraint "categories_slug_unique"
```
Il y a une **contrainte unique** sur `categories.slug` (index `categories_slug_unique` — partiel sur les slugs non null). L'erreur se produit à **deux niveaux** :

1. **Le trigger `generate_category_slug`** s'exécute en BEFORE INSERT et génère un slug automatiquement.
2. **Le frontend** génère aussi un slug dans `CategoryFormDialog` via l'auto-slug et l'envoie déjà rempli.
3. **Le trigger `auto_create_category_page`** fait un `INSERT INTO pages` avec ce même slug — mais si une page avec ce slug existe déjà (ex: suite à une création partielle précédente), ça peut aussi faire échouer la transaction entière.

**Scénario d'échec** : L'utilisateur tente de créer une catégorie avec un slug déjà existant en DB (ex: retenter après une erreur partielle, ou deux catégories avec des noms similaires).

### RLS Policy issue secondaire
La policy `Admins can manage categories` a `with_check = NULL`. Pour les INSERTs dans PostgreSQL via Supabase, une policy `ALL` sans `WITH CHECK` explicite peut utiliser le `USING` comme `WITH CHECK`, ce qui dans ce cas (`has_role(auth.uid(), 'admin')`) devrait fonctionner. C'est moins critique mais doit être corrigé.

## Plan de corrections

### Fix 1 — Rendre le slug unique côté frontend (avant envoi)
Dans `useCategories.ts` (hook `useCreateCategory`), **si le slug est déjà pris, ajouter un suffixe numérique**. Mais le vrai fix est dans `CategoryFormDialog` : si le slug auto-généré existe déjà parmi les catégories, on appende `-2`, `-3`, etc.

### Fix 2 — Gérer le conflit de slug côté DB (ON CONFLICT DO NOTHING → RENAME)
Le trigger `auto_create_category_page` fait déjà `ON CONFLICT (slug) DO NOTHING` pour les pages → ok.

Mais l'index `categories_slug_unique` lui-même bloque si le slug est dupliqué. **Solution propre** : dans `useCreateCategory`, si l'erreur est `23505` (unique violation), on retente avec un slug suffixé.

### Fix 3 — Correction RLS `WITH CHECK`
Recréer la policy `Admins can manage categories` avec un `WITH CHECK` explicite :
```sql
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/` | Recréer RLS policy avec `WITH CHECK` explicite |
| `src/hooks/useCategories.ts` | Dans `useCreateCategory`, gérer l'erreur de slug dupliqué avec retry |
| `src/components/admin/CategoryFormDialog.tsx` | Recevoir la liste des slugs existants + afficher un avertissement si le slug est déjà pris |
| `src/pages/admin/AdminDesign.tsx` | Passer `dbCategories` au dialog pour la validation de slug |

## Comportement après fix

- Créer "Homme 2" → slug `homme-2` généré automatiquement sans erreur même si `homme` existe
- Retenter une catégorie qui avait échoué → suffixe `-2` ajouté automatiquement
- La RLS policy bloque correctement les non-admins en INSERT aussi

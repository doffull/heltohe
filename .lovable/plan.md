
## 3 features à implémenter

---

### 1. Bouton "Dupliquer" dans l'admin produit

**Où** : `AdminProducts.tsx` — dans le `DropdownMenu` de chaque ligne produit, ajouter `<DropdownMenuItem>Dupliquer</DropdownMenuItem>` avec l'icône `Copy`.

**Logique** :
```typescript
const handleDuplicate = async (product: Product) => {
  await createProduct.mutateAsync({
    ...product (sans id),
    name: `${product.name} V2`,
    sku: `${product.sku}-COPY`,
    // Copie complète : colorOptions, sizes, colors, image, etc.
  });
  toast({ title: `"${product.name} V2" créé` });
};
```

Résultat : VANCOUVER → VANCOUVER V2 avec toutes ses variantes couleur, images, tailles, etc.

---

### 2. Synchronisation galerie → couleur sélectionnée depuis la carte

**Mécanisme** : quand on navigue depuis une carte produit (`ProductCard`) avec une couleur active (`selectedColorIndex`), passer la couleur dans l'URL : `/boutique/${product.id}?color=%231C1C1E`.

**Changements** :

**`ProductCard.tsx`** — modifier le `onClick` pour inclure la couleur sélectionnée dans la navigation :
```typescript
// Au lieu de onClick={() => navigate(`/boutique/${product.id}`)}
// Dans Shop.tsx, passer onProductClick avec la couleur sélectionnée
```

Mais `ProductCard` ne connaît pas `navigate`. La solution propre : exposer un `onColorClick` prop ou passer la couleur via l'`onClick` callback.

**Architecture choisie** : exposer `getDetailUrl` comme prop dans `ProductCard`, ou plus simple — dans `Shop.tsx` et `ProductSections.tsx`, remplacer le `onClick` par :
```typescript
onClick={() => {
  const activeColor = ...; // on ne peut pas accéder au state interne de ProductCard
}}
```

→ Problème : `selectedColorIndex` est un state **interne** à `ProductCard`. Deux options :
1. **Lifter le state** vers le parent (Shop/ProductSections) — lourd
2. **Callback `onNavigate(productId, selectedColor)`** — propre

**Solution retenue** : Ajouter prop `onNavigate?: (productId: string, selectedColor: string | null) => void` dans `ProductCard`. Quand l'user clique sur l'image, appeler `onNavigate(product.id, activeColorOpt?.color ?? null)` au lieu de `onClick`.

Dans `Shop.tsx` et `ProductSections.tsx` :
```typescript
onNavigate={(id, color) => navigate(`/boutique/${id}${color ? `?color=${encodeURIComponent(color)}` : ''}`)}
```

**`ProductDetail.tsx`** — lire `?color=` depuis `useSearchParams` :
```typescript
const [searchParams] = useSearchParams(); // déjà importé
const colorFromUrl = searchParams.get('color');

// Dans l'initialisation du state :
const [selectedColor, setSelectedColor] = useState<string | null>(colorFromUrl);
```

La galerie s'initialise sur la bonne variante automatiquement.

---

### 3. Modification en masse des produits

**Comportement attendu** : quand ≥1 produit est sélectionné, afficher un panel "Actions en masse" avec :
- **Changer la catégorie** pour tous les sélectionnés
- **Changer le prix** (définir ou appliquer % de réduction)
- **Changer le stock**
- **Activer/désactiver** (toggle `is_active`)
- **Supprimer** (déjà présent)

**UI** : Remplacer la barre de bulk actuelle (qui n'a que "Supprimer") par un panel élargi avec un `Select` de catégorie, des inputs de prix/stock, et des boutons d'action.

**Nouveau hook** : `useBulkUpdateProducts` dans `useProducts.ts` :
```typescript
export function useBulkUpdateProducts() {
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<ReturnType<typeof appToDbProduct>> }) => {
      const { error } = await supabase.from('products').update(updates).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
```

**Dans `AdminProducts.tsx`** — remplacer le div `someSelected &&` existant par un composant `BulkActionsBar` inline avec :
```
[N sélectionnés]  [Catégorie: Select]  [Prix: Input €]  [Stock: Input]  [Appliquer]  [Supprimer]  [✕]
```

---

### Fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminProducts.tsx` | Bouton "Dupliquer" + BulkActionsBar élargi |
| `src/hooks/useProducts.ts` | Ajouter `useBulkUpdateProducts` |
| `src/components/products/ProductCard.tsx` | Prop `onNavigate(id, color)` |
| `src/pages/Shop.tsx` | Utiliser `onNavigate` |
| `src/components/home/ProductSections.tsx` | Utiliser `onNavigate` |
| `src/pages/ProductDetail.tsx` | `useState` initialisé avec `?color=` param |

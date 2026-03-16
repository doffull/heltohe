
## Plan : Impression en masse + Suppression en masse — Colissimo

### Contexte

Le composant `CommandesTab` dans `AdminColissimo.tsx` (1377 lignes) possède déjà :
- Un select d'actions groupées (`bulkAction`) avec `generate`, `ship`, `delete` (supprime uniquement les numéros de suivi)
- Une fonction `generateLabel` qui génère 1 étiquette et met le PDF en cache dans `pdfCache`
- `downloadPdf` et `printPdf` pour agir sur un PDF base64

### Ce qui manque

**1. Impression en masse** : Générer les étiquettes de toutes les commandes sélectionnées → combiner tous les PDFs en une seule fenêtre d'impression. Technique : créer une page HTML avec des `<iframe>` ou des `<img>` encodés en data:URI pour chaque PDF, et déclencher `window.print()`. Comme les PDFs Colissimo sont au format 10×15, on les affichera dans un iframe combiné.

**2. Suppression en masse des commandes** : Supprimer définitivement les commandes sélectionnées de la table `orders` (RLS DELETE admin OK). Nécessite une dialog de confirmation avec le compte des commandes à supprimer.

### Modifications dans `AdminColissimo.tsx`

**A. Nouveau state**
- `deleteConfirmOpen: boolean` — dialog confirmation suppression en masse
- `bulkPrintLoading: boolean` — état chargement pour l'impression groupée

**B. Nouvelle function `handleBulkPrint()`**
```
Pour chaque commande sélectionnée:
  1. Si PDF déjà en cache → l'utiliser
  2. Sinon → appeler generateLabel() et récupérer le PDF
Combiner tous les PDFs en une page HTML multi-pages et appeler window.print()
```
Technique : ouvrir une fenêtre popup avec un `<iframe>` par PDF (ou une page contenant chaque PDF base64 dans un `<embed>` avec `page-break-after`).

**C. Nouvelle function `handleBulkDelete()`**
```
await supabase.from('orders').delete().in('id', Array.from(selected))
Vider la sélection
Invalider le cache React Query
Toast de confirmation
```

**D. Modifier le Select d'actions groupées**
Ajouter 2 nouvelles options :
- `print_bulk` → "Imprimer les étiquettes en masse"
- `delete_orders` → "Supprimer les commandes"

**E. `applyBulkAction` — gérer les 2 nouveaux cas**
- `print_bulk` : appeler `handleBulkPrint()`
- `delete_orders` : ouvrir `deleteConfirmOpen` (pas d'action directe)

**F. Dialog de confirmation suppression**
```
"Supprimer {N} commande(s) ?"
"Cette action est irréversible. Les commandes seront définitivement supprimées."
[Annuler] [Supprimer définitivement]
```

### Impression groupée — technique retenue

Générer un blob HTML contenant :
```html
<html><body style="margin:0">
  <embed src="data:application/pdf;base64,{PDF1}" width="100%" height="100%" style="page-break-after:always" />
  <embed src="data:application/pdf;base64,{PDF2}" width="100%" height="100%" />
</body></html>
```
Ouvrir dans `window.open()` puis déclencher `window.print()`.

Pour les commandes sans PDF en cache, le système va d'abord générer l'étiquette via l'API Colissimo (séquentiellement), puis imprimer tout en une fois. Un loader s'affiche pendant la génération.

### Seul fichier modifié

| Fichier | Changements |
|---|---|
| `src/pages/admin/AdminColissimo.tsx` | + 2 nouvelles actions groupées, + dialog confirmation delete, + fonction `handleBulkPrint`, + fonction `handleBulkDelete` |

Pas de migration DB nécessaire — la RLS DELETE admin est déjà en place sur la table `orders`.

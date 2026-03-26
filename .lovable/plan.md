

## Plan : Compacter l'inventaire global + Vérifier l'espace Colissimo

### Problème 1 : Inventaire Global — colonnes boutiques trop nombreuses

Actuellement, chaque boutique physique (Cap 3000, Caréssenat, etc.) est une colonne séparée dans le tableau d'inventaire (lignes 778-785 de `AdminStock.tsx`). Avec beaucoup de boutiques, le tableau déborde horizontalement.

**Solution** : Remplacer les colonnes individuelles par boutique par un système compact :

1. **Ajouter un filtre de localisation** : un `Select` multi-valeur permettant de choisir quelles boutiques afficher comme colonnes. Par défaut, seule la colonne "Web" + une colonne "Boutiques" (agrégée) sont visibles.

2. **Colonne agrégée "Boutiques"** : affiche le total stock de toutes les boutiques pour chaque produit. Au clic, un popover/tooltip détaille le stock par boutique.

3. **Filtre boutique** : un `Select` permet de sélectionner 1 ou plusieurs boutiques spécifiques à afficher comme colonnes supplémentaires. Les boutiques non sélectionnées restent dans le total agrégé.

Résultat : le tableau tient en une page avec les colonnes `Image | Produit | SKU | Canal | Web | Boutiques (total) | Total | Seuil | Statut | Actions`. Si l'admin veut le détail d'une boutique spécifique, il la sélectionne dans le filtre.

Même traitement pour les lignes de variantes (enfants).

### Problème 2 : Colissimo — vérification et corrections

**A. Historique des bordereaux — accès détail + téléchargement**
- Actuellement : on voit la date, le nombre de colis, 3 numéros de suivi max, et un bouton PDF (seulement si `pdf_base64` existe, ce qui n'est jamais le cas car l'API Colissimo ne renvoie pas de PDF pour les bordereaux).
- **Correction** : Ajouter un dialog "Détail du bordereau" au clic sur une ligne, affichant tous les numéros de suivi avec liens de suivi La Poste. Ajouter un bouton "Télécharger (TXT)" qui génère un fichier texte du bordereau même sans PDF.

**B. Commandes — clic sur une commande**
- Actuellement : les commandes dans l'onglet Colissimo n'ont pas de lien vers la fiche commande dans Admin > Commandes.
- **Correction** : Rendre le numéro de commande cliquable (lien vers `/admin` onglet commandes avec filtre, ou ouvrir un dialog résumé de la commande).

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/admin/AdminStock.tsx` | Remplacer colonnes boutiques individuelles par colonne agrégée + filtre + popover détail |
| `src/pages/admin/AdminColissimo.tsx` | Ajouter dialog détail bordereau + bouton téléchargement TXT + lien commande cliquable |


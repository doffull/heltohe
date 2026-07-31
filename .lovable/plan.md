## Objectif

Dans l'admin Produits, ajouter une action « Éclater par couleur » : à partir d'un produit à 4 couleurs, créer 4 produits indépendants dans la boutique (un par couleur), chacun avec son nom, son SKU, son image et son stock.

## Ce que ça donne dans l'interface

Nouvelle entrée dans le menu « … » de chaque produit (et en action groupée sur la sélection) : **Éclater par couleur**. Elle ouvre une fenêtre d'aperçu avant validation :

```text
Éclater « Doudoune Alpine » en 4 produits
┌───────────────────────────────────────────────────────────┐
│ ☑ Noir     Nom: Doudoune Alpine - Noir     SKU: ALP-NOIR  │
│ ☑ Beige    Nom: Doudoune Alpine - Beige    SKU: ALP-BEIGE │
│ ☑ Rouge    …                                              │
│ ☑ Bleu     …                                              │
└───────────────────────────────────────────────────────────┘
Nom / SKU éditables ligne par ligne
Image principale = image de la couleur (sinon image du produit)
Galerie = images de la variante + galerie d'origine (option)
Tailles = tailles du produit d'origine (conservées)
Stock = stock de la couleur (grille taille×couleur si présente)

Produit d'origine : ( ) conserver actif  (•) désactiver  ( ) supprimer
[ Annuler ]                                    [ Créer 4 produits ]
```

Règles par défaut :
- Nom : `Nom d'origine - Libellé couleur`
- SKU : `SKU-COULEUR` (slug majuscule), avec suffixe `-2` en cas de doublon détecté en base
- Chaque produit enfant garde une seule couleur (sa propre `colorOptions`), donc plus de sélecteur de couleur sur sa fiche
- Prix, promo, description, matière/entretien, attributs, tags, mannequin, template : copiés à l'identique
- Inventaire : création de la ligne `inventory` + `stock_levels` par taille pour la couleur concernée (même logique que la création manuelle actuelle)

## Détails techniques

- `src/components/admin/SplitVariantsDialog.tsx` (nouveau) : aperçu, édition nom/SKU, cases à cocher, choix du sort du produit d'origine, barre de progression et rapport final (créés / erreurs).
- `src/lib/splitProductVariants.ts` (nouveau) : logique pure — construit les payloads `Omit<Product,'id'>` à partir d'un produit + ses variantes couleur, génération des SKU/slug, dédoublonnage. Testable.
- `src/pages/admin/AdminProducts.tsx` : nouvelle entrée de menu + action groupée, appel à `useCreateProduct` en série, réutilisation du bloc d'auto-création inventaire/stock existant de `handleCreate` (extrait dans une fonction `syncInventoryForProduct` pour éviter la duplication).
- Lecture du stock existant par couleur/taille via `stock_levels` (jointure `inventory` du produit source) pour répartir les quantités.
- Aucune modification de schéma nécessaire.

## Hors périmètre

- Pas de regroupement « produits liés » côté boutique (les 4 produits sont indépendants). Si tu veux qu'ils s'affichent liés entre eux sur la fiche produit (« autres coloris »), je peux l'ajouter dans un second temps.

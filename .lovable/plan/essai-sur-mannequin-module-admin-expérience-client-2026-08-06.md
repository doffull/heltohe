# Essai sur mannequin — module admin + expérience client

Objectif : en plus de l'essai virtuel avec la photo du client, proposer un essai sur des **mannequins fournis par l'admin** (morphologie, âge, couleur de peau), avec possibilité d'habiller le mannequin de plusieurs produits (doudoune + pantalon + chaussures + accessoires), de sauvegarder le look et d'ajouter le tout au panier.

## 1. Module admin « Mannequins » (/admin/mannequins)

Nouvelle section du tableau de bord où tu peux ajouter autant de mannequins que tu veux :

- Photo du mannequin (upload ou médiathèque existante)
- Nom / libellé
- Genre (femme / homme / enfant / unisexe)
- Tranche d'âge (enfant, ado, adulte, senior)
- Couleur de peau (palette de pastilles claire → foncée)
- Morphologie (mince, standard, athlétique, ronde)
- Taille en cm, ordre d'affichage, actif/inactif
- Notes d'ajustement IA (texte libre : « veste portée ouverte », « ne pas modifier le fond »…) pour que les produits tombent bien sur ce mannequin
- Aperçu de rendu : bouton « Tester avec un produit » pour vérifier l'ajustement avant publication

Liste avec recherche, filtres, duplication, glisser-déposer pour l'ordre.

## 2. Option au niveau du produit

Dans le formulaire produit, un réglage « Mode d'essai » :
`Aucun` / `Photo client` / `Mannequin` / `Les deux` (valeur par défaut configurable globalement dans les réglages).
La fiche produit n'affiche que ce qui est autorisé.

## 3. Expérience client sur la fiche produit

Bouton « Essayer » → modale à deux onglets :

1. **Ma photo** — parcours actuel, inchangé.
2. **Sur un mannequin** — grille de mannequins avec filtres rapides (morphologie / âge / couleur de peau). Un clic génère l'image du mannequin portant le produit (couleur et taille sélectionnées prises en compte).

Après génération :

- **Compléter le look** : suggestions issues du catalogue en ligne uniquement — pantalons, chaussures, bonnets, casquettes, gants, sacs. Une famille n'apparaît que s'il existe au moins un produit actif et visible dans cette catégorie (les produits Collab restent isolés selon les règles existantes). Chaque ajout relance la composition pour superposer la pièce sur le mannequin.
- **Enregistrer le look** dans « Mes essais » (favoris) pour comparer plusieurs doudounes plus tard.
- **Ajouter au panier** : le produit principal seul, ou tout le look en un clic (les tailles manquantes sont demandées avant l'ajout).
- Télécharger / partager l'image.

Les looks enregistrés sont consultables depuis l'espace compte (« Mes essais virtuels »), avec reprise, suppression et ajout au panier.

## 4. Détails techniques

**Base de données** (migration) :
- `mannequins` : image_url, name, gender, age_range, skin_tone, morphology, height_cm, fit_notes, sort_order, is_active + timestamps. Lecture publique des mannequins actifs, écriture réservée aux admins (has_role).
- `tryon_looks` : user_id, mannequin_id, base_product_id, items (jsonb : productId, size, color), result_image, created_at. RLS scopée sur `auth.uid()`; GRANT authenticated + service_role.
- `products.tryon_mode` (text, défaut `both`).
- Bucket de stockage `mannequins` (public) pour les visuels, `tryon-results` (privé) pour les rendus sauvegardés.

**IA** : extension de l'edge function `virtual-tryon` avec un mode `mannequin` — image de base = photo du mannequin, prompt enrichi des attributs (morphologie, âge, carnation) et des `fit_notes`, puis application itérative des pièces additionnelles (l'image générée devient la base de l'étape suivante) pour un layering cohérent. Modèle image Lovable AI déjà utilisé, gestion 429/402 conservée.

**Front** :
- `src/hooks/useMannequins.ts`, `src/hooks/useTryOnLooks.ts`
- `src/pages/admin/AdminMannequins.tsx` + `MannequinForm.tsx` (autosave selon le pattern admin existant)
- refonte de `VirtualTryOnButton.tsx` en modale à onglets, nouveaux composants `MannequinPicker.tsx`, `LookBuilder.tsx`, `SavedLooksGrid.tsx`
- résolution des suggestions via les hooks catalogue existants (`useShopProducts` + `shopVisibility`) pour ne jamais proposer une famille vide

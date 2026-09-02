# Système de poids produits (défaut 1,5 kg)

## Objectif
Chaque produit a un poids d'expédition. Si rien n'est renseigné, le poids vaut 1500 g (1 kg 500). Ce poids sert au calcul du colis Colissimo.

## Ce qui existe déjà
- La colonne `weight_grams` existe sur les produits (ainsi que longueur/largeur/hauteur et le code d'envoi Colissimo), mais sans valeur par défaut et sans champ dans la fiche produit.
- Seule l'édition en masse "Expédition Colissimo" permet aujourd'hui de saisir un poids.
- La génération d'étiquette Colissimo calcule le poids comme `nombre d'articles × 0,5 kg` : le poids réel des produits n'est jamais utilisé.

## Ce qui sera fait

### 1. Base de données
- Valeur par défaut `1500` sur `products.weight_grams` et remplissage des produits existants sans poids.

### 2. Fiche produit (admin)
- Nouvelle section "Expédition" dans le formulaire produit : poids en grammes (pré-rempli à 1500) + dimensions optionnelles + type d'envoi Colissimo.
- Affichage d'un rappel "1,5 kg par défaut" quand le champ est vide.

### 3. Réglage global
- Dans Admin → Défauts produits : champ "Poids par défaut (g)" initialisé à 1500, utilisé pour les nouveaux produits et comme repli au calcul d'expédition.

### 4. Calcul du colis
- L'étiquette Colissimo utilise la somme des poids réels des articles (poids produit × quantité), avec repli sur 1500 g par article manquant, au lieu du forfait 0,5 kg.

### 5. Édition en masse
- Le dialogue d'expédition en masse existant garde son rôle et propose 1500 en placeholder.

## Détails techniques
- Migration : `ALTER TABLE public.products ALTER COLUMN weight_grams SET DEFAULT 1500;` + `UPDATE ... WHERE weight_grams IS NULL`.
- `src/types/index.ts` + `src/hooks/useProducts.ts` : ajout de `weightGrams`, `dimLengthCm`, `dimWidthCm`, `dimHeightCm`, `colissimoProductCode` dans le mapping App ↔ DB (via `FIELD_MAP`, donc sans effet sur les mises à jour partielles).
- `ProductForm.tsx` : bloc "Expédition".
- `ProductDefaultsEditor.tsx` : `defaultWeightGrams` dans `designSettings.productDefaults`.
- `supabase/functions/create-colissimo-label/index.ts` : poids calculé depuis les lignes de commande (lookup `products.weight_grams`), minimum 0,2 kg conservé.

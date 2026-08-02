## Objectif

Depuis la fiche produit admin (zone images), un bouton unique génère automatiquement la pastille de couleur du produit (hex + nom, ex. « Rose Poudré » pour la Wilson Femme Rose) à partir de la photo. Cette pastille alimente les filtres Couleurs de la boutique, mais n'apparaît pas comme sélecteur de couleur sur la page produit quand c'est la seule référence coloris.

## Ce qui sera fait

**1. Bouton « Générer la pastille » (admin > produit)**
- Nouveau bouton dans le bloc images du formulaire produit (`ProductForm.tsx`), à côté des images / galerie.
- Au clic : analyse de l'image principale (et jusqu'à 3 images galerie) → renvoie un code couleur dominant du vêtement + un nom de couleur mode en français.
- La pastille proposée s'affiche en aperçu ; validation en un clic pour l'ajouter aux options couleurs, avec possibilité de corriger le hex ou le nom avant enregistrement.
- Sécurité anti-erreur : la couleur retenue est celle du vêtement, pas du fond ni du mannequin (prompt cadré, comme les autres helpers IA existants).

**2. Pastille « filtre seulement »**
- Nouvel indicateur sur une option couleur : `filterOnly`.
- Coché automatiquement quand la pastille est générée pour un produit mono-coloris (une seule option couleur).
- Case à cocher visible dans l'admin pour basculer manuellement (« Utiliser uniquement dans les filtres boutique »).

**3. Page produit**
- Le sélecteur « Couleur » ignore les pastilles marquées `filterOnly` ; si toutes les options sont en filtre seul, le bloc Couleur disparaît complètement → le client achète directement, sans étape de sélection.
- Aucun changement quand le produit a réellement plusieurs coloris achetables.

**4. Boutique / filtres**
- `ShopFilterPanel` continue de lister toutes les pastilles, y compris `filterOnly`, et le rendu utilise déjà bicolore/texture.
- Le filtrage dans `Shop.tsx` reste inchangé (comparaison par libellé) et prend donc en compte les nouvelles pastilles.

**5. Génération en masse (option incluse)**
- Dans la liste admin des produits : action « Générer les pastilles manquantes » sur la sélection, qui applique le même traitement aux produits sans option couleur (traitement séquentiel avec compteur de progression et rapport succès/échecs).

## Détails techniques

- Nouvelle action `swatch-from-image` dans l'edge function `product-ai-helpers` (Lovable AI Gateway, modèle vision déjà utilisé : `google/gemini-3.1-pro-preview`), retour structuré via tool call `{ hex, label, observations }`, avec validation du format `#RRGGBB` côté serveur.
- `ColorOption` (`src/types/index.ts`) : ajout du champ optionnel `filterOnly?: boolean`. Stocké dans `products.color_options` (jsonb) — aucune migration base nécessaire.
- `ProductOptions.tsx` : filtrage de `colorItems` sur `!filterOnly`, et masquage du bloc si la liste résultante est vide.
- Vérification visuelle : page produit mono-coloris (pas de bloc Couleur) + page boutique (pastille présente dans les filtres, filtrage fonctionnel), desktop et mobile.

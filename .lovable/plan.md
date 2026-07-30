## Objectif

Appliquer partout le texte :

- **Matière :** `100% polyester, rembourrage synthétique, doublure polyester.`
- **Entretien :** `Lavage 30°C, séchage à plat, ne pas repasser.`

## 1. Données existantes (76 produits)

Migration SQL de mise à jour : écrasement de `material` et `care_instructions` pour **tous** les produits (y compris les 29 qui ont déjà un texte personnalisé), avec `updated_at = now()`.

## 2. Nouveaux produits (défauts globaux)

- `ProductDefaultsEditor.tsx` : remplacer les valeurs initiales (`Polyester` / « Lavable en machine à 30°C… ») par les deux nouveaux textes, pour que l'admin voie et puisse re-modifier ce défaut.
- Écriture du même couple dans `design_settings.settings_json.productDefaults` afin que le formulaire produit pré-remplisse ces champs à la création.
- `ProductForm.tsx` : fallback en dur aligné sur ces textes quand aucun défaut n'est encore enregistré.

## 3. Affichage produit

Vérification que `ProductInfo.tsx` (bloc « Matière / Entretien ») affiche bien les deux champs — il devient non vide pour tous les produits, donc le bloc masqué disparaît côté visiteur.

## Détails techniques

- Migration : `UPDATE public.products SET material = '…', care_instructions = '…', updated_at = now();`
- Aucun changement de schéma, aucune RLS impactée.
- Les textes restent modifiables produit par produit après coup.

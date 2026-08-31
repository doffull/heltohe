# Remettre les prix produits comme avant (annuler la hausse x1,2)

## Constat vérifié

- Les 114 produits ont un prix qui finit par `,80` (ex. 202,80 € / 214,80 € / 118,80 €) et **tous** sont exactement divisibles par 1,2 : 202,80 / 1,2 = 169 €, 214,80 / 1,2 = 179 €, 118,80 / 1,2 = 99 €.
- Ces prix ont été modifiés aujourd'hui entre 12:15 et 12:38 (colonne de dernière modification).
- Aucun code du site ne multiplie les prix par 1,2 : la hausse est bien inscrite dans les données, pas dans l'affichage. Le seul 1,2 du code est le calcul d'information de la TVA au checkout (`total × 0,2 / 1,2`), qui n'augmente pas le total.
- Les prix promo (7 produits à 100 €) n'ont pas été touchés (100 n'est pas un multiple de 1,2).

## Correction

1. Remettre chaque prix à sa valeur d'origine : `prix = arrondi(prix / 1,2 ; 2)` sur les 114 produits.
2. Ne pas toucher aux prix promo (`sale_price`), déjà corrects.
3. Vérification immédiate après coup : liste de contrôle avant/après sur une dizaine de produits (Royal 202,80 → 169, Nitro 214,80 → 179, Bombers 130,80 → 109, Rider 118,80 → 99) et contrôle qu'aucun prix ne finit plus par `,80` de façon anormale.

## Détails techniques

- Une seule opération de données (pas de changement de schéma) : `UPDATE public.products SET price = round(price / 1.2, 2)` sur l'ensemble du catalogue, suivie de requêtes de contrôle.
- Aucun fichier front à modifier : l'affichage lit directement `price` / `sale_price`.
- Note : si un outil d'édition en masse a servi à appliquer ce +20 %, je peux ensuite ajouter un garde-fou (confirmation explicite avant application d'un pourcentage global) — à faire seulement si vous le souhaitez.

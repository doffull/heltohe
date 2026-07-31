## Objectif

Aligner la boutique sur le catalogue officiel `PRIX_ET_TAILLES_HELVETICA_ALPHABETIQUE.xlsx` (59 lignes adultes, 13 enfants) sans rien détruire.

Choix par défaut retenus (tu skippes les questions) : le fichier fait référence pour les **tailles**, les prix ne sont **jamais baissés automatiquement** (je les signale), les références manquantes sont créées en **brouillon inactif**, les produits en base absents du fichier restent **inchangés**.

## 1. Corriger les tailles (mise à jour de données)

| Produit | Tailles actuelles | Tailles fichier |
|---|---|---|
| WILSON (homme) - ROSE BLACK | XS→XXXL | XS, S, M, L |
| WILSON (homme) - Gris | XS→XXXL | XS→XXL |
| NED - FULL BLACK | S→XXXL | XS→XXXL |
| Barnes Kids | 4A→14A | 2A→14A |

Les autres références vérifiées (ARTIC, CARLA, ORLIE, LARSON, PHANTOM, GALAXY, FRED, RAPTOR, RIDER, ULTIMA, VORTEX, SPACE 2, STELLAR, STEVE 2, ELITE, ECLIPSE, BOMBERS, OSMOSE, NITRO, ROYAL, MIDDLE BLOCK, IMPERIAL, VANESSA, ELIE, ARNOLDS, HIMALAYA KIDS, VILAR, COMETE KIDS) sont conformes en prix et tailles.

## 2. Créer les références manquantes (brouillons inactifs)

Créées avec prix et tailles du fichier, `is_active = false`, image placeholder, SKU dérivé de la référence, stock 0 — à compléter ensuite dans l'admin avec les photos :

- Adultes : PEGA ONE (Full Black, Original, Gris), PEGAMAX 2, QUEYRAS, SHADOW, SUMIT, THORENS, VIBER, WILSON EWARM, WILSON NAVY (Full Black), ELBERT
- Enfants : RAFAELLI Full Black, RAFAELLI Original

Pour les lignes sans prix dans le fichier (PEGA ONE, QUEYRAS, SHADOW, SUMIT, THORENS, VIBER, WILSON EWARM, PEGAMAX 2), le prix sera mis à 0 et le produit restera inactif jusqu'à ce que tu le renseignes — un produit inactif n'apparaît pas en boutique.

## 3. Écarts signalés mais non modifiés

- `COMET 2` : 169 € en base contre 89 € au fichier (ligne COMETE, XS→XXL). Écart trop important pour être appliqué automatiquement — je te le confirme après ton feu vert.
- `Rafaelie Kids - vert` correspond probablement à la ligne KAKI du fichier (même prix 109 €) : je peux renommer si tu veux.
- Présents en base, absents du fichier : SONIA Noire, SONIA Vert Sous-Bois, SILVER SNOW, CAPRI 3, MAXX, plus les accessoires (AUTEUIL, Cargo/Front/Hybrid pants, Porte-clés, WILSON 2 coupe-vent…) — laissés tels quels.
- Produits sans tailles (accessoires et pantalons) : normal, non traités.

## Détails techniques

- Les corrections de tailles et les créations passent par l'outil d'insertion de données (UPDATE/INSERT sur `products`), pas par une migration de schéma.
- Aucun changement de schéma, aucun changement de code frontend.
- Un récapitulatif final listera chaque ligne modifiée ou créée.

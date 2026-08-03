# Retouche de pose IA + Mode test de paiement

Deux chantiers indépendants.

## 1. Retouche IA de pose / expression sur les images produits (super admins)

Nouvelle action sur chaque image d'un produit (image principale **et** galerie) dans le formulaire produit : un bouton « IA : Pose & expression » qui ouvre une petite fenêtre de retouche.

Dans cette fenêtre :
- Aperçu de l'image d'origine.
- Choix de la **pose** (présélections : de face, 3/4 gauche/droite, profil, mains dans les poches, marche, assis, bras croisés) + champ libre.
- Choix de l'**expression** (neutre, sourire léger, sourire franc, regard sérieux, regard caméra) + champ libre.
- Génération, puis comparaison avant/après.
- Actions : « Remplacer l'image », « Ajouter à la galerie », ou « Régénérer ».

Contraintes fortes appliquées au prompt : le vêtement (coupe, couleur, motifs, logos), l'identité du mannequin, le cadrage, le décor et l'éclairage restent identiques — seules la posture et l'expression changent.

L'image générée est enregistrée dans la médiathèque du site (stockage), pas seulement en base64, pour rester utilisable partout.

Accès réservé aux super admins : le bouton n'apparaît pas pour les autres rôles, et le contrôle est refait côté serveur.

## 2. Mode test de paiement de bout en bout

Nouvel espace admin « Test de paiement » (sous Paiement & Livraison) qui rejoue tout le tunnel d'achat comme un vrai client, sans mouvement d'argent réel.

- Sélection de produits (avec tailles/couleurs et quantités), application d'un code promo réel ou d'aucun, choix livraison domicile ou point relais, adresse pré-remplie modifiable.
- Un bouton lance le scénario et affiche un déroulé étape par étape avec statut (ok / échec / détail) : validation du panier, recalcul serveur des prix, remises, frais de port, création de la commande, paiement, webhook, passage en « Payée », email de confirmation, décrément du stock.
- Deux façons de payer pendant le test :
  - **Passerelle en sandbox** (PayPal sandbox / PayPlug clé de test) : le vrai flux est utilisé, avec badge « mode test » déjà présent.
  - **Passerelle simulée** : si aucune clé de test n'est configurée, un mode « simulation » valide ou refuse le paiement à la demande pour vérifier les deux branches (succès, refus, abandon).
- Les commandes créées pendant un test sont marquées comme telles, exclues du chiffre d'affaires et des statistiques, listées à part et supprimables en un clic.
- Le stock est restauré à l'annulation du test.

Le mode test est visible uniquement pour les admins ; il ne change rien pour les clients du site.

## Détails techniques

**Pose/expression**
- Edge Function `image-pose-edit` : reçoit l'URL de l'image + pose + expression, appelle `google/gemini-3.1-flash-image` (édition d'image) via l'AI Gateway, renvoie le résultat, l'upload dans le bucket médias et retourne l'URL publique.
- Vérification du JWT et du rôle `super_admin` via `has_role` dans la fonction ; gestion explicite des 429 / 402.
- Nouveau composant `src/components/admin/AiPoseEditorDialog.tsx` + bouton déclencheur réutilisable, branché sur `ProductForm.tsx` (image principale ligne ~540 et items de galerie ligne ~560) ; réutilisable ensuite depuis la médiathèque.

**Mode test paiement**
- Nouvelle page `src/pages/admin/AdminPaymentTest.tsx` + route admin, réutilisant `useProducts`, `usePromoCodes`, `useCheckoutConfig`.
- Colonne `is_test` sur `orders` (migration, défaut `false`) + filtrage dans les listes et agrégats existants (`useOrders`, dashboard).
- Edge Function `payment-test` : orchestre `validate_and_create_order` en mode test, simule capture/refus, déclenche la même logique de webhook et d'email que le flux réel, et renvoie le journal d'étapes ; suppression de commande de test avec restauration du stock.
- Les branches sandbox existantes (`paypal`, `payplug`) sont réutilisées telles quelles quand les clés de test sont présentes.

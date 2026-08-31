# Livraison uniquement au checkout + fiabiliser la recherche Colissimo

## 1. Retirer la livraison du panier

Dans le récapitulatif du panier (/cart), la ligne « Livraison » affiche un montant estimé alors qu'aucun mode n'a encore été choisi. Elle sera retirée :

- Suppression de la ligne « Livraison » du bloc Totaux.
- Le TOTAL affiché devient « Sous-total − réduction », avec une mention discrète « Livraison calculée à l'étape suivante ».
- Le badge de confiance « Livraison rapide » en bas de colonne est conservé (informatif, sans prix).

Le choix du mode (Colissimo Point Relais / Colissimo à Domicile), la recherche de point relais et le calcul du prix restent exclusivement sur la page de validation de commande (/checkout), où ils sont déjà en place.

## 2. Erreur « Erreur lors de la recherche » (points relais)

État vérifié : la fonction Colissimo côté serveur répond correctement (test avec 75010 → 3 points relais renvoyés, date d'expédition 31/08/2026). L'échec vient donc du chemin front / appel, pas des identifiants La Poste. La cause exacte n'est pas encore confirmée — première étape du travail : reproduire.

Étapes :

1. Reproduire la recherche depuis /checkout en navigateur (visiteur non connecté et client connecté), et relever le statut HTTP et le corps réel de la réponse.
2. Corriger la cause identifiée. Deux pistes probables déjà repérées :
   - l'appel invité est rejeté (401) selon le type de clé publique utilisée par le navigateur ;
   - la recherche est lancée avec un code postal ou une ville incohérents (ville vide, code postal non encore saisi dans le formulaire d'adresse).
3. Améliorer le message d'erreur : afficher le motif renvoyé par La Poste (code postal desservi, date, service indisponible) au lieu du texte générique, et proposer un nouvel essai.
4. Ajouter un repli utile : si aucun point n'est trouvé, inviter à essayer un code postal voisin, et laisser le mode Domicile sélectionnable pour ne jamais bloquer la commande.

## Détails techniques

- `src/pages/Cart.tsx` : suppression du bloc `shippingCost` dans les totaux ; `total` recalculé sans frais de port.
- `src/pages/Checkout.tsx` : aucune suppression de fonctionnalité ; durcissement de `searchRelayPoints` (normalisation zip/ville, remontée du corps d'erreur, états vides explicites).
- `supabase/functions/colissimo-proxy/index.ts` : ajustement uniquement si la reproduction montre un rejet d'authentification sur l'action publique `getRelayPoints`.
- Vérification finale par script Playwright sur /checkout (recherche 75010 et un code postal en échec).

# Synchro WooCommerce complète + réglages livraison fiables + vérification du site publié

## 1. Prix « point relais » bloqué à 9 €

Constats vérifiés :
- La configuration enregistrée est bien : domicile 15 €, **relais 9 €**, seuil 99 €, livraison gratuite uniquement en relais (activée). La valeur 9 € a donc été enregistrée à un moment, l'enregistrement fonctionne.
- L'écran Commandes & Livraison recharge la configuration en continu (`staleTime: 0`) et un `useEffect` réécrit le formulaire à chaque retour de données : dès qu'on revient sur l'onglet du navigateur ou qu'un rechargement arrive, la valeur tapée est remplacée par 9 € → impression de champ « bloqué ».
- La sauvegarde n'envoie **pas** le réglage « gratuité relais uniquement » : toute modification de ce commutateur est perdue silencieusement.

Correctifs :
- Le formulaire ne se réinitialise plus tant qu'il y a des modifications non enregistrées (indicateur « modifications non enregistrées »).
- Ajout du réglage manquant à l'enregistrement, plus un commutateur clair « Livraison gratuite uniquement en point relais ».
- Message de succès affichant la valeur réellement stockée, et message d'erreur exact en cas d'échec.

## 2. Règle de livraison confirmée

- **Point relais** : prix réglable (par défaut ce que vous saisissez), **gratuit dès 99 €**.
- **Domicile** : 15 €, y compris au-delà de 99 €.
- Règle appliquée aux trois endroits : panier, tunnel de commande, et validation serveur de la commande (le montant facturé reste calculé côté serveur).

## 3. Synchronisation WooCommerce : produits, prix, photos, catégories, stocks

Constats vérifiés : la fonction de synchronisation sait déjà lire les produits WooCommerce (nom, SKU, prix, prix soldé, images, catégories, tailles, couleurs, stock), mais :
- le mode « sync » planifié ne traite que clients / commandes / statistiques ;
- l'écran Admin → WooCommerce n'affiche plus de cases Produits et Stocks ;
- seule la **première** image est enregistrée : la galerie photo est perdue ;
- les catégories sont concaténées dans un seul champ texte, sans création des vraies catégories du site.

Ce que je vais faire :
- Réintroduire **Produits** et **Stocks** dans la synchronisation (cases à cocher + sync incrémentale).
- Import complet par produit : nom, sous-titre/description, prix et prix soldé, **toutes les photos** (image principale + galerie), tailles, couleurs, attributs, tags, statut publié/brouillon, stock.
- **Catégories** : création/mise à jour des catégories du site à partir des catégories WooCommerce (avec catégorie principale + catégories multiples sur le produit).
- Correspondance par SKU (mise à jour sans doublon), avec journal détaillé par section et décompte réel (produits créés / mis à jour / en erreur).
- Bouton « Synchroniser les produits maintenant » + résultats affichés à l'écran.
- Les images restent hébergées chez WooCommerce (URL) pour éviter des heures de transfert ; option de reprise ultérieure si vous voulez les héberger côté site.

## 4. Build complet et vérification du site publié

- Relance du build et du typecheck complet.
- Vérification en navigateur : page **Panier** (frais relais/domicile et gratuité à 99 €), **Tunnel de commande** (même calcul, mention « Livraison gratuite en point relais dès 99 € — domicile 15 € »), et **page Contact** (formulaire + section FAQ dépliable + réponse automatique).
- Correction de ce qui casse pendant ces vérifications, puis republication.

## Détails techniques

- `src/hooks/useCheckoutConfig.ts` : ajouter `free_shipping_relay_only` au payload d'`upsert` ; `useCheckoutConfigAdmin` avec `refetchOnWindowFocus: false`.
- `src/pages/admin/AdminCheckout.tsx` : état « dirty », `useEffect` conditionné, commutateur relais-only, toasts détaillés.
- `src/pages/Cart.tsx` / `src/pages/Checkout.tsx` : utiliser `computeShippingCost` du hook (plus de 4,5 en dur ligne 159 du checkout).
- `supabase/functions/woocommerce-import/index.ts` : ajouter `syncProducts` / `syncStock` au mode `sync`, enrichir `mapWcProduct` (galerie → `gallery_images`, `categories[]`, `subtitle`, `status`), upsert des catégories dans `categories`, filtre `modified_after` pour l'incrémental.
- `src/hooks/useWooCommerce.ts` + `src/pages/admin/AdminWooCommerce.tsx` : options Produits/Stocks et compteurs de résultats.
- Vérification finale : `bunx tsgo --noEmit -p tsconfig.app.json`, build, puis parcours Playwright panier/checkout/contact.

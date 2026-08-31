# Clients, réglages admin fiables, livraison, page Contact + FAQ

## 1. Les clients inscrits n'apparaissent pas

Constat vérifié : 9 comptes existent côté authentification, mais la table des clients est **vide** (0 ligne). La création du profil client se fait aujourd'hui depuis le navigateur juste après l'inscription ; comme l'e-mail doit d'abord être confirmé, il n'y a pas encore de session à ce moment-là et l'insertion est refusée par les règles d'accès.

Correctifs :
- Récupérer les 9 comptes existants dans la liste clients (reprise unique des comptes déjà inscrits, avec e-mail, prénom/nom et date d'inscription).
- Créer le profil client de façon fiable côté serveur, appelé automatiquement à la première connexion réussie (et après confirmation d'e-mail), donc plus aucun inscrit oublié.
- Enrichir la liste admin : nombre de commandes et total dépensé, badge « source » (site / WooCommerce), recherche par e-mail.

## 2. Réglages admin qui ne se sauvegardent pas (Commandes & Livraison)

Constats vérifiés :
- Les droits d'écriture admin et la contrainte d'unicité existent : la sauvegarde part bien vers la base.
- La page **Commandes & Livraison** recharge la configuration en continu (`staleTime: 0`) et réécrase le formulaire à chaque retour de focus/refetch : les modifications en cours sont perdues avant même le clic sur Sauvegarder, ce qui donne l'impression que « rien ne se sauvegarde ».
- La fonction serveur qui valide les commandes contient les tarifs **en dur** (200 € de seuil, 6,50 € domicile, 4,50 € relais) : même une sauvegarde réussie n'était pas appliquée au vrai calcul de la commande.

Correctifs :
- Le formulaire ne se réinitialise plus tant qu'il y a des modifications non enregistrées ; indicateur « modifications non enregistrées », confirmation claire de succès et affichage du message d'erreur exact en cas d'échec.
- Rechargement de la configuration après enregistrement pour confirmer visuellement la valeur réellement stockée.
- La validation de commande côté serveur lit désormais la configuration enregistrée (plus aucune valeur en dur).
- Passage en revue des autres écrans admin qui utilisent le même schéma de formulaire (Paramètres, Sécurité/filigrane, Notifications, Colissimo) pour appliquer la même correction et lister ce qui reste réellement bloqué.

## 3. Nouvelle règle de livraison

- **Point relais** : gratuit au-dessus du seuil (99 € par défaut, réglable).
- **Domicile** : 15 € en permanence, y compris au-delà de 99 €.
- Réglages exposés dans l'admin : prix domicile, prix relais, seuil, et interrupteur « livraison gratuite uniquement en point relais ».
- Règle appliquée aux trois endroits : panier, tunnel de commande, et validation serveur de la commande (le montant facturé reste calculé côté serveur).
- Mention affichée au checkout : « Livraison gratuite en point relais dès 99 € — domicile 15 € ».

## 4. Page Contact publique + FAQ + réponse automatique IA

La page `/contact` existe déjà avec formulaire (anti-spam) et assistant IA. Elle est complétée :
- **Section FAQ** repliable sous le formulaire, alimentée par la base (questions/réponses ordonnables, catégories), avec balisage FAQ pour Google.
- **Gestion admin de la FAQ** : ajout, modification, réordonnancement, activation/désactivation.
- **Réponse automatique IA** : à l'envoi d'un message, une réponse est générée avec Gemini en s'appuyant sur la FAQ et les infos boutique, enregistrée avec le message et affichée immédiatement au visiteur ; l'e-mail de notification admin reste envoyé. Si l'IA échoue, le message est quand même enregistré (aucune perte).
- Les messages restent visibles dans la messagerie admin, avec la réponse automatique tracée.

## Détails techniques

- Base : reprise des comptes existants vers `customers` ; fonction `SECURITY DEFINER` `ensure_customer_profile()` appelée depuis `AuthContext` après connexion ; nouvelle table `faq_items` (question, answer, category, sort_order, is_active) avec lecture publique et gestion admin, + GRANTs ; colonnes de réponse auto sur `messages`.
- `validate_and_create_order` : lecture de `checkout_config` (prix domicile/relais, seuil, mode gratuité relais uniquement) au lieu des constantes.
- Front : `useCheckoutConfig` (nouveau champ `freeShippingRelayOnly`), `AdminCheckout` (état « dirty »), `Checkout.tsx` / `Cart.tsx` pour le calcul des frais, `Contact.tsx` pour la FAQ, nouvel `useFaq`.
- Edge function `contact-chat` étendue avec un mode « réponse automatique » alimenté par la FAQ.

# Suivi colis en temps réel, modèle d'inscription publié, pop-up panier

Trois chantiers indépendants.

## 1. Notifications quand le transporteur change l'état du colis

Objectif : dès que le colis change d'état (pris en charge, en transit, livré), le client reçoit un e-mail et la page « Où en est mon colis » se met à jour sans rechargement.

- Nouvelle table de suivi (`order_tracking_events`) qui stocke l'historique d'états remonté par le transporteur pour chaque commande (date, libellé, code, lieu).
- Nouvelle fonction serveur `poll-carrier-tracking` : parcourt les commandes expédiées non livrées, interroge le suivi Colissimo/La Poste avec le numéro de suivi, enregistre les nouveaux événements et met à jour le statut de la commande (`Shipped` → `Delivered`).
- Planification automatique (toutes les heures) côté base pour que ça tourne sans intervention.
- Pour chaque nouvel événement important (pris en charge, en cours de livraison, livré), envoi d'un e-mail au client via la fonction d'e-mails de commande existante, avec anti-doublon (un e-mail par événement, jamais deux fois).
- Temps réel dans `/compte/commandes` : abonnement aux changements de la commande et de ses événements de suivi, la frise et l'historique s'actualisent instantanément. Ajout d'un bloc « Historique du colis » sous la frise existante.

Point à valider : le suivi Colissimo nécessite un accès API d'affranchissement/suivi. Si les identifiants Colissimo déjà configurés ne couvrent pas le suivi, la fonction basculera en mode dégradé (aucun événement remonté) jusqu'à ce que l'accès soit fourni ; les notifications sur changement de statut saisi manuellement dans l'admin continueront de fonctionner.

## 2. Publier le modèle « e-mail d'inscription »

- Publication du modèle `signup` : le brouillon actuel (ou le modèle de marque par défaut s'il n'y a pas de brouillon) est écrit en version publiée avec sa date de publication.
- Vérification que la fonction d'envoi des e-mails d'authentification lit bien cette version publiée en priorité.
- Rappel affiché dans l'admin des modèles non encore publiés (badge « brouillon non publié ») pour éviter le même écart sur les 5 autres modèles.

Note : l'e-mail d'inscription ne partira avec votre design qu'une fois la vérification DNS du domaine d'envoi terminée ; la publication est le prérequis côté contenu.

## 3. Pop-up animé à l'ajout au panier + redirection

- Nouveau composant de confirmation plein écran (modale) déclenché à chaque ajout au panier (page produit, barre d'achat mobile, look complet, cartes produit).
- Animation : apparition en fondu + échelle, coche animée et éclat de paillettes (réutilisation de l'effet existant), style Industrial Luxury (angles 45°, monochrome).
- Contenu : visuel du produit, nom, taille/couleur, quantité, sous-total panier.
- Deux actions : « Voir mon panier » (redirection immédiate vers `/panier`) et « Continuer mes achats ». Redirection automatique vers le panier après 2,5 s si aucune action, avec barre de progression visible.
- Remplace le simple toast actuel d'ajout au panier.

## Détails techniques

- Table `order_tracking_events` : `id`, `order_id` (FK orders), `status_code`, `label`, `location`, `event_at`, `notified_at`, `created_at`. GRANT `select` à `authenticated`, `all` à `service_role` ; RLS : lecture par le propriétaire de la commande et les admins, écriture réservée au service role.
- Edge function `poll-carrier-tracking` (service role) + `pg_cron` horaire ; e-mails via `send-order-status-email` étendu d'un type `tracking_update`.
- Realtime : `supabase.channel` sur `orders` et `order_tracking_events` filtrés par commande, invalidation React Query dans `useMyOrders`.
- Modèle e-mail : mise à jour de la ligne `key = 'signup'` dans `auth_email_templates` (`published`, `published_at`).
- Pop-up : composant `AddToCartDialog` monté via le contexte panier pour couvrir tous les points d'ajout, `sparkle-burst` réutilisé, navigation avec `useNavigate`.

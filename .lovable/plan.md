# Contact client, e-mails personnalisables, Colissimo en masse, commandes non payées

## 1. Contacter un client (bouton E-mail actif)

Aujourd'hui les boutons « E-mail » dans Admin → Clients et Admin → Commandes ouvrent seulement `mailto:` (souvent inactif si aucun logiciel de messagerie n'est configuré).

- Remplacer par une fenêtre « Écrire au client » directement dans l'admin : destinataire pré-rempli, objet, message, choix d'un modèle, aperçu.
- Envoi via le SMTP déjà en place (shop@helvetica-mp.com), avec trace dans l'historique client.
- Variables automatiques : prénom, n° de commande, montant, n° de suivi, lien de suivi.
- Disponible depuis la liste clients, la fiche client, la liste commandes et la fiche commande.
- Envoi groupé possible depuis une sélection (voir §3).

## 2. Espace « E-mails & Factures » dans l'admin

Nouvelle page Admin → E-mails & Factures, avec aperçu en direct :

- **Modèles e-mails clients** : confirmation de commande, paiement reçu, expédition (avec lien La Poste), livraison, message libre. Objet + contenu modifiables, variables insérables, e-mail de test.
- **Identité visuelle commune** : logo, couleurs, en-tête, pied de page, mentions, réseaux sociaux, signature.
- **Facture & bon de livraison** : logo, informations société, TVA/mentions légales, conditions de retour, texte de bas de page. La facture continue d'afficher photo, nom, couleur, taille, prix unitaire et total (déjà en place).

## 3. Commandes : étiquettes et suivi en masse

Dans la barre d'actions groupées d'Admin → Commandes (sélection déjà existante), ajouter :

- Générer les étiquettes Colissimo pour toutes les commandes sélectionnées (en série, avec compte-rendu succès/échec).
- Télécharger / imprimer un PDF regroupant toutes les étiquettes générées.
- Saisir ou importer les n° de suivi en masse, puis marquer « Expédiée » et envoyer l'e-mail d'expédition à chaque client.
- Actualiser le statut de suivi des commandes sélectionnées.
- Envoyer un e-mail (modèle au choix) à tous les clients sélectionnés.

## 4. Produits : réglages Colissimo en masse

Ajout, par produit, de : poids, dimensions (L × l × h) et type d'envoi par défaut (domicile / point relais / retour).

- Édition en masse depuis Admin → Produits (sélection puis « Réglages Colissimo »), et import/export tableur.
- L'étiquette utilise le poids réel de la commande (somme des articles) au lieu de l'estimation actuelle de 0,5 kg par article, et le type d'envoi déduit du produit / du mode de livraison choisi.

## 5. Ne plus afficher les commandes dont le paiement n'aboutit pas

Constat vérifié en base : 20 commandes existent, dont 15 avec un paiement encore « Pending ». Elles apparaissent dans le tableau de bord alors que le paiement n'a pas abouti.

- Une commande n'apparaît dans l'admin (liste, dashboard, statistiques, préparations) qu'une fois le paiement confirmé par PayPal ou PayPlug.
- Techniquement la commande doit exister avant la redirection vers le paiement (elle sert de référence à PayPal/PayPlug) : elle sera enregistrée en brouillon masqué, invisible partout, puis publiée automatiquement dès la confirmation de paiement.
- Les brouillons non payés sont supprimés automatiquement après 24 h, et consultables entre-temps via un filtre « Paniers abandonnés » réservé à l'admin.
- Les 15 commandes non payées existantes seront basculées en « abandonnées » (non supprimées) pour nettoyer le tableau de bord.

## Détails techniques

- Base : `orders.is_draft` (+ index) et purge planifiée ; `products.weight_grams`, `dim_length_cm`, `dim_width_cm`, `dim_height_cm`, `colissimo_product_code` ; table `email_templates` (clé, objet, HTML, actif) et bloc `invoiceSettings` dans `design_settings.settings_json`.
- Front : nouvelle page `src/pages/admin/AdminEmails.tsx` + route, composant `SendEmailDialog.tsx` réutilisable, actions groupées étendues dans `AdminOrders.tsx`, dialogue « Réglages Colissimo » dans `AdminProducts.tsx`, filtrage des brouillons dans `useOrders.ts` / dashboard / préparations.
- Backend : nouvelle fonction `send-custom-email` (SMTP existant, validation Zod, rôle admin requis) ; `send-order-status-email` et `send-order-confirmation` lisent les modèles personnalisés avec repli sur les modèles actuels ; `create-colissimo-label` et `auto-colissimo-label` utilisent poids/dimensions/type d'envoi réels et publient la commande ; les webhooks PayPal/PayPlug lèvent le brouillon.

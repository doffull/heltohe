# Suivi client, étiquette automatique, newsletters et réglages devises/langues

## 1. Page « Suivi de mes commandes » (espace client)

Nouvelle page `/compte/suivi` accessible depuis le menu de l'espace client :

- Tableau clair : date, n° de commande, montant, statut (Reçue → Payée → En préparation → Expédiée → Livrée), n° de suivi.
- N° de suivi copiable + lien direct vers le suivi La Poste / transporteur.
- Filtre par statut et recherche par n° de commande.
- Mise à jour en temps réel (déjà branchée sur les commandes et les événements transporteur).
- Détail dépliable : articles, adresse ou point relais, historique des événements de suivi.

## 2. Étiquette Colissimo automatique dès le paiement validé

- Une fonction serveur `auto-colissimo-label` génère l'étiquette dès qu'un paiement est confirmé (PayPal et PayPlug).
- Elle enregistre le n° de suivi et le transporteur, passe la commande en « Expédiée » et envoie l'e-mail d'expédition au client avec le lien de suivi.
- L'étiquette PDF est stockée pour être re-téléchargée depuis Admin → Commandes (le bouton manuel reste disponible en secours / réimpression).
- Sécurité anti-doublon : si un n° de suivi existe déjà, aucune nouvelle étiquette n'est créée.
- Si Colissimo échoue (adresse incomplète, indisponibilité), la commande reste « En préparation », l'erreur est journalisée et visible dans l'admin, aucun e-mail erroné n'est envoyé.
- Interrupteur dans Admin → Colissimo : « Générer l'étiquette automatiquement au paiement » (activable/désactivable).

## 3. Newsletters : double opt-in + campagnes

Nouvel onglet complet dans Admin → Marketing → Newsletter :

- **Abonnés** : liste, recherche, import/export CSV, statut (en attente de confirmation, abonné, désabonné), suppression.
- **Double opt-in** : après inscription (footer, pop-up, bouton), un e-mail de confirmation est envoyé ; l'abonné n'est actif qu'après clic. Page publique de confirmation et page de désabonnement en un clic.
- **Campagnes** : création d'une campagne (objet, contenu riche, image, bouton CTA), aperçu, envoi test, puis envoi par lots via votre serveur d'envoi o2switch existant.
- **Statistiques par campagne** : envoyés, échecs, désabonnements.
- Lien de désabonnement obligatoire dans chaque envoi (conformité RGPD/CNIL).

## 4. Section Devises & Langues dans l'admin

Nouvelle page Admin → Devises & Langues :

- Activer/désactiver les devises proposées (EUR, USD, GBP, CHF, CAD, AED), modifier les taux de change, choisir la devise par défaut.
- Activer/désactiver les langues affichées dans le sélecteur (FR, EN, ES, DE, IT) et définir la langue par défaut.
- Rappel affiché : l'encaissement reste en EUR, l'affichage est converti.
- Le sélecteur du site n'affiche que ce qui est activé ici.

## Détails techniques

- Base : nouvelles tables `newsletter_campaigns` (objet, contenu, statut, compteurs) et `newsletter_campaign_sends` (destinataire, statut, erreur) avec GRANT + RLS admin ; ajout sur `newsletters` de `confirmed_at`, `confirm_token`, `unsubscribe_token`, `source`.
- Fonctions serveur : `newsletter-subscribe` (double opt-in), `newsletter-confirm`, `newsletter-unsubscribe`, `newsletter-send-campaign` (envoi par lots via le mailer SMTP partagé), `auto-colissimo-label` (appelée par les webhooks PayPal/PayPlug et par `validate_and_create_order` en paiement confirmé).
- Front : `src/pages/AccountOrderTracking.tsx` (réutilise `useMyOrders` / `useMyTrackingEvents`), `src/pages/admin/AdminNewsletters.tsx`, `src/pages/admin/AdminLocales.tsx`, pages publiques `/newsletter/confirmation` et `/newsletter/desabonnement`.
- Réglages devises/langues stockés dans `design_settings.settings_json.locales` ; `CurrencyContext` et `src/lib/currency.ts` lisent la liste activée et les taux.
- Ajout des nouvelles entrées dans `src/config/adminSections.ts` et les routes admin.
- Correction au passage de l'erreur 500 d'une fonction serveur observée dans l'aperçu.

-- Confirmation de paiement : un seul e-mail par commande, quel que soit le chemin.
--
-- Contexte : une cliente qui payait par carte (PayPlug) ou PayPal ne recevait
-- AUCUNE confirmation de commande, et l'administration aucune alerte. Les
-- e-mails n'étaient branchés que sur le bouton « Commander », pas sur les deux
-- parcours de paiement en ligne. Constaté le 15/09/2026.
--
-- En corrigeant, un paiement peut désormais être confirmé par trois voies
-- concurrentes :
--   1. le webhook du prestataire (PayPlug / PayPal) ;
--   2. le retour du navigateur de la cliente (`check-order` / `capture-order`) ;
--   3. une régularisation manuelle en administration.
-- Les deux premières peuvent se déclencher à la même seconde. Sans verrou, la
-- cliente recevrait deux fois le même e-mail — et l'administration deux alertes
-- pour une seule vente.
--
-- Le verrou vit ici, dans la base, et non dans le code : c'est le seul endroit
-- où deux exécutions simultanées de l'edge function peuvent réellement
-- s'exclure. Une vérification applicative (« est-ce déjà envoyé ? ») laisserait
-- passer les deux appels lancés en même temps.

CREATE UNIQUE INDEX IF NOT EXISTS notification_log_payment_confirmation_once
  ON public.notification_log (order_id)
  WHERE notification_type = 'payment_confirmation';

COMMENT ON INDEX public.notification_log_payment_confirmation_once IS
  'Une seule confirmation de paiement par commande. L''insertion sert de '
  'réservation : le premier appelant gagne, les suivants reçoivent une '
  'violation d''unicité et savent qu''ils n''ont rien à envoyer. '
  'L''index est restreint à ce type — les notifications internes '
  '(stock_reservation_created) ont légitimement plusieurs destinataires, '
  'donc plusieurs lignes par commande.';

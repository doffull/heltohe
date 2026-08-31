# Envoi d'e-mails réel + gestion du mot de passe des membres de l'équipe

## 1. Bouton « Envoyer un email » réellement fonctionnel

Aujourd'hui ce bouton ouvre simplement le logiciel de messagerie du poste (`mailto:`) : rien ne part depuis le site.

Nouveau comportement : le bouton ouvre une petite fenêtre de rédaction dans l'admin avec
- objet,
- message (texte enrichi simple : sauts de ligne, gras),
- choix d'un modèle rapide (message libre, information commande, demande de document),
- aperçu de l'expéditeur utilisé (adresse d'envoi du site).

À l'envoi : l'e-mail part réellement depuis le domaine du site, un toast confirme (ou affiche le motif exact du refus), et l'envoi apparaît immédiatement dans la section « E-MAILS ENVOYÉS » de la fiche client (historique déjà présent, aujourd'hui vide).

Sécurité : seuls les comptes Admin peuvent envoyer. Un client désinscrit/en liste de suppression n'est pas contacté.

## 2. Mot de passe des rôles (équipe)

Dans le bloc « RÔLES ÉQUIPE » de la fiche, deux actions apparaissent dès qu'un rôle est attribué :

- **Envoyer un lien de réinitialisation** — le membre reçoit un e-mail et choisit lui-même son mot de passe (recommandé, aucun mot de passe ne transite par l'admin).
- **Définir un mot de passe** — l'admin saisit un mot de passe (min. 8 caractères, indicateur de robustesse) appliqué immédiatement au compte, avec e-mail d'information au membre.

Les deux actions sont réservées à l'Admin, journalisées dans l'historique des e-mails et le journal des rôles. Un préparateur ou un valideur ne voit pas ces boutons.

## Détails techniques

- Nouvelle Edge Function `send-customer-email` : vérifie le JWT + `has_role(admin)`, envoie via `_shared/mailer.ts` (Resend, `MAIL_FROM`), vérifie `suppressed_emails`, insère une ligne dans `customer_email_log` (`email_type: 'admin_manual'`).
- Nouvelle Edge Function `admin-set-user-password` : JWT + `has_role(admin)`, deux actions — `reset-link` (`auth.admin.generateLink` type `recovery`, envoi via mailer) et `set-password` (`auth.admin.updateUserById`) avec client service-role ; refuse de modifier un autre Admin sauf soi-même.
- `src/pages/admin/AdminCustomers.tsx` : nouveau `CustomerEmailDialog` (remplace le `mailto:`) + bloc mot de passe dans `RoleManager`, invalidation de `useCustomerEmailLog` après envoi.
- Déploiement des deux fonctions ; vérification par un envoi de test réel et lecture des logs.

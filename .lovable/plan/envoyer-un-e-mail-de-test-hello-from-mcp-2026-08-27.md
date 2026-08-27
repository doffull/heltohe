# Envoyer un e-mail de test « Hello from MCP »

## Objectif
Envoyer un e-mail unique à `helvetica.market@gmail.com`, sujet « Hello from MCP », expéditeur `onboarding@resend.dev`.

## Ce qui sera fait
1. Vérifier qu'une connexion Resend accessible existe pour cet espace de travail.
2. Envoyer l'e-mail via la passerelle Resend (appel unique, aucun code ajouté au projet).
3. Rapporter le statut et l'identifiant de l'e-mail renvoyé par Resend.

## Point d'attention
`onboarding@resend.dev` ne délivre qu'à l'adresse vérifiée du propriétaire du compte Resend. Si `helvetica.market@gmail.com` n'est pas cette adresse, Resend renverra une erreur 403. Dans ce cas, l'envoi devra partir d'un domaine vérifié (ex. `notify.helvetica-mp.com`, déjà configuré côté e-mails du projet).

## Détails techniques
- Aucun fichier du projet modifié, aucune Edge Function déployée.
- Appel : `POST /emails` sur la passerelle connecteur Resend, corps `{ from, to, subject, html }`.

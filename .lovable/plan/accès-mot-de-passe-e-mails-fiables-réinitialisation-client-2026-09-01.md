# Accès & mot de passe : e-mails fiables + réinitialisation client

## Objectif
1. Les e-mails « accès / mot de passe » n'arrivent plus dans les indésirables.
2. Un client peut réinitialiser son mot de passe seul, en 2 clics, sans passer par un administrateur.

## 1. Réinitialisation en libre-service pour le client
- Ajouter un lien « Mot de passe oublié ? » sous le champ mot de passe de l'onglet Connexion (`/auth`).
- Ouvre un petit panneau : l'utilisateur saisit son e-mail, reçoit un lien, retour à l'écran de connexion.
- Réponse toujours neutre (« Si un compte existe, un e-mail vient d'être envoyé ») pour ne pas révéler quels e-mails sont inscrits.
- Le lien renvoie vers la page `/reset-password` déjà existante (saisie + confirmation du nouveau mot de passe), avec un message plus clair quand le lien est expiré et un bouton « Renvoyer un lien ».
- Ajouter aussi, depuis Mon compte → Profil, un bouton « Changer mon mot de passe » (l'utilisateur connecté saisit directement le nouveau mot de passe).

## 2. E-mails envoyés par notre propre serveur (pas les e-mails par défaut)
- Nouvelle fonction serveur publique `password-reset-request` : elle génère le lien de récupération et envoie l'e-mail via notre SMTP o2switch (le même que les commandes), au lieu de l'expéditeur par défaut du système d'authentification, qui est la principale cause de mise en spam.
- Protection anti-abus : anti-robot (honeypot + délai), limite de 3 demandes par e-mail toutes les 15 minutes, journalisation des échecs.
- Un seul gabarit d'e-mail « accès & mot de passe », partagé avec Admin → Rôles, aux couleurs du site.

## 3. Réduire le risque « indésirable »
Améliorations concrètes du gabarit et de l'envoi :
- Expéditeur unique et aligné au domaine SMTP, `Reply-To` sur une vraie boîte lisible.
- Version texte brut complète (pas seulement HTML), sujet sans majuscules ni ponctuation excessive, ratio texte/lien correct, une seule URL cliquable, aucune image distante obligatoire.
- En-têtes propres : `Message-ID`, `Date`, `List-Unsubscribe` non pertinent ici mais `Auto-Submitted: auto-generated` et `X-Priority` neutre.
- Page de diagnostic : dans Admin → Rôles, un bouton « Tester l'e-mail d'accès » qui envoie à une adresse choisie et affiche le résultat SMTP exact (utile pour vérifier après chaque changement DNS).

### Côté DNS (vérification, pas de code)
Contrôle automatique et affichage du résultat dans l'admin pour le domaine d'envoi :
- SPF incluant o2switch, DKIM `default._domainkey`, DMARC.
- Recommandation affichée : passer DMARC de `p=none` à `p=quarantine` une fois SPF/DKIM verts, ce qui améliore nettement la réputation.

## Détails techniques
- Nouvelle Edge Function `password-reset-request` (publique, `verify_jwt = false`) : validation Zod de l'e-mail, `auth.admin.generateLink({ type: 'recovery', redirectTo: <origine>/reset-password })`, envoi via `_shared/mailer.ts`, réponse générique 200.
- Nouveau module `supabase/functions/_shared/access-email.ts` : gabarit unique (sujet, HTML, texte) réutilisé par `admin-team` et `password-reset-request`; `admin-team/index.ts` remplace sa fonction `linkEmail` locale par celui-ci.
- Limitation de débit via une table `password_reset_attempts` (email, ip hash, created_at) avec RLS fermée (accès service_role uniquement) et GRANT explicite.
- `src/pages/Auth.tsx` : état `forgotMode`, appel `supabase.functions.invoke('password-reset-request')`.
- `src/pages/ResetPassword.tsx` : message d'expiration + renvoi de lien.
- `src/pages/AccountProfile.tsx` : section changement de mot de passe via `supabase.auth.updateUser`.
- Déploiement de `password-reset-request` et `admin-team`, puis test d'envoi réel vers une adresse du domaine.

# Import clients, permissions par rôle, et point relais

## 1. Import de clients (Admin → Clients)

Nouveau bouton « Importer des clients » avec deux sources :

- **Fichier CSV / Excel** : détection automatique des colonnes (e-mail, prénom, nom, téléphone, adresse, ville, code postal, pays). Aperçu des 10 premières lignes avant validation, avec compteur « X nouveaux / Y mis à jour / Z ignorés ».
- **WooCommerce** : récupération des clients de la boutique déjà connectée, avec option « ne pas écraser les fiches existantes ».

Règles : l'e-mail sert de clé unique (pas de doublons), les lignes sans e-mail valide sont ignorées et listées dans un rapport téléchargeable. Aucun compte de connexion n'est créé — ce sont des fiches clients.

## 2. Rôles et permissions par rôle

Nouvelle section dans Admin → Rôles :

- **Liste des administrateurs et des membres** : tous les comptes ayant un rôle, avec e-mail, rôles, date d'attribution, et actions attribuer/retirer (déjà en place, complétée par la liste).
- **Grille de permissions par rôle** : pour chaque rôle (Resp. stock, Préparateur, Auditeur, Valideur commandes), des cases à cocher pour chaque section du tableau de bord (Produits, Commandes, Stock, Colissimo, Clients, Design, Sécurité...). Le Super Admin voit tout et n'est pas modifiable.
- Valeurs par défaut proposées (modifiables) :
  - Préparateur : Dashboard, Préparations, Colissimo.
  - Resp. stock : Dashboard, Stock, Produits, Préparations.
  - Valideur commandes : Dashboard, Commandes, Préparations, Colissimo, Clients.
  - Auditeur : Dashboard, Audit, Erreurs, Analytique (lecture).
- Application réelle : le menu masque les sections non cochées **et** l'accès direct par URL redirige vers le tableau de bord. Les réglages sont enregistrés en base, donc identiques pour tous les appareils.

## 3. Module point relais — « erreur lors de la recherche »

Les identifiants Colissimo sont bien présents côté serveur, donc la cause exacte n'est pas encore confirmée : le message affiché est un texte générique qui masque la vraie réponse du service La Poste. Première étape : reproduire la recherche et lire la réponse réelle.

Ensuite :
- Afficher le vrai motif au client (code postal refusé, service indisponible, aucun point trouvé) au lieu de « Erreur lors de la recherche ».
- Corriger la cause identifiée (le plus probable : refus du service sur la date d'expédition un dimanche/jour férié, ou format d'appel) et ajouter un repli automatique sur le jour ouvré suivant.
- Ajouter un bouton « Tester la recherche point relais » dans Admin → Colissimo affichant le diagnostic complet.
- Vérification finale sur le tunnel de commande avec un code postal réel.

## Détails techniques

- `src/pages/admin/AdminCustomers.tsx` + nouveau `CustomerImportDialog.tsx` (parsing XLSX/CSV via la lib déjà utilisée pour les imports produits), upsert sur `customers.email`; mode WooCommerce via `woocommerce-import` (nouvelle action `importCustomers` réutilisant le gateway).
- Nouvelle table `role_permissions` (role, allowed_routes[]) avec GRANT + RLS (lecture authentifiée, écriture admin) ; hook `useRolePermissions`; `Admin.tsx` construit `allowedHrefs` depuis la base avec repli sur les constantes actuelles.
- `AdminRoles.tsx` : liste des porteurs de rôles (via `list_users_by_role`) + grille de cases à cocher.
- `supabase/functions/colissimo-proxy/index.ts` : renvoi du `errorCode`/`errorMessage` exact, repli jour ouvré pour `shippingDate`, action `diagnoseRelay`; `src/pages/Checkout.tsx` affiche `details` dans le toast.

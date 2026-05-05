# Audit complet du tableau de bord admin

Audit qualité premium des **17 pages admin** + shell commun (`Admin.tsx`). Objectif : tout fonctionne, rien de cassé, mobile parfait à 360px, zéro doublon, zéro contraste blanc/blanc, tous les boutons opérationnels.

## Périmètre

**Shell commun** : `Admin.tsx` (sidebar desktop + drawer mobile, header, routing, gestion rôles)

**17 pages** :
Dashboard · Produits · Commandes · Préparations · Checkout · Clients · Pages · Média · Marketing · Design · Stock · Colissimo · Notifications · Chatbot · WooCommerce · Audit · Paramètres

## Méthode (par page)

1. **Lecture du fichier** + composants enfants
2. **Test fonctionnel mental** : chaque bouton, chaque mutation (create/update/delete/bulk), chaque dialog, chaque filtre/recherche
3. **Test responsive** : tableau qui déborde ? colonnes qui se chevauchent à 360px ? boutons trop grands ?
4. **Test visuel** : contraste texte/fond (blanc-sur-blanc, noir-sur-noir, hover invisibles), icônes manquantes, doublons d'images
5. **Test états** : loading, empty, error, succès toast
6. **Correction directe**

## Corrections types attendues

- **Tableaux desktop** → wrapper `overflow-x-auto` + version mobile en `cards` empilées
- **Boutons d'action** → vérifier que chaque `onClick` appelle bien la mutation et affiche un toast
- **Dialogs** → fermeture après succès, reset du formulaire, validation des champs requis
- **Bulk actions** → barre d'action sticky, compteur correct, confirmation avant delete
- **Sidebar items dupliqués** → `Marketing` et `Bannières` pointent tous deux vers `AdminMarketing` (ligne 244-245 → bannieres redirigeable ou supprimé)
- **Couleurs** → respect de `sectionColors[href]` partout, pas de couleurs hardcodées qui cassent le thème
- **Empty states** → message + CTA d'action
- **Loading skeletons** → uniformes (chamfer-hud)
- **Headers de page** → tous au même format (`h1` + sous-titre + actions à droite)
- **i18n FR** → tous les libellés en français, pas de "Loading..." anglais résiduel

## Checks transversaux

- **Routing** : doublon `bannieres/*` → décider (rediriger ou retirer du routing)
- **Permissions** : préparateur ne voit que `/admin/preparations` (OK actuellement) — vérifier que les autres pages refusent bien l'accès direct par URL
- **Console** : zéro warning React (refs, keys, controlled inputs)
- **Network** : zéro requête en boucle, queries `react-query` correctement invalidées après mutation
- **Mobile drawer** : se ferme bien après navigation
- **Section color bar** : visible sur toutes les pages

## Livraison

Corrections directes en plusieurs vagues thématiques :

1. **Vague 1 — Shell & navigation** : `Admin.tsx` (doublon Marketing/Bannières, fermeture drawer mobile au clic), uniformisation headers
2. **Vague 2 — Pages "données" lourdes** : Produits, Commandes, Clients, Stock, Préparations, Colissimo (tableaux + bulk actions + responsive)
3. **Vague 3 — Pages "config"** : Checkout, Notifications, Chatbot, WooCommerce, Paramètres, Audit (formulaires, save buttons, validation)
4. **Vague 4 — Pages "contenu"** : Pages, Média, Marketing, Design, Dashboard (preview, drag&drop, color pickers)
5. **Récap final** : liste des corrections par page + captures éventuelles si problème visuel résiduel

## Hors scope

- Refonte fonctionnelle (nouvelles fonctionnalités) → seulement corrections + polish premium
- Migrations DB (sauf si bug bloquant découvert)
- Edge functions (sauf si erreur runtime détectée)

Je commence par la **Vague 1** dès approbation.
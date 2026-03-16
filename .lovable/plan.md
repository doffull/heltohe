
## Ajout des pages légales — CGV, Politique de confidentialité, Cookies, Retours & Échanges, Mentions Légales

### Approche

Les pages légales seront créées comme des **pages statiques dédiées** avec leur propre layout propre (pas de sidebar/HUD), accessibles via des routes fixes (`/cgv`, `/confidentialite`, `/cookies`, `/retours`, `/mentions-legales`). Elles seront affichées dans le footer du site.

Pas de base de données nécessaire — le contenu légal standard sera intégré directement dans des composants React, avec possibilité de personnalisation via les paramètres admin plus tard.

### Fichiers à modifier/créer

| Fichier | Action |
|---|---|
| `src/pages/legal/CGV.tsx` | Nouveau — Conditions Générales de Vente |
| `src/pages/legal/Confidentialite.tsx` | Nouveau — Politique de confidentialité |
| `src/pages/legal/Cookies.tsx` | Nouveau — Politique cookies |
| `src/pages/legal/Retours.tsx` | Nouveau — Retours & Échanges |
| `src/pages/legal/MentionsLegales.tsx` | Nouveau — Mentions légales |
| `src/App.tsx` | Ajouter les 5 routes `/cgv`, `/confidentialite`, `/cookies`, `/retours`, `/mentions-legales` |
| `src/components/layout/MainLayout.tsx` | Ajouter section "Informations légales" dans le footer avec les 5 liens |

### Structure des pages légales

Chaque page aura :
- Un layout minimaliste avec `MainLayout` (header + footer)
- Un contenu structuré avec titres (h1, h2), paragraphes, listes
- Design cohérent avec le site (typographie, couleurs)
- Contenu générique conforme au droit français e-commerce, personnalisable

### Contenu inclus

- **CGV** : objet du contrat, produits, prix, commande, paiement, livraison, droit de rétractation, garanties, responsabilité
- **Confidentialité (RGPD)** : responsable traitement, données collectées, finalités, durée conservation, droits utilisateurs, cookies
- **Cookies** : types de cookies (essentiels, analytiques, marketing), durées, comment les gérer
- **Retours & Échanges** : délai légal 14 jours, procédure de retour, remboursement, exceptions
- **Mentions légales** : éditeur du site, hébergeur, directeur publication, SIRET (à remplir), TVA

### Footer

Ajout d'une 5ème colonne (ou section séparée en bas de footer) "**Informations Légales**" avec les liens :
- Mentions légales
- CGV
- Politique de confidentialité
- Politique cookies
- Retours & Échanges

Le footer actuel a 4 colonnes en grid — on ajoutera les liens légaux dans la barre de copyright en bas (ligne 669-680), pour ne pas casser la mise en page actuelle.

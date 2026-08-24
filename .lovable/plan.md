# Rendre les pages légales (CGV, Mentions légales…) éditables en un clic

## Constat (vérifié)

- Les 5 pages légales (`/cgv`, `/mentions-legales`, `/confidentialite`, `/cookies`, `/retours`) ont leur texte **écrit en dur dans le code** : `src/pages/legal/CGV.tsx` contient les articles 1 à 10 en JSX. Seules les informations société (nom, SIRET, adresse, emails) viennent des réglages via `useLegalInfo`.
- L'Éditeur Live existe déjà (`VisualEditorPanel`, `InlineEditable`, `EditableText`) et son sélecteur de page propose une entrée « Légal » pointant vers `/legal/cgv` — mais **aucune route `/legal/cgv` n'existe** et aucun texte des pages légales n'est éditable.
- Les pages custom créées depuis /admin/pages sont, elles, déjà éditables via le Page Builder.

## Ce qui sera fait

1. **Contenu légal stocké en base**, plus en dur : chaque page légale devient une liste de sections (titre + texte), initialisée avec le texte actuel pour ne rien perdre.

2. **Édition en un clic** sur le site : quand l'Éditeur Live est ouvert (admin connecté), un simple clic sur un titre d'article ou un paragraphe le rend modifiable, avec ✓ / ✕ pour valider ou annuler. Aujourd'hui il faut un double-clic : le déclencheur passe au clic simple pour tous les textes inline.

3. **Ajouter / supprimer / réordonner** les articles directement sur la page : bouton « + Ajouter un article » entre les blocs, poignée de déplacement et suppression sur chaque bloc.

4. **Le sélecteur de page de l'Éditeur Live** listera les 5 pages légales séparément (CGV, Mentions légales, Confidentialité, Cookies, Retours) avec les bonnes routes, plus les pages custom déjà créées — donc toutes les pages existantes sont atteignables et éditables depuis le même outil.

5. **Sauvegarde** : même comportement que le reste de l'éditeur (bouton « Sauver » + auto-save), avec bouton « Réinitialiser au texte d'origine » par page.

6. Les champs société (SIRET, RCS, TVA, adresse, emails) restent pilotés par Admin > Paramètres > Légal et continuent de s'insérer automatiquement dans les textes via des variables (ex. `{{societe}}`, `{{email_contact}}`).

## Détails techniques

- Nouveau réglage `legalPages` dans `design_settings` : `{ cgv: { title, lastUpdated, sections: [{ id, heading, body }] }, mentionsLegales: {...}, ... }`, écrit via `updateDesignSettings` (déjà en place, aucun nouveau schéma de table).
- Nouveau composant `src/pages/legal/LegalPageRenderer.tsx` : rend les sections depuis les réglages, avec fallback sur les contenus par défaut extraits dans `src/pages/legal/defaultLegalContent.ts` (reprise mot pour mot des JSX actuels). Les 5 fichiers de page deviennent de fines enveloppes autour de ce renderer.
- `InlineEditable.tsx` : `onDoubleClick` → `onClick` (gardé sous condition `isOpen && isAdmin`, donc aucun impact visiteur).
- Nouveau `EditableRichBlock` (titre + corps multiligne) réutilisant `InlineEditable`, plus contrôles d'ajout/suppression/ordre visibles uniquement en mode éditeur.
- `PageSwitcher.tsx` : remplacement de l'entrée unique « Légal » par les 5 routes réelles (`/cgv`, `/mentions-legales`, `/confidentialite`, `/cookies`, `/retours`).
- Substitution de variables via `useLegalInfo` (fonction de rendu de template côté client, pas de changement d'écriture).
- Vérification finale en preview : édition d'un article de CGV, ajout d'un article, sauvegarde, rechargement.

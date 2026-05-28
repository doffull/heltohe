## Objectif

Enrichir le builder des "Sections personnalisées de la page d'accueil" avec deux nouveaux types de blocs : **Catégories** et **Popup déclenché par bouton**.

---

## 1. Nouvelle section `categories`

**Éditeur admin (PageBuilder.tsx)**
- Nouveau bouton "Catégories" dans la barre d'ajout.
- Champs:
  - Titre du bloc (optionnel)
  - Sélection multi-choix des catégories à afficher (cases à cocher chargées depuis `useCategories`)
  - Nombre de catégories visibles (input number, défaut = toutes celles sélectionnées)
  - Colonnes (2 / 3 / 4 / 6)
  - Style (carte image, icône + libellé, bandeau)
  - Afficher le nombre de produits (toggle)

**Rendu public (PageRenderer.tsx)**
- Nouveau composant `CategoriesSection` qui charge les catégories choisies, applique l'ordre & la limite, et rend une grille cliquable (navigation vers la page catégorie correspondante via le routeur existant).

---

## 2. Nouvelle section `popup_button`

Bouton inséré dans la page qui, au clic, ouvre une popup configurée intégralement depuis l'éditeur (autonome, sans dépendre de `newsletter_popups`).

**Éditeur admin**
- Bouton:
  - Libellé, style (primary / outline / ghost / link), taille, icône optionnelle, alignement (gauche / centre / droite), couleur de fond et texte.
- Popup:
  - Type de contenu : `image`, `vidéo`, `texte riche`, `formulaire newsletter`, `code promo`, `HTML libre`
  - Titre, sous-titre, image/vidéo (FileDropZone), texte (Textarea)
  - CTA secondaire (label + URL) optionnel
  - Couleurs fond / texte / accent
  - Taille (sm / md / lg / fullscreen)
  - Animation d'apparition (fade / slide-up / zoom)
  - Fermeture: bouton croix, clic extérieur, touche Echap (toggles)
  - Affichage automatique en plus du clic (toggle + délai en secondes, fréquence en jours via localStorage)
  - Champs formulaire (si type = newsletter): email obligatoire, prénom optionnel, label CTA, message de succès → enregistre dans `newsletters` via `subscribeToNewsletter` (source = `popup`)
  - Code promo (si type = promo): code à révéler + bouton copier

**Rendu public (PageRenderer.tsx)**
- Nouveau composant `PopupButtonSection`:
  - Affiche le bouton stylé
  - Gère l'état d'ouverture via shadcn `Dialog`
  - Rend le contenu selon `popupType`
  - Implémente l'auto-ouverture, la fréquence (clé localStorage `popup-section-{id}`), et les options de fermeture
  - Le formulaire newsletter réutilise `subscribeToNewsletter`

---

## Détails techniques

**Fichiers modifiés**
- `src/hooks/usePages.ts` — étendre l'union `PageSection.type` avec `'categories' | 'popup_button'`.
- `src/components/admin/PageBuilder.tsx` — ajouter les 2 entrées dans `SECTION_TYPES` + 2 nouveaux blocs d'édition (avec sélection multi-catégories via `useCategories`).
- `src/components/page/PageRenderer.tsx` — ajouter `CategoriesSection` et `PopupButtonSection` (+ branches dans le `switch`).
- `src/components/home/ProductSections.tsx` — non modifié (les sections custom sont rendues séparément).

**Pas de migration DB nécessaire** : `pages.sections` est `jsonb`, les nouveaux types y sont stockés librement. Idem pour `designSettings.homeCustomSections`.

**Réutilisations**
- `useCategories()` pour la liste des catégories.
- `subscribeToNewsletter()` pour le formulaire newsletter de la popup.
- `Dialog` (shadcn) pour la popup, `FileDropZone` pour les médias.

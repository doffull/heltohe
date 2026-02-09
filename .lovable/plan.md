

## Plan : Images mobile distinctes pour Hero et Sidebar + Sidebar mobile automatique

### Contexte
Actuellement :
- Le **Hero slider** supporte deja un champ `mobileImage` dans le type `HeroSlide` et dans l'admin, et `Home.tsx` l'utilise correctement. Cette partie fonctionne deja.
- La **sidebar** utilise une seule image (`sidebarImage`) pour desktop et mobile -- pas de champ mobile specifique.
- La **sidebar sur mobile** ne s'ouvre pas automatiquement comme sur desktop : il faut cliquer sur un bouton en bas a gauche. Le comportement auto-open avec delai et fermeture par croix n'existe que pour le desktop.

### Ce qui sera fait

#### 1. Image mobile distincte pour la Sidebar
- Ajouter un champ `mobileSidebarImage` dans le type `DesignSettings` (src/types/index.ts)
- Ajouter une valeur initiale dans `initialData.ts`
- Dans l'admin Sidebar (AdminDesign.tsx), ajouter un second FileDropZone sous l'image du mannequin : "Image mobile (optionnel)" avec le texte "Si vide, l'image desktop sera utilisee"
- Dans `MainLayout.tsx`, utiliser `mobileSidebarImage` quand `isMobile` est true, sinon `sidebarImage`

#### 2. Sidebar mobile avec auto-ouverture et croix
Reproduire le comportement desktop sur mobile :
- La sidebar mobile s'ouvre automatiquement apres le delai configure (`sidebarReappearDelay`)
- Ajouter une croix (X) visible sur le panneau mobile pour le fermer
- Apres fermeture manuelle, la sidebar reapparait apres le delai configure (par defaut 60 secondes = 1 minute)
- Le bouton flottant en bas a gauche reste disponible comme raccourci

### Details techniques

**Fichiers modifies :**

| Fichier | Modification |
|---|---|
| `src/types/index.ts` | Ajout de `mobileSidebarImage?: string` dans `DesignSettings` |
| `src/data/initialData.ts` | Ajout valeur par defaut vide |
| `src/pages/admin/AdminDesign.tsx` | Ajout FileDropZone "Image mobile" dans la section mannequin |
| `src/components/layout/MainLayout.tsx` | Utiliser `mobileSidebarImage` sur mobile + auto-open mobile sidebar + bouton croix mobile |
| `src/hooks/use-mobile.tsx` | Importe dans MainLayout (deja disponible) |

**Logique sidebar mobile :**
```text
Page d'accueil chargee
  |
  v
Attente du delai initial (3s ou min(reappearDelay, 3s))
  |
  v
Sidebar mobile s'ouvre automatiquement (slide depuis la gauche)
  |
  v
Utilisateur ferme via croix (X)
  |
  v
Attente du delai configure (sidebarReappearDelay, defaut 60000ms = 1min)
  |
  v
Sidebar reapparait
```


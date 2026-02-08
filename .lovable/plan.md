
# Gestion avancee du design dans l'admin

## Vue d'ensemble

Ajout d'une nouvelle page d'administration **"Design"** (`/admin/design`) regroupant la gestion visuelle complete du site : upload drag-and-drop pour les medias, configuration du hero slider parallax multi-plans, gestion du logo, et parametrage de la sidebar (photo mannequin, barres de stats).

## Prerequis : Stockage de fichiers

Avant tout, il faut creer un **bucket de stockage** pour heberger les fichiers uploades (images, videos, audio). Une migration SQL creera le bucket `media` avec les politiques RLS appropriees (lecture publique, ecriture admin uniquement).

## Fonctionnalites detaillees

### 1. Composant Drag & Drop Upload reutilisable

Un composant `FileDropZone` sera cree pour etre reutilise partout dans l'admin :
- Zone de drop visuelle avec indication "Glissez vos fichiers ici"
- Support des formats image (JPG, PNG, WEBP), video (MP4, WEBM) et audio (MP3, WAV)
- Preview en temps reel apres upload (miniature image, lecteur video/audio)
- Barre de progression pendant l'upload
- Upload vers le bucket de stockage, retourne l'URL publique

### 2. Hero Slider Parallax - Gestion multi-plans

La section "Hero Slider" permettra de configurer chaque slide avec 3 couches parallax :
- **Arriere-plan** (fond) : image/video de fond
- **Plan intermediaire** : element decoratif optionnel (ex: texture, forme)
- **Premier plan** : sujet principal (ex: mannequin, produit)

Pour chaque slide existante, on ajoute :
- Upload drag-and-drop pour chaque couche
- Champs texte (titre, sous-titre, CTA)
- Couleur d'accentuation
- Reordonnancement par drag ou boutons haut/bas
- Ajout/suppression de slides

Le type `HeroSlide` sera etendu avec les champs `backgroundMedia`, `midgroundMedia`, `foregroundMedia`.

### 3. Gestion du Logo

Section dediee permettant :
- Upload drag-and-drop du logo
- Preview en direct
- Activation/desactivation de l'affichage
- Parametres de style (taille, position, animation)

### 4. Gestion de la Sidebar (panneau gauche)

Section pour configurer :
- **Photo du mannequin** : upload de l'image de fond de la sidebar via drag-and-drop
- **Barres de stats** : modifier les labels (ex: "DURABILITE", "PRIX", "FASHION"), ajuster les valeurs (0-100) via des sliders, ajouter/supprimer des barres
- Preview en direct des modifications

## Details techniques

### Fichiers a creer

1. **`src/components/admin/FileDropZone.tsx`** : composant drag-and-drop reutilisable utilisant l'API native HTML5 drag & drop + upload vers le stockage
2. **`src/pages/admin/AdminDesign.tsx`** : page principale avec onglets (Hero Slider, Logo, Sidebar)
3. **`src/hooks/useFileUpload.ts`** : hook pour gerer l'upload de fichiers vers le bucket storage

### Fichiers a modifier

1. **`src/pages/admin/Admin.tsx`** : ajouter la route `/admin/design` et l'entree dans la sidebar admin
2. **`src/types/index.ts`** : etendre `HeroSlide` avec les champs parallax (`backgroundMedia`, `midgroundMedia`, `foregroundMedia`) et ajouter `sidebarImage` a `DesignSettings`
3. **`src/data/initialData.ts`** : mettre a jour les valeurs par defaut
4. **`src/components/home/HeroSlider.tsx`** : modifier le rendu pour afficher les 3 couches parallax avec des vitesses de defilement differentes
5. **`src/components/layout/Sidebar.tsx`** : utiliser `sidebarImage` depuis les design settings au lieu d'une image codee en dur
6. **`src/context/AppContext.tsx`** : s'assurer que les nouveaux champs sont persistes

### Migration SQL

```text
1. Creer le bucket storage "media" (public)
2. Ajouter la politique RLS : lecture publique, ecriture pour les admins
3. Ajouter la colonne "sidebar_image" a la table design_settings
```

### Architecture du composant FileDropZone

```text
FileDropZone
  Props:
    - accept: string[] (types MIME acceptes)
    - onUpload: (url: string) => void
    - currentFile?: string (URL du fichier actuel)
    - folder: string (sous-dossier dans le bucket)
  
  Comportement:
    1. onDragOver/onDragEnter -> etat visuel "drop zone active"
    2. onDrop -> extraire le fichier, valider le type
    3. Upload vers storage bucket "media/{folder}/{filename}"
    4. Recuperer l'URL publique
    5. Appeler onUpload(url)
```

### Structure de la page AdminDesign

```text
AdminDesign
  Tabs:
    [Hero Slider] [Logo] [Sidebar]
  
  Hero Slider:
    - Liste des slides existantes (cards draggables)
    - Pour chaque slide :
      - 3 zones de drop (fond, intermediaire, premier plan)
      - Champs titre, sous-titre, CTA, couleur accent
    - Bouton "Ajouter une slide"
  
  Logo:
    - Zone de drop pour le logo
    - Switch afficher/masquer
    - Sliders position et taille
  
  Sidebar:
    - Zone de drop pour l'image du mannequin
    - Section "Barres de stats" :
      - Pour chaque barre : input label + slider valeur
      - Boutons ajouter/supprimer
    - Preview miniature
```

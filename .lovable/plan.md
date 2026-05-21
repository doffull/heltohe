## Problème identifié

1. **Les sections personnalisées ne s'affichent pas** sur la page d'accueil parce qu'elles ne sont jamais sauvegardées en base. Le rendu existe bien dans `src/pages/Home.tsx` (lignes 363-370 via `PageRenderer`), mais `settingsToDb()` dans `src/hooks/useDesignSettings.ts` ne mappe que les champs connus : le champ `homeCustomSections` est silencieusement supprimé lors de l'`upsert`. Au rechargement, `dbToSettings()` renvoie `undefined` → tableau vide → rien à afficher.

2. **Les médias sont gérés par URL** dans `src/components/admin/PageBuilder.tsx` (Image, Vidéo, Slider, Hero background). Tu veux pouvoir uploader ou drag & drop, comme dans le reste du back-office (le composant `FileDropZone` existe déjà et utilise le bucket `media` via `useFileUpload`).

## Plan

### 1. Persister `homeCustomSections` en base

- Migration SQL :
  - Ajouter `home_custom_sections JSONB NOT NULL DEFAULT '[]'::jsonb` sur `public.design_settings`.
  - Recréer la vue `public.design_settings_public` pour exposer cette colonne (lecture publique).
- `src/hooks/useDesignSettings.ts` :
  - Dans `dbToSettings()` : `homeCustomSections: (d.home_custom_sections as any) ?? []`.
  - Dans `settingsToDb()` : `home_custom_sections: (s as any).homeCustomSections ?? []`.
- `src/types/index.ts` : déclarer `homeCustomSections?: PageSection[]` sur `DesignSettings` pour supprimer les casts `as any`.
- `src/components/admin/HomeCustomSectionsEditor.tsx` :
  - Après `updateDesignSettings`, appeler `flushDesignSettings()` pour forcer la persistance immédiate (sinon le debounce + rechargement peut effacer l'état).
  - Conserver le bouton « Enregistrer » + ajouter un toast d'erreur si l'upsert échoue.

### 2. Auto-affichage sur la home

Le rendu est déjà branché dans `Home.tsx`. Une fois la persistance corrigée, toute section ajoutée et enregistrée apparaîtra automatiquement à la suite des blocs principaux (`data-home-block="custom"`). Aucune action manuelle de publication ne sera requise.

### 3. Upload / drag & drop partout dans le PageBuilder

Dans `src/components/admin/PageBuilder.tsx`, remplacer les `<Input placeholder="URL...">` par le composant existant `FileDropZone` (déjà drag & drop + upload Supabase Storage + preview image/vidéo) :

- **Section Hero** : champ `backgroundImage` → `FileDropZone accept={['image']} folder="home/hero"`.
- **Section Image** : champ `url` → `FileDropZone accept={['image']} folder="home/images"`.
- **Section Vidéo** : champ `url` → `FileDropZone accept={['video']} folder="home/videos"` (on garde un petit toggle pour autoriser une URL YouTube si besoin, sinon on supprime).
- **Section Slider** : remplacer le `Textarea` « URLs (une par ligne) » par une liste dynamique de `FileDropZone` (« + Ajouter une image », réordonnable, suppression par image).
- Les autres types (title, subtitle, text, products) restent inchangés.

### 4. Convention globale

Désormais, **toute nouvelle interface admin manipulant un média** (image / vidéo / audio / logo / favicon / bannière) doit utiliser `FileDropZone` (ou un wrapper équivalent basé sur `useFileUpload`). Plus aucun champ `URL d'image` saisi à la main, sauf cas spécifique (vidéo YouTube embed).

### Fichiers touchés

- `supabase/migrations/<timestamp>_home_custom_sections.sql` (nouveau)
- `src/hooks/useDesignSettings.ts`
- `src/types/index.ts`
- `src/components/admin/PageBuilder.tsx`
- `src/components/admin/HomeCustomSectionsEditor.tsx`

### Vérifications après implémentation

- Ouvrir Admin → Icônes & Sections d'accueil → ajouter une section Image via drag & drop → Enregistrer → aller sur `/` : la section doit apparaître.
- Rafraîchir la page d'accueil : la section persiste.
- Tester slider avec 3 images uploadées et une vidéo MP4 uploadée.

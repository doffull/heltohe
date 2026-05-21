## Objectifs

1. Améliorer le formulaire produit avec des boutons IA partout (sous-titre, description, entretien, attributs, nom de couleur automatique, image → vidéo 10s).
2. Corriger le bug : la section personnalisée remontée dans l'admin ne change pas d'ordre sur la page d'accueil.
3. Corriger le chevauchement des boutons du header en mode admin sur desktop.

---

## 1. Bug ordre des sections home (cause racine)

`HomeBlocksEditor` sauvegarde `homePageBlocks` via `updateDesignSettings({ homePageBlocks })`, mais **ce champ n'est pas mappé** dans `src/hooks/useDesignSettings.ts` (ni dans `dbToSettings`, ni dans `settingsToDb`). Résultat : l'ordre est perdu au prochain rechargement, la page home retombe sur `DEFAULT_BLOCKS` et place les customs en bas.

**Correction :**
- Migration : ajouter colonne `home_page_blocks jsonb NOT NULL DEFAULT '[]'::jsonb` sur `design_settings` + recréer la vue `design_settings_public`.
- `useDesignSettings.ts` : ajouter le mapping aller-retour `homePageBlocks ↔ home_page_blocks` (même pattern que `homeCustomSections`).
- `src/types/index.ts` : ajouter `homePageBlocks?: { id: string; visible: boolean }[]`.

Aucun changement nécessaire dans `Home.tsx` ni `HomeBlocksEditor.tsx` (la logique de fusion est déjà correcte).

---

## 2. Améliorations IA sur le formulaire produit

Création d'une edge function unifiée + boutons IA inline.

### a. Edge function `product-ai-helpers` (nouvelle)
Actions exposées (`action` dans le body) :
- `subtitle` → sous-titre court à partir du nom/catégorie
- `description` → description longue à partir de l'image (vision Gemini)
- `material` → matière estimée depuis l'image
- `care` → instructions d'entretien depuis matière/image
- `attributes` → renvoie 4-6 paires { key, value } techniques depuis l'image
- `color-name` → renvoie un nom poétique pour un hex (ex: `#1a3c2a` → "Vert Forêt")

Modèle : `google/gemini-2.5-flash` (texte) et `google/gemini-2.5-pro` quand image fournie.

### b. Edge function `generate-product-video` (nouvelle)
- Reçoit l'image principale du produit, génère une vidéo de 10s max via le tool agent `videogen` (ou fallback Lovable AI image-to-video si dispo). Comme l'API video n'est pas exposée côté gateway, **on utilisera une animation Ken Burns CSS-to-MP4 via `ffmpeg` dans l'edge function ?** → non réalisable sans binaire. **Solution retenue** : l'edge function appelle `google/gemini-3-pro-image-preview` pour générer 3-4 keyframes animées (zoom progressif, rotation légère), puis renvoie un **GIF animé** ou une séquence à monter en `<video>` HTML5 via canvas côté client (MediaRecorder → webm 10s). Le webm est uploadé dans `products/videos` via Supabase Storage et stocké dans `formData.videoUrl`.

### c. Composants UI
- Réutiliser `AiTextButton` (déjà existant) → étendre les `field` autorisés : ajouter `material`, `care`, `attributes_bulk`.
- Créer `AiColorNameButton` : à côté du champ "Nom de la couleur", génère le label depuis le hex courant.
- Créer `AiAttributesButton` : bulk-fill du bloc attributs (efface + insère 4-6 entrées).
- Créer `AiProductVideoButton` : à côté du `FileDropZone` vidéo. Désactivé tant qu'aucune image principale. Affiche une progress bar pendant la génération.
- Brancher les boutons existants `AiTextButton` pour `subtitle` et `description` (déjà compatibles, juste à insérer dans le JSX).

### d. Auto-naming couleur lors de la sélection
Dans le bloc "Add new color" du `ProductForm` : ajouter un `useEffect` qui, dès que `newColor` change et que `newColorLabel` est vide, déclenche un debounce 500ms appelant `color-name`. Le résultat préremplit `newColorLabel` (modifiable par l'admin).

---

## 3. Header : chevauchement des boutons en mode admin

Sur 1576px (lg) en admin connecté, on a 9 boutons d'action (Search, Bot, Cart, User, Admin, Bell, Mail, Lang, MegaMenu) **+** la nav 8 liens **+** logo, tous dans un container `max-w-7xl` (1280px). D'où le chevauchement.

**Corrections dans `MainLayout.tsx` ligne ~277, 317, 343 :**
- Élargir le container header de `max-w-7xl` à `max-w-[1600px]` (et conserver `max-w-7xl` sur non-admin).
- Quand `isAdmin`, basculer la nav sur `hidden xl:flex` au lieu de `lg:flex` pour libérer de la place jusqu'à 1280px, OU regrouper les boutons admin (Bell, Mail, Notifs) dans un `DropdownMenu` "Admin" unique à partir de `lg:` et < `2xl:`.
- Solution retenue : **regrouper Bell + Mail + Admin link dans un menu déroulant "Admin"** (`DropdownMenu` shadcn) quand `< 2xl`, afficher individuellement à `2xl:`. Cela réduit de 3 boutons à 1.
- Réduire le `gap` entre les actions de `lg:gap-3` à `lg:gap-1 xl:gap-2`.

---

## Fichiers touchés

**Backend / migration**
- `supabase/migrations/<ts>_home_page_blocks_column.sql`
- `supabase/functions/product-ai-helpers/index.ts` (nouveau)
- `supabase/functions/generate-product-video/index.ts` (nouveau)
- `supabase/config.toml` : `verify_jwt = false` pour les 2 nouvelles fonctions

**Frontend**
- `src/hooks/useDesignSettings.ts` : mapping `homePageBlocks`
- `src/types/index.ts` : type `homePageBlocks`
- `src/components/admin/ProductForm.tsx` : boutons IA inline + auto-naming couleur + bouton vidéo IA
- `src/components/admin/AiColorNameButton.tsx` (nouveau)
- `src/components/admin/AiAttributesButton.tsx` (nouveau)
- `src/components/admin/AiProductVideoButton.tsx` (nouveau)
- `src/components/layout/MainLayout.tsx` : largeur container + regroupement boutons admin en dropdown

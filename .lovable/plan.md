
# Plan — UX cleanup + Hero Slider AI tools

## 1. Floating buttons cleanup (visiteurs)

**Chatbot dans le header**
- Supprimer le bouton flottant `ChatBotWidget` (bas-droite).
- Ajouter dans `MainLayout` Header un bouton « Assistant » (icône `Bot` + petit label « Aide ») qui ouvre la fenêtre de chat existante.
- La fenêtre de chat (panel) reste affichée en bas-droite, mais le déclencheur vit dans le header.
- Visible pour tous (visiteurs + admin).

**Bouton « S'abonner » bas-gauche (au-dessus de tout)**
- Nouveau composant `SubscribeFab` rendu dans `MainLayout`, position `fixed bottom-6 left-6 z-[70]`.
- Icône enveloppe + label « S'abonner » ; ouvre une petite popup avec champ email → insert dans `newsletters`.
- Caché si l'utilisateur est admin (admin garde la cloche notifications + outils).
- Caché aussi sur la home quand le sidebar mobile est ouvert (pour ne pas se chevaucher avec le bouton « ouvrir panneau »), réapparait sinon.

**Côté admin**
- La cloche notifications (bas-droite) et le toggle Visual Editor restent en place, intacts.

## 2. Hero Slider — fix + IA + génération d'images

**Bug object-fit**
- Cause : `Home.tsx` (utilisé par `/`) construit ses slides en hardcodant `object-cover` et `bg-cover` ; il ignore `slide.objectFit / objectPosition / mobileObjectFit / mobileObjectPosition`.
- Fix : passer ces 4 champs dans la projection `heroSlides` et les appliquer via `style={{ objectFit, objectPosition }}` sur la balise `<img>` / `<video>` (et remplacer le `bg-cover` du conteneur background par une `<img>` avec style).
- Vérifier également le panneau d'édition admin : le mini-aperçu (16:9) doit aussi refléter le `objectFit` choisi.

**Boutons IA (gain de temps)**
- Nouvelle edge function `generate-slide-text` (Lovable AI, modèle `google/gemini-3-flash-preview`).
  - Input : `{ field: 'title' | 'subtitle' | 'description' | 'cta', context, tone? }`.
  - Output JSON via tool-calling : `{ value: string }`.
- Dans `AdminDesign > HeroSliderTab`, ajouter un petit bouton ✨ « IA » à côté de chaque champ (Titre, Sous-titre, Texte CTA) : clic → génère et remplit le champ. Toast d'erreur si rate-limit (429) / quota (402).
- Mêmes boutons IA réutilisables sur les futurs champs description.

**Génération d'images IA pour slides**
- Nouvelle edge function `generate-slide-image` (Lovable AI image, `google/gemini-2.5-flash-image`).
  - Input : `{ prompt, aspectRatio? }`. Output : `{ url }` (upload du base64 dans le bucket `media`, retour de l'URL publique).
- Dans `HeroSliderTab`, à côté de chaque `FileDropZone` (Fond / Intermédiaire / Premier plan / Mobile), ajouter un bouton ✨ « Générer avec IA » qui ouvre une mini-popup :
  - Champ « Description de l'image » + bouton « Générer ».
  - Aperçu, puis « Utiliser » → enregistre l'URL dans le slide.

## 3. Sidebar mobile — fullscreen

Dans `MainLayout` :
- Sur mobile, le panneau gauche (`sidebar-left-panel`) passe de `w-[85%] sm:w-[320px]` à `w-screen h-screen` (vrai plein écran) tant que `< lg`.
- Garder le bouton de fermeture en haut à droite, plus visible (taille augmentée, contraste sur fond image).
- Sur desktop : comportement inchangé (`lg:w-[35%]`).

## 4. Header compact quand sidebar ouverte (desktop)

Symptôme : les liens de catégories se chevauchent quand le sidebar pousse le header (le header passe à `lg:ml-[35%]` mais les items de nav gardent leur `gap-8`).

Fix dans `MainLayout` :
- Quand `sidebarActive`, appliquer une classe « compact » sur la nav et les actions :
  - `gap-8` → `gap-3 xl:gap-5`
  - texte de nav `text-sm` → `text-xs`, `tracking-wider` conservé
  - cacher les éléments non essentiels en deçà de `xl` : champ recherche replié, sélecteur de langue masqué `xl:block`, label « FRANÇAIS » caché.
- Vérifier qu'à 1280–1440 px le header ne déborde plus.

## Détails techniques

- Edge functions : créer `supabase/functions/generate-slide-text/index.ts` et `supabase/functions/generate-slide-image/index.ts`. Pas de `verify_jwt` custom requis (par défaut Lovable). CORS standard. Validation Zod du body.
- Image upload dans bucket `media` (existant, public) sous `slides/ai/{uuid}.png`.
- Composant client réutilisable `AiTextButton` (champ → IA) et `AiImageButton` (popup → IA → URL) dans `src/components/admin/`.
- Pas de migration DB requise.
- Aucun changement au comportement admin (cloche, visual editor inchangés).

## Fichiers touchés (estimés)

- `src/components/layout/MainLayout.tsx` — header chatbot trigger, FAB subscribe, sidebar mobile fullscreen, header compact.
- `src/components/layout/ChatBotWidget.tsx` — exposer ouverture via prop / contexte (retirer le bouton flottant interne, garder la fenêtre).
- `src/components/layout/SubscribeFab.tsx` — nouveau.
- `src/pages/Home.tsx` — appliquer `objectFit`/`objectPosition` au hero.
- `src/pages/admin/AdminDesign.tsx` — boutons IA texte + IA image dans `HeroSliderTab`.
- `src/components/admin/AiTextButton.tsx`, `AiImageButton.tsx` — nouveaux.
- `supabase/functions/generate-slide-text/index.ts` — nouveau.
- `supabase/functions/generate-slide-image/index.ts` — nouveau.

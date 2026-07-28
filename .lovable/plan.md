## Diagnostic

J'ai inspecté la base et voici l'état réel :

- **Hero** : 1 slide sauvegardé avec une vidéo `media/hero/background/…mp4` — normalement OK.
- **Home** : 2 sections, 3 sections custom, 12 blocs de page — normalement OK.
- **Produits** : **20 produits sur 63 n'ont pas d'image** (`image` NULL ou vide). Ils tombent donc sur le placeholder gris — c'est la source principale de vos "images manquantes".
- **Bucket `media`** : public ✅ (les URLs sont donc accessibles aux visiteurs).
- Aucune URL `blob:` ou `data:` en base (pas de fuite de références temporaires).

Le problème dominant n'est donc pas la publication elle-même, mais des **médias qui n'ont jamais été enregistrés en base** (produits sans image + potentiellement quelques URLs de sections/blocs pointant vers des fichiers supprimés du bucket).

## Plan d'action

### 1. Nouveau tableau de bord "Audit médias" (`/admin/media-audit`)
Une page qui **scanne tout le site en un clic** et liste :
- Produits sans image principale + galerie vide (les 20 identifiés).
- Slides Hero, sections home, blocs de page, bannières, catégories, looks, presets — toute URL qui pointe vers `media/...` puis fait un HEAD pour détecter les 404.
- URLs `blob:` / `data:` / `file:` (jamais publiables) si elles réapparaissent.
- Nombre total de médias cassés par zone, avec bouton "Aller corriger" qui ouvre directement l'admin correspondant.

### 2. Garde-fou anti-URL temporaire à la sauvegarde
Dans les hooks de sauvegarde (`useDesignSettings`, `useProducts`, blocs home, page builder) : rejeter avec un toast d'erreur toute URL commençant par `blob:`, `data:`, ou `file:` avant écriture en base. Cela empêche définitivement le cas "ça marche en preview, cassé en prod" pour les nouveaux médias.

### 3. Fallback plus propre côté rendu
`SafeImage` / `SafeVideo` sont déjà en place, mais je vérifie que **tous** les rendus critiques (Hero, ProductCard, galerie, bannières, sections custom, blocs de page) les utilisent, et j'ajoute un log discret (via `clientErrorLogger`) quand un média échoue en prod — pour tracer les futurs cas.

### 4. Rapport immédiat
Après la première exécution du scan, je vous fournis la liste précise des 20 produits sans image et de toute autre URL cassée, pour que vous puissiez les corriger en masse via l'outil d'import d'images produits déjà en place (dossier → produit).

## Détails techniques

- Le scan HEAD est fait côté client avec `fetch(url, { method: 'HEAD' })` et une limite de concurrence (10 requêtes parallèles) pour ne pas saturer.
- Ajout de la validation d'URL dans `useDesignSettings.ts::settingsToDb`, `useProducts.ts` (upsert), `useHomeBlocks.ts` — pas de changement de schéma.
- Aucune modification du bucket, des policies RLS ou des données existantes : cette étape est purement diagnostique + préventive. Les corrections des 20 produits se feront ensuite via les outils d'import déjà présents.

## Ce que ce plan ne fait PAS
- Ne re-uploade pas automatiquement des images (impossible sans savoir lesquelles).
- Ne modifie pas le pipeline de publication Lovable (rien à corriger de ce côté-là, la publication reflète bien la base).

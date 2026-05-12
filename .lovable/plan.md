## Objectifs

1. **Header desktop** : tous les icônes (recherche, aide, panier, compte, admin, notifs, messages, langue) doivent rester visibles sans débordement, et le header doit être glossy & flottant en permanence (transparent sur l'accueil).
2. **Sidebar** : retirer le bloc Newsletter en bas du panneau latéral.
3. **Accueil** : ajouter une section "Parallaxe / Vidéo Promo" juste sous les catégories, configurable depuis l'admin Design.

---

## 1. Header desktop — responsive & glossy flottant

Fichier : `src/components/layout/MainLayout.tsx` + `src/components/ui/mini-navbar.tsx`.

**Cause du problème actuel** : à 1024–1366px avec sidebar ouverte (`lg:ml-[35%]`), la `MiniNavbar` est limitée à `max-w-6xl` mais coincée dans 65% de la largeur. La nav centrale + 8 icônes ne tiennent plus → certains icônes (admin, notifs, mail, langue) sont rognés.

**Corrections** :
- Réduire intelligemment quand `sidebarActive` :
  - cacher la nav principale en `lg` (`lg:hidden xl:flex`) lorsque sidebar ouverte, ou la mettre dans un menu déroulant compact.
  - réduire les paddings/icônes (`h-8 w-8`) pour tous les boutons quand `sidebarActive`.
  - ajouter `flex-wrap` désactivé + `min-w-0` sur le bloc nav, et `shrink-0` sur le bloc actions (déjà présent).
- Augmenter `max-w-6xl` → `max-w-7xl` et utiliser `w-[calc(100%-2rem)]`.
- S'assurer que les boutons "Aide", "Langue" et les badges admin sont masqués sous `xl` quand sidebar active (déjà partiellement le cas — étendre).

**Glossy flottant permanent** : dans `MiniNavbar.tsx`
- Toujours floating : déjà `fixed/sticky` dans MainLayout.
- Glossy : remplacer `bg-background/85` par un effet verre :
  - `bg-gradient-to-b from-background/70 to-background/40`
  - `backdrop-blur-xl backdrop-saturate-150`
  - `ring-1 ring-foreground/10` + `shadow-[0_8px_32px_-12px_hsl(var(--foreground)/0.25)]`
  - bordure `border-border/30`
- Si `transparent` (homepage) : fond `bg-foreground/5` (très léger) + même blur, sans border opaque, pour rester lisible sur images claires comme sombres.
- Conserver le morph chamfer existant.

---

## 2. Retirer la Newsletter du sidebar

Fichier : `src/components/layout/MainLayout.tsx` (lignes ~718–721).

- Supprimer le bloc :
  ```
  <div className="absolute bottom-0 left-0 right-0 z-20">
    <SidebarNewsletter />
  </div>
  ```
- Retirer l'import `SidebarNewsletter`.
- Le toggle "Newsletter dans la sidebar" dans `NewsletterPopupsManager.tsx` n'a plus d'effet visuel : on supprime ce bloc UI (le switch + ses 2 inputs) pour éviter la confusion. Les pop-ups newsletter restent intactes.
- Le composant `src/components/layout/SidebarNewsletter.tsx` peut rester en repo (non importé) — pas de suppression de fichier.

---

## 3. Section Parallaxe / Vidéo Promo sous les catégories

**3a. Nouveau composant** `src/components/home/PromoParallax.tsx`
- Lit depuis `designSettings.promoParallax` :
  ```ts
  {
    enabled: boolean,
    mediaType: 'image' | 'video',
    mediaUrl: string,
    mobileMediaUrl?: string,
    title?: string,
    subtitle?: string,
    ctaLabel?: string,
    ctaUrl?: string,
    height: string,        // ex '60vh'
    overlayOpacity: number // 0–1
  }
  ```
- Si `enabled=false` ou pas de média → ne rend rien (espace réservé par défaut désactivé).
- Image : effet parallaxe via `background-attachment: fixed` (desktop) avec fallback `scroll` mobile.
- Vidéo : `<video autoplay muted loop playsinline>` plein conteneur.
- Overlay sombre + texte/CTA centré, design Industrial Luxury (chamfer, Helvetica-MP, tokens).

**3b. Insertion accueil** : `src/views/HomeView.tsx`
```
<CategoryGrid />
<PromoParallax />
<ProductSections />
```
Ajouter export dans `src/components/home/index.ts`.

**3c. Types** : `src/types/index.ts`
- Étendre `DesignSettings` avec `promoParallax?: PromoParallaxConfig`.

**3d. Defaults** : `src/data/initialData.ts` (ou hook `useDesignSettings`)
- Valeur par défaut désactivée pour ne pas casser les sites existants.

**3e. Onglet admin Design** : `src/pages/admin/AdminDesign.tsx`
- Ajouter dans `NAV_ITEMS` :
  ```
  { key: 'promo-parallax', label: 'Promo / Parallaxe', icon: ImagePlay, desc: 'Image ou vidéo sous les catégories' }
  ```
- Nouveau composant `PromoParallaxTab` dans le même fichier :
  - Switch "Activer"
  - Select image / vidéo
  - `FileDropZone` pour média desktop + média mobile
  - Champs titre, sous-titre, CTA (label + URL)
  - Slider hauteur (40–100 vh)
  - Slider opacité overlay
  - Aperçu live mini 16:9
- Brancher dans le switch des onglets.

---

## Détails techniques

- Aucun changement DB : `promoParallax` vit dans `design_settings` JSON existant (suit le pattern `topBanner`, `headerNavItems`).
- Tokens uniquement (pas de couleurs raw).
- Mobile-first 360px : la nav du header masque déjà les icônes via `hidden md:`/`hidden lg:`. Vérifier que rien ne déborde à 360.
- Pas de migration ni d'edge function.

## Hors périmètre

- Pas de refonte fonctionnelle de la newsletter (les pop-ups restent).
- Pas de modification du Hero Slider ni de la section Catégories.

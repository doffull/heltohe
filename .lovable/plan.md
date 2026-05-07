## 1 · Génération IA étendue (Hero Techwear)

Étendre `AiTextButton` pour accepter de nouveaux `field` :
- `slide_name` — nom interne de la slide
- `badge_line1` / `badge_line2` — badge MODEL
- `cta_primary` / `cta_secondary` — libellés des deux CTA

Backend `supabase/functions/generate-slide-text/index.ts` :
- Étendre `FIELD_GUIDES` avec les 5 nouvelles entrées (consignes courtes, MAJUSCULES pour badges/CTA, ton mode/luxe FR).
- Conserver le contract tool-call `return_text`.

Front `TechwearHeroTab.tsx` :
- Ajouter un `<AiTextButton>` à côté des champs : nom de la slide, badge ligne 1, badge ligne 2, CTA principal texte, CTA secondaire texte.
- Le `context` envoyé inclut le nom de la slide active + produit lié (si présent) pour des suggestions cohérentes.

## 2 · CTA Hero Techwear : design glossy + positionnement libre

### Modèle de données (frontend uniquement, stocké dans `techwearHero.slides[].ctaStyle`)
Étendre `TechwearHeroSlideData` avec un objet optionnel `ctaStyle` :
```ts
ctaStyle?: {
  variant: 'glossy' | 'glass' | 'neon' | 'metal' | 'outline' | 'minimal';
  size: 'sm' | 'md' | 'lg' | 'xl';
  radius: 'none' | 'sm' | 'md' | 'pill';
  // Position relative à la zone image (en %), mobile et desktop séparés
  position: {
    desktop: { x: number; y: number; layout: 'row' | 'column' };
    mobile:  { x: number; y: number; layout: 'row' | 'column' };
  };
  gap: number; // px
  // Couleurs personnalisables (override)
  primaryBg?: string; primaryFg?: string;
  secondaryBg?: string; secondaryFg?: string;
}
```

### Rendu (`TechwearHero.tsx`)
- Remplacer le bloc actuel `.hw-cta-primary / .hw-cta-secondary` par un conteneur positionné en `absolute` au-dessus de l'image lorsqu'un `ctaStyle.position` est défini (sinon fallback inline actuel).
- Ajouter une classe `hw-cta-{variant}` avec styles dans `index.css` :
  - `glossy` : dégradé blanc→argent + reflet `::before`, ombre douce.
  - `glass` : `backdrop-blur-md` + bord translucide.
  - `neon` : bord lumineux accent + glow.
  - `metal` : dégradé acier + grain subtil.
  - `outline` / `minimal` : variantes simples.
- Tous respectent les tokens HSL (`--foreground`, `--background`, `--accent`).

### Admin (`TechwearHeroTab.tsx`)
Nouvelle carte **« Design des CTA »** sous la section CTAs :
- Sélecteur de variant (6 vignettes).
- Sliders size / radius / gap.
- Color pickers (primaire/secondaire).
- Mini éditeur de position : 2 sliders X (0–100 %) et Y (0–100 %) pour Desktop + Mobile, plus toggle row/column.
- Bouton **« Suggestions IA »** appelant un nouveau endpoint `generate-cta-style` qui renvoie 3 presets (variant + couleurs + size). L'edge function utilise `google/gemini-2.5-flash` avec tool-call `return_styles` (array de 3 styles).
- Aperçu live des deux boutons en haut de la carte.

## 3 · Éditeur d'icônes fixes (Home FAB)

### Schéma DB (migration)
Nouvelle table `home_fab_buttons` :
```sql
id uuid pk, label text, icon text (lucide name),
action_type text check in ('route','external','roulette','voice','chat','newsletter'),
action_value text, -- href ou identifiant
variant text default 'glossy',
position_desktop jsonb default '{"corner":"br","x":24,"y":24}',
position_mobile  jsonb default '{"corner":"br","x":16,"y":16}',
visible_desktop bool default true, visible_mobile bool default true,
sort_order int default 0, is_active bool default true,
created_at, updated_at
```
RLS : lecture publique si `is_active`, écriture admin (`has_role(auth.uid(),'admin')`).

### Front
- `useHomeFabButtons.ts` (React Query) — fetch + cache.
- Refonte de `FabStack.tsx` :
  - Si la table renvoie des entrées, on les rend (positionnées par `corner`+offsets, layout vertical).
  - Sinon fallback aux 3 FAB hard-codés actuels (rétrocompatible).
  - Chaque bouton mappe `action_type` → onClick (ouverture roulette / voice / chat, navigation, ouverture popup newsletter).
  - Variants visuels partagés avec le système des CTA (glossy/glass/neon/metal/outline/minimal) via classe utilitaire commune.

### Admin
Nouvelle page `src/pages/admin/AdminHomeIcons.tsx` (entrée sidebar « Icônes Accueil ») :
- Liste drag-handle réordonnable (`sort_order`).
- Form par bouton : label, icône (picker parmi ~40 icônes lucide), action (select + champ), variant, visibilités desktop/mobile, position (corner BL/BR/TL/TR + offsets X/Y en px) avec aperçu temps réel sur cadre 360 × 640 et 1280 × 720.
- Actions : ajouter / dupliquer / supprimer / activer.

## 4 · Détails techniques

- Pas de modif du Sidebar ni du checkout.
- Toute couleur via tokens HSL et `cn()` ; aucune couleur brute en dehors des color pickers utilisateur.
- Edge functions ajoutées : `generate-cta-style` (réutilise pattern `generate-slide-text`).
- `IconPicker.tsx` : composant léger qui mappe nom → composant lucide via `import * as Icons from 'lucide-react'`.
- Mobile-first 360 px : positions par défaut conservatrices (coin bas-droit) ; éditeur permet override.

## 5 · Hors périmètre

- Pas d'A/B testing sur les CTA.
- Pas de génération d'icônes SVG personnalisées (uniquement choix dans la lib lucide).
- Pas de migration des FAB existants vers la DB (fallback automatique : l'admin ajoute manuellement ce qu'il veut).

## Fichiers

**Création**
- `supabase/functions/generate-cta-style/index.ts`
- `supabase/migrations/<ts>_home_fab_buttons.sql`
- `src/hooks/useHomeFabButtons.ts`
- `src/components/admin/IconPicker.tsx`
- `src/components/admin/HomeFabEditor.tsx`
- `src/pages/admin/AdminHomeIcons.tsx`

**Modification**
- `supabase/functions/generate-slide-text/index.ts` (nouveaux champs)
- `src/components/admin/AiTextButton.tsx` (élargir le type `field`)
- `src/components/admin/TechwearHeroTab.tsx` (boutons IA + carte Design CTA)
- `src/components/home/TechwearHero.tsx` (rendu CTA positionnés + variants)
- `src/index.css` (classes `.hw-cta-glossy`, `.hw-cta-glass`, `.hw-cta-neon`, `.hw-cta-metal`, `.hw-cta-outline`, `.hw-cta-minimal`)
- `src/components/layout/FabStack.tsx` (lit la nouvelle table, fallback intact)
- `src/types/index.ts` (`ctaStyle` sur slide + types FAB)
- `src/App.tsx` + sidebar admin (route `/admin/home-icons`)

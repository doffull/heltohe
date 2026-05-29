## Objectif

Dans **Admin → Templates de pages → Éditer un template → onglet Disposition**, chaque bloc affiche directement (sans clic supplémentaire) des contrôles pour personnaliser son **libellé/texte**, sa **typographie** et ses **couleurs**, en plus des réglages existants (colonne, span, visibilité, variante).

## Ce qui change pour l'utilisateur

Pour chaque bloc de la liste Disposition, la carte se déplie en un panneau de réglages toujours visible avec :

- **Texte** : libellé personnalisé (`label`) — utile pour Title, Collab subtitle, Category tag, CTA add-to-cart, Find size, Description (titre de section), Trust badges, Related products, Material, Stock status, Btn wishlist/share. Pour `custom_html` : zone de texte HTML.
- **Typographie** :
  - Police (Google Font, liste existante `GOOGLE_FONTS` + option « Hériter du thème »)
  - Taille (px)
  - Graisse (300 → 900)
  - Casse (normal / UPPER / lower / Capitalize)
  - Espacement des lettres (px)
  - Alignement (gauche / centre / droite)
- **Couleurs** :
  - Couleur du texte (color picker + champ hex, avec « Hériter »)
  - Couleur de fond (idem)
  - Couleur d'accent / bordure (pour CTA, badges, dividers)

Tous les champs sont stockés dans `block.props` (déjà existant dans `TemplateBlock`), donc **aucune migration DB**.

## Détails techniques

### 1. Types (`src/config/templatePresets.ts`)

Étendre `TemplateBlock.props` avec une convention typée optionnelle :

```ts
export interface BlockStyleProps {
  label?: string;            // texte personnalisé
  html?: string;             // pour custom_html
  fontFamily?: string;       // '' = hérite
  fontSize?: number;
  fontWeight?: number;       // 300..900
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;            // '' = hérite
  bgColor?: string;
  accentColor?: string;
}
```

Ajouter `props?: BlockStyleProps & Record<string, any>` (rétro-compatible).

### 2. UI Disposition (`src/pages/admin/AdminPageTemplates.tsx`, fonction `TemplateEditorDialog`, lignes ~432–476)

Sous la ligne actuelle de chaque bloc (col/span/visible/variant), ajouter **une grille de réglages toujours visible** divisée en 3 sous-sections compactes :

```
┌─────────────────────────────────────────────────────────┐
│ [▲▼] Block Title (title)  Col [7] Span [6] [✓] [Var ▼] │
├─────────────────────────────────────────────────────────┤
│ Texte:      [Libellé personnalisé ____________________] │
│ Typo:       Police [Inter ▼]  Taille [42] Graisse [700] │
│             Casse [UPPER ▼] Esp [0] Align [G C D]       │
│ Couleurs:   Texte [■#000] Fond [■hérite] Accent [■…]    │
└─────────────────────────────────────────────────────────┘
```

- Helper `updateBlockProps(id, patch)` qui fait un merge sur `props`.
- Champs `label` / `html` conditionnels selon `b.type` (mapping `BLOCK_HAS_LABEL`, `BLOCK_HAS_HTML`).
- Color inputs avec bouton « Hériter » qui vide la valeur.

### 3. Rendu côté front (templates produit/catégorie)

Identifier le composant qui rend les templates :

```bash
rg "TemplateBlock|layout.blocks" src/components src/pages
```

Dans ce composant de rendu (probablement `TemplateRenderer.tsx` ou similaire), pour chaque bloc :
- Utiliser `b.props.label` (ou `b.props.html`) à la place du texte par défaut quand fourni.
- Construire un `style` inline depuis `b.props` (fontFamily, fontSize+'px', fontWeight, textTransform, letterSpacing+'px', textAlign, color, backgroundColor) en n'incluant **que les clés définies** pour que les valeurs vides héritent du thème.
- Charger la police via `loadGoogleFont(b.props.fontFamily)` (helper déjà existant dans `blockVariants.ts`).

### 4. Presets

Les presets existants continuent de fonctionner (rétro-compat : props vide → hérite du thème). Pas besoin de les modifier.

## Fichiers touchés

- `src/config/templatePresets.ts` — type `BlockStyleProps`
- `src/pages/admin/AdminPageTemplates.tsx` — panneau de réglages dans Disposition
- Composant de rendu de template (à identifier en build) — application des `props` au rendu

## Hors scope

- Pas de drag & drop visuel (gardé pour plus tard)
- Pas de migration DB
- Pas de modification du thème global ni des autres onglets (Thème / Typo)

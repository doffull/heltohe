# Design du footer : couleurs, image de fond, mises en page et 6 presets

## Ce que l'on pourra faire depuis Admin → Footer

Un nouvel onglet **Design** dans la page Footer, avec :

- **Couleurs** : fond, couleur du texte, couleur des titres de colonnes, couleur des liens, couleur au survol, couleur des bordures/séparateurs, couleur d'accent (bouton newsletter).
- **Image de fond** : upload ou URL, avec cadrage (`cover` / `contain` / `repeat`), position (haut/centre/bas), effet `parallax` optionnel, opacité et voile sombre/clair par-dessus pour garder le texte lisible.
- **Dégradé** : option fond dégradé (deux couleurs + angle) à la place ou au-dessus de la couleur unie.
- **Typographie & espacements** : taille de texte (S/M/L), casse des titres (normal / MAJUSCULES), épaisseur du trait de séparation, padding vertical (compact / normal / spacieux), largeur du contenu (contenu / pleine largeur).
- **Bordures & effets** : bordure haute (aucune / fine / épaisse / biseau 45° maison), effet verre dépoli, ombre haute.
- **Alignement** : gauche / centré (utile pour les dispositions minimalistes).

## 6 presets prédéfinis

Chaque preset applique une disposition **et** un habillage complet en un clic, avec un aperçu miniature. Un preset ne remplace jamais les contenus (liens, textes) : il ne touche qu'à la mise en page et au style.

1. **Industrial** — la disposition actuelle : grille 4 colonnes, fond sombre, titres en majuscules, biseaux 45°.
2. **Minimal Ligne** — une seule ligne centrée : logo, liens légaux, copyright. Pas de colonnes ni newsletter.
3. **Éditorial** — grande zone de marque à gauche (50 %), colonnes serrées à droite, fond clair, texte ample.
4. **Newsletter First** — bandeau newsletter pleine largeur en haut du footer, puis colonnes de liens compactes en dessous.
5. **Vitrine** — image de fond plein cadre avec voile sombre, contenu centré, réseaux sociaux en grand.
6. **Compact Mobile** — colonnes en accordéons repliables sur mobile, une seule colonne, très peu de padding.

La disposition choisie s'applique au footer réel du site, et le comportement mobile reste géré (empilement, cibles tactiles 44 px).

## Détails techniques

- `src/types/index.ts` : extension de `FooterConfig` avec un bloc `design` (couleurs, `bgImage`, `bgSize`, `bgPosition`, `bgOverlay`, `bgOpacity`, `gradient`, `textScale`, `padding`, `contentWidth`, `align`, `borderTop`, `glass`, `uppercaseTitles`) et un champ `layout` (`industrial | minimal | editorial | newsletter-first | showcase | compact`) + `preset`.
- Nouveau fichier `src/config/footerPresets.ts` : les 6 presets (layout + design), utilisés à la fois par l'admin (boutons + miniatures) et comme valeurs par défaut du rendu.
- `src/components/layout/Footer.tsx` : lecture de `cfg.design` et `cfg.layout`. Le markup actuel devient le cas `industrial` ; les autres layouts sont des variantes de grille dans le même composant (sous-composants internes pour `minimal`, `editorial`, `newsletter-first`, `showcase`, `compact`). Styles appliqués via variables CSS inline (`--footer-fg`, `--footer-link`, etc.) pour rester compatible avec le système de tokens.
- `src/pages/admin/AdminFooter.tsx` : nouvel onglet « Design » (color pickers, upload image via `useFileUpload` sur le bucket `media`, sliders opacité/padding, sélecteurs), plus une grille de 6 cartes de presets. Même stratégie de sauvegarde qu'aujourd'hui (barre de sauvegarde + auto-save debouncé) et aperçu live mis à jour.
- Aucune migration : tout est stocké dans la colonne `footer_config` (jsonb) déjà exposée par la vue publique.
- Rétrocompatibilité : sans `design` ni `layout`, le rendu reste exactement celui d'aujourd'hui.

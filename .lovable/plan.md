## Essai Virtuel par IA

Ajout d'un système d'essai virtuel sur la page produit. Le client uploade sa photo, indique sa corpulence, et l'IA génère une image de lui portant le produit sélectionné.

### Flux utilisateur

1. Sur la page produit (`ProductDetail.tsx` + `ProductTemplateRenderer.tsx`), un bouton **"Essayer virtuellement"** (style Industrial Luxury, chamfer-hud) apparaît à côté/sous le CTA panier.
2. Clic → ouverture d'un `Dialog` plein écran avec 3 étapes :
   - **Étape 1** — Upload photo (drag & drop + caméra mobile), conseils (plein pied, fond neutre).
   - **Étape 2** — Corpulence : taille (cm), poids (kg), morphologie (slim / regular / athletic / curvy), genre. Pré-remplie depuis le profil si connecté.
   - **Étape 3** — Génération : appel à l'Edge Function, loader animé, puis affichage de l'image générée avec actions (Télécharger, Refaire, Partager, Ajouter au panier).

### Backend (Lovable AI)

Nouvelle Edge Function `virtual-tryon` :
- Reçoit : photo utilisateur (base64), image produit (URL), couleur sélectionnée, corpulence, nom/catégorie produit.
- Récupère l'image produit, la convertit en base64.
- Appelle Lovable AI Gateway `/v1/images/generations` avec `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — édition multi-image, idéal pour le try-on).
- Prompt construit côté backend : "Place the [catégorie produit] from image 2 onto the person in image 1, matching their body shape ([morphologie], [taille]cm, [poids]kg). Preserve the person's face, pose, and background. Realistic fit and shadows."
- Gestion erreurs 429 (rate limit) et 402 (crédits) → toast côté client.
- Retourne l'image générée (base64 ou URL temporaire).

### Stockage

- Bucket `media` existe déjà et est public. Les images générées sont uploadées dans `media/virtual-tryon/{userId|session}/{timestamp}.png` pour permettre téléchargement/partage.
- Pas de nouvelle table requise (optionnel : `tryon_sessions` pour historique — non inclus dans ce plan, peut être ajouté plus tard).

### Frontend — fichiers

**Nouveaux :**
- `src/components/product/VirtualTryOnButton.tsx` — bouton + ouverture du dialog.
- `src/components/product/VirtualTryOnDialog.tsx` — dialog multi-étapes (stepper).
- `src/hooks/useVirtualTryOn.ts` — appel `supabase.functions.invoke('virtual-tryon')`, gestion état/erreurs.

**Modifiés :**
- `src/pages/ProductDetail.tsx` — insertion du bouton sous `ProductOptions`.
- `src/components/product/ProductTemplateRenderer.tsx` — nouveau type de bloc `virtual_tryon_btn` rendu dans le template.
- `src/config/templatePresets.ts` — ajout du bloc dans le catalogue éditable.

**Backend :**
- `supabase/functions/virtual-tryon/index.ts` (nouvelle).
- `supabase/config.toml` — `[functions.virtual-tryon] verify_jwt = false`.

### Design (Industrial Luxury)

- Bouton : `chamfer-hud` outline, label `ESSAYER VIRTUELLEMENT`, icône `Sparkles` ou `Camera`.
- Dialog : fond `bg-background/95 backdrop-blur`, stepper minimal avec barres 45°, typo Helvetica-MP existante, accents `--primary`.
- Loader génération : pulse HUD style, message "L'IA prépare votre essayage…" (~5-15s typique).

### Hors périmètre

- Pas d'historique persistant des essais (peut être ajouté ensuite).
- Pas de partage social automatique (juste téléchargement + lien copiable).
- Pas de try-on vidéo / temps réel.
- Pas de modification du flux panier.

### Coûts & limites à signaler à l'utilisateur

L'essai virtuel utilise Lovable AI (génération d'images) : chaque essai consomme des crédits du workspace. En cas de forte affluence, prévoir une limite par session (ex. 3 essais / heure / IP) — à confirmer si vous le souhaitez.

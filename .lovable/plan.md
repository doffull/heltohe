# Essai virtuel — corrections et améliorations

## Problèmes constatés

1. **Redirection vers l'accueil** quand le client prend une photo via mobile : l'input `capture="environment"` ouvre l'appareil photo natif, et au retour, l'état React du dialogue est perdu (le composant se démonte/remonte selon le cycle de vie mobile). De plus, les `<button>` internes n'ont pas de `type="button"` — si un parent ajoute un `<form>` plus tard, ils submitent.
2. **Pas de choix de cadrage** : l'IA génère en aveugle, sans savoir si on veut un plan pied ou hanches.
3. **Upload pas assez clair** : drag-and-drop existe déjà mais n'est pas mis en avant, et le bouton mélange caméra et fichier.

## Plan d'action

### 1. Fiabiliser la prise/upload de photo (`src/components/product/VirtualTryOnButton.tsx`)

- Ajouter `type="button"` sur **tous** les `<button>` du dialogue (défense en profondeur contre un futur `<form>` parent).
- **Séparer** les deux actions en deux boutons distincts :
  - **« Choisir un fichier »** → input `type="file" accept="image/*"` (sans `capture`) — ouvre la galerie / explorateur de fichiers, ne quitte pas la page sur desktop.
  - **« Prendre une photo »** → input séparé avec `capture="environment"` — uniquement visible sur mobile (`md:hidden`).
- Rendre la **zone de drop** plus visible (label « Glissez-déposez votre photo ici »), avec feedback visuel pendant le drag (`onDragEnter`/`onDragLeave` → bordure accent).
- **Persister l'état** du dialogue dans `sessionStorage` (étape courante, `userPhoto` en base64, taille/poids/genre/morpho/cadrage) pour survivre à un remount post-caméra mobile. Restaurer à l'ouverture si présent ; nettoyer à la fermeture/succès.
- Empêcher la fermeture accidentelle du dialogue tant qu'une génération est en cours (`onOpenChange` ignoré si `loading`).

### 2. Choix du cadrage

- Nouvelle étape **« Cadrage »** intégrée dans l'étape « Corpulence » (pas d'étape supplémentaire pour rester rapide).
- Trois options en boutons style HUD existant :
  - **Plan pied (full body)**
  - **Plan hanches (mi-cuisse)**
  - **Buste / haut du corps**
- État `framing: 'full' | 'hips' | 'bust'` envoyé à l'edge function.

### 3. Edge function (`supabase/functions/virtual-tryon/index.ts`)

- Accepter `framing` dans le body (`'full' | 'hips' | 'bust'`).
- Adapter le prompt Gemini :
  - `full` → « Output a single photorealistic **full-body** photograph from head to feet. »
  - `hips` → « Output a photograph framed **from head to mid-thigh** (hips level). »
  - `bust` → « Output a photograph framed **from head to waist** (upper body only). »
- Validation : si `framing` absent, fallback à `full`.

### 4. Robustesse

- Logger en console (`console.error`) l'erreur d'invoke avant de retourner à l'étape « body », pour faciliter le debug si le bug réapparaît.
- Garder le bouton « Refaire » qui rejoue la génération sans repasser par le picker.

## Hors scope

- Pas de changement de modèle IA, pas de touche au flux d'auth, pas de modification UI ailleurs que le bouton et son dialogue.

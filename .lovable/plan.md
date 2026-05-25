# Plan — 5 chantiers

## 1. Gemini 3.5 Pro + auto-update vers la dernière version

**Différence 2.5 vs 3.5 Pro** : 2.5 Pro = génération précédente (stable, large déploiement). 3.5 Pro = dernière itération Google avec meilleur raisonnement, contexte plus long, meilleure vision/PDF. Pour ton cas (extraction maquettes/PDF/WP), 3.5 Pro est plus précis.

**Ce que je change** dans `supabase/functions/_shared/gemini.ts` :
- Variable `GEMINI_MODEL` lisible depuis un secret optionnel `GEMINI_MODEL` (par défaut `gemini-3.5-pro`).
- **Mécanisme auto-update** : un mini-cache (5 min) qui interroge `https://generativelanguage.googleapis.com/v1beta/models?key=...` au démarrage de chaque function froide, filtre les modèles `gemini-*-pro` non-preview, prend le plus récent, et bascule automatiquement dessus. Fallback sur `gemini-3.5-pro` si l'appel échoue.
- Tu n'as **rien à faire** quand Google sort 3.7 ou 4.0 Pro : le site bascule seul sous 5 min.
- Option override manuel : si tu veux figer un modèle, tu ajoutes le secret `GEMINI_MODEL` = nom exact, sinon auto.

## 2. Sécurité de la clé API

État actuel : déjà OK techniquement (la clé est dans Supabase Secrets, jamais exposée au frontend, uniquement lue par les edge functions côté serveur). Mais je vais **renforcer** :
- Ajouter un check explicite que `GEMINI_API_KEY` n'apparaît jamais dans les logs d'erreur (masquage automatique dans `gemini.ts`).
- Ajouter une vérification dans `analyze-product-image`, `parse-products-pdf`, `parse-stock-pdf` que seul un admin authentifié peut les appeler (déjà fait dans certaines, à généraliser).
- Audit : confirmer qu'aucun fichier `src/**` ne référence `GEMINI_API_KEY`.

## 3. Audit + refactor extraction IA (cœur du site)

Périmètre : `analyze-product-image`, `parse-products-pdf`, `parse-stock-pdf`, `product-ai-helpers`, `generate-product-description`, `woocommerce-import`.

**Problèmes identifiés** :
- Code dupliqué de gestion d'erreurs 429/402 dans chaque function.
- Prompts éparpillés, pas de versionning.
- Pas de retry automatique sur erreur transitoire Gemini.
- Pas de validation Zod du JSON retourné par l'IA (parsing fragile).
- WP sync : pas de log structuré, difficile de diagnostiquer un import partiel.

**Refactor proposé** (isolé, zéro impact sur le reste du site) :
- Nouveau module `supabase/functions/_shared/ai-extraction.ts` : helpers `extractProductsFromFile()`, `extractStockFromFile()`, `analyzeMockup()`, avec retry x2, validation Zod, normalisation des champs (tailles, prix, SKU, couleurs).
- Chaque edge function devient un mince wrapper qui appelle ces helpers → moins de 50 lignes par function.
- Nouveau module `_shared/ai-errors.ts` : mapping unifié des erreurs Gemini → réponses HTTP claires en FR.
- WP sync : ajout d'un journal `wp_sync_logs` (table légère) pour tracer chaque produit importé/échoué.

**Garanties d'isolation** : aucun changement aux composants frontend, aux hooks `useProducts`, aux pages admin. Seules les edge functions et la nouvelle table `wp_sync_logs` bougent.

## 4. Création de looks simplifiée

État actuel : `useProductLooks` existe (table `product_looks`), mais probablement pas d'UI fluide.

**À faire** : nouveau composant `LookBuilderDialog` dans `src/components/admin/` :
- Sélection visuelle multi-produits par drag-and-drop ou clic (grille des produits avec checkbox visuelle).
- Upload cover image directement (ou auto-générée depuis le 1er produit).
- Preview live du look avant sauvegarde.
- Bouton "Créer un look" accessible depuis `AdminProducts` (header).

## 5. Bug taille — toutes sélectionnées en même temps

J'ai vérifié le code : `selectedSize` démarre à `null` et le bouton `default` ne s'applique qu'à la taille active. **Le bug visuel vient du CSS** : la variante `default` du bouton et `outline` sont sans doute trop proches visuellement sur ton thème industriel (noir/blanc), donc toutes les tailles **semblent** sélectionnées.

**Fix** :
- Ajouter un état visuel **non-sélectionné** clairement distinct : fond transparent + bordure fine grise, hover = bordure noire.
- État **sélectionné** : fond noir plein + texte blanc + ring.
- État **indisponible** (rupture stock pour cette taille) : barré + cliquable désactivé.
- Vérifier aussi `ProductCard` (carte produit grille) pour s'assurer qu'aucune taille n'est mise en avant par défaut.

## Ordre d'exécution

1. Gemini 3.5 + auto-update + sécurité clé (rapide, débloque tout)
2. Fix tailles (rapide, visible immédiatement)
3. Refactor extraction IA (le plus gros, isolé)
4. Création de looks (UI nouvelle)
5. Audit WP sync + logs

## Risques

- Auto-update modèle : si Google sort un modèle cassé, je garde un fallback `gemini-3.5-pro` dur.
- Refactor extraction : aucun changement de signature côté frontend → zero régression attendue, mais je testerai les 3 flux (mockup, PDF produits, PDF stock) avant de clôturer.
- Quota Google : tu as déjà touché ta spending cap → il faut la relever avant de tester en charge.

# Correction de la page blanche (site en ligne)

## Ce que j'ai constaté

- Sur le site publié (`https://helvetica-mp.lovable.app/` et `/index`), la page est **entièrement vide** : `#root` est vide et le texte de la page est vide.
- Une seule erreur bloquante au démarrage : `supabaseUrl is required.` Elle est levée dès l'initialisation du client backend, avant tout rendu — d'où l'écran blanc total sur toutes les routes.
- Cause confirmée par lecture du fichier de configuration d'environnement du projet : il ne contient plus que les deux clés Google Maps. Les variables du backend (URL du projet, clé publique, identifiant de projet) **ont disparu**, donc le build publié embarque des valeurs vides.

Ce n'est donc pas un bug de code applicatif (les modifications récentes sur les images n'y sont pour rien) : c'est la configuration d'environnement du backend qui manque.

## Correction

1. Restaurer les trois variables d'environnement du backend (URL, clé publique, identifiant de projet) dans le fichier de configuration d'environnement, avec les valeurs du projet Cloud actuel.
2. Ajouter un garde-fou dans l'initialisation du client backend : si l'URL ou la clé est absente, afficher un message d'erreur lisible au lieu de laisser une page blanche (l'app ne doit plus jamais mourir silencieusement au démarrage).
3. Redémarrer le serveur de dev, recharger l'accueil et vérifier qu'il n'y a plus d'erreur au démarrage.
4. Vérifier en navigateur (accueil + une page produit + `/boutique`) que le rendu est complet, puis republier pour que le site en ligne reparte.

## Détails techniques

- Variables à rétablir : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (valeurs connues du projet Cloud : ref `bumfyrfmormisyjletpb` et clé anon publique).
- `src/integrations/supabase/client.ts` est auto-généré : le garde-fou sera ajouté en amont dans `src/main.tsx` (vérification des variables avant montage, avec message d'erreur affiché dans `#root`), afin de ne pas toucher au fichier généré.
- Vérification : `bunx tsgo --noEmit -p tsconfig.app.json`, puis contrôle Playwright de `#root` non vide et absence d'erreur console sur `/`, `/boutique` et une fiche produit.

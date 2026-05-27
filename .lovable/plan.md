## Objectif
Rendre le site stable après chaque update/publication : commandes vocales sans invocation vide, logo/hero/vidéo/produits/design persistants, et chargement plus rapide.

## Ce que je vais corriger

### 1. Micro et commande vocale
- Modifier `src/components/voice/VoiceCommandFab.tsx` pour empêcher toute invocation `voice-command` si aucune voix n’est captée.
- Gérer explicitement les états `no-speech`, `aborted`, `not-allowed`, `network` et les transcripts vides/trop longs.
- Ajouter un auto-restart contrôlé de l’écoute après `no-speech`, sans renvoyer de requête IA.
- Garder une référence stable de la logique de traitement pour éviter les callbacks obsolètes.
- Ne plus relancer le micro si la popup est fermée, si une commande est en cours, ou si le navigateur bloque l’autorisation.

### 2. Persistance réelle du design entre preview et site publié
- Sécuriser `src/context/AppContext.tsx` et `src/hooks/useDesignSettings.ts` pour ne jamais retomber brutalement sur les réglages initiaux quand la base répond lentement.
- Ajouter une sauvegarde complète des réglages design dans la base via un champ JSON global, afin que les nouveaux champs du header, couleurs, hero, blocs homepage, logo, vidéo, etc. ne soient plus perdus faute de colonne dédiée.
- Garder les colonnes existantes pour compatibilité, mais fusionner avec le JSON complet à la lecture.
- Ajouter un cache local uniquement comme filet de sécurité visuel : si la requête design tarde ou échoue, le dernier design connu reste affiché au lieu de disparaître.

### 3. Logo, hero, vidéo et médias robustes
- Centraliser le rendu du logo avec un fallback stable : logo image si disponible, sinon nom du site, dimensions fixes pour éviter les déplacements.
- Renforcer `HeroSlider` : image/vidéo invalide ou lente -> fallback immédiat, poster stable, pas de hero vide.
- Remplacer l’attribut React problématique `fetchPriority` par `fetchpriority` pour supprimer l’erreur console.
- Ajouter une logique de sécurité pour les médias externes cassés : si une image WordPress ou storage échoue, elle bascule proprement sur `/placeholder.svg` sans casser le layout.

### 4. Produits et catégories toujours visibles
- Améliorer `useProducts` et `useCategories` avec cache React Query plus long, retry contrôlé, données précédentes conservées, et fallback visuel si la base met trop de temps.
- Éviter que la page passe par un état vide complet pendant un refresh ou après publication.
- Vérifier les composants homepage qui lisent produits/catégories pour qu’ils affichent soit les données valides, soit un fallback propre — jamais une zone cassée.

### 5. Nettoyage performance
- Définir des options globales React Query : `staleTime`, `gcTime`, retry léger, pas de refetch inutile au focus.
- Différer les requêtes non critiques après le premier affichage : analytics visiteur, chat, roulette, popups/newsletter, widgets flottants.
- Corriger `AnimatePresence mode="wait"` qui anime plusieurs enfants et peut provoquer des comportements visuels instables.
- Réduire le coût initial des animations lourdes sur mobile et respecter les fallbacks.

### 6. Vérification après patch
- Tester la home en mobile et desktop.
- Vérifier console : plus d’erreur `fetchPriority`, plus d’avertissement `AnimatePresence` sur la route principale.
- Vérifier réseau : les requêtes design/produits/catégories restent en cache et les médias cassés ne cassent pas l’UI.
- Tester le micro : silence -> aucune invocation IA, message clair, relance automatique de l’écoute.
- Vérifier que logo, hero, vidéo, couleurs, produits et catégories restent présents après reload.
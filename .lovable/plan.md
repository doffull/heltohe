# Correction définitive de la page blanche en production

## Constat vérifié

- Le site publié répond bien en HTTP 200, mais reste entièrement vide sur Chromium/Chrome et WebKit/Safari iOS.
- L’erreur bloquante est `supabaseUrl is required.` : le bundle publié démarre sans la configuration publique du backend.
- Le garde-fou présent dans `src/main.tsx` ne peut pas intercepter cette panne : l’import statique de `App` charge le client backend avant que le code du garde-fou ne soit exécuté.
- Les variables locales restaurées ne suffisent donc pas à garantir qu’une publication Lovable les embarque.

## Correctif

1. **Sécuriser la configuration de build**
   - Ajouter dans la configuration Vite un repli de production pour les variables publiques indispensables du backend (URL, clé publique et identifiant du projet).
   - Conserver la priorité aux variables d’environnement lorsqu’elles sont présentes.
   - Ne jamais intégrer de clé serveur ou autre secret : la clé publique est conçue pour être envoyée au navigateur et reste protégée par les règles d’accès de la base.

2. **Rendre le garde-fou réellement exécutable**
   - Retirer l’import statique de `App` au démarrage.
   - Vérifier d’abord la présence et la validité de la configuration, puis charger dynamiquement l’application.
   - Si une future configuration est invalide, afficher une erreur lisible au lieu d’un écran blanc.
   - Ajouter une gestion d’erreur au chargement initial afin qu’aucune exception de bootstrap ne laisse `#root` vide.

3. **Valider avant republication**
   - Vérifier le typage et produire un build de production avec un environnement volontairement privé des variables locales, afin de reproduire exactement le scénario qui a cassé le site publié.
   - Tester l’accueil, `/index`, `/boutique` et une fiche produit avec Chromium et WebKit/Safari iOS.
   - Confirmer pour chaque route : contenu visible, `#root` non vide, aucune erreur de démarrage et chargement des données/images.

4. **Republier et contrôler le vrai domaine**
   - Lancer une nouvelle publication après validation.
   - Contrôler directement le site publié sur moteurs Chromium et WebKit, en vue ordinateur et mobile.
   - Ne déclarer la panne corrigée qu’après confirmation du rendu réel en ligne.

## Détails techniques

- Fichiers ciblés : `vite.config.ts` et `src/main.tsx` uniquement.
- Aucun changement de catalogue, design, commande, paiement ou contenu.
- La compatibilité concerne le démarrage commun à Chrome, Safari/iOS, Firefox et Edge ; la vérification automatisée directe couvrira Chromium et WebKit, qui reproduisent déjà tous deux la panne actuelle.

Objectif : garder exactement le même contenu, le même ordre de sections et les mêmes médias sur mobile, tablette et ordinateur, en préservant ce que tu as déjà fait sur mobile comme travail prioritaire.

Plan d’intervention :

1. Sécuriser la sauvegarde globale du design
- Faire passer le bouton “Sauver” de l’éditeur live par le même mécanisme de sauvegarde immédiate que le reste de l’app, pour éviter les états périmés.
- Ajouter/forcer la persistance des champs édités en live, notamment `homeTexts`, car le texte modifié est actuellement utilisé côté interface mais n’est pas envoyé dans la sauvegarde base de données.
- Mettre à jour le cache local après sauvegarde réussie pour éviter qu’un autre appareil ou un changement de vue reparte sur une ancienne version.

2. Unifier l’ordre et la visibilité des sections
- Conserver `homePageBlocks` comme source unique pour l’ordre des sections : catégories, top ventes, nouveautés, sections personnalisées, etc.
- Corriger les chemins où l’éditeur mobile peut modifier localement l’ordre mais où le desktop relit une version différente.
- Quand une section est montée/descendue depuis le téléphone, la même liste sera sauvegardée et relue par ordinateur/tablette.

3. Protéger le travail déjà fait sur mobile
- Ne pas réinitialiser les blocs avec les valeurs desktop par défaut si des blocs sauvegardés existent déjà.
- Si des blocs personnalisés ou images existent, les fusionner sans écraser l’ordre existant.
- Éviter les resynchronisations automatiques qui remplacent les changements locaux récents par un snapshot plus ancien.

4. Supprimer les différences inutiles mobile/desktop pour les contenus édités
- Garder les images, textes, CTAs et sections édités comme valeurs communes à tous les appareils.
- Pour le Hero, vérifier les champs `mobileImage` existants : si le but est “même rendu partout”, le rendu mobile ne doit plus afficher une image différente uniquement parce qu’une image mobile existe, sauf réglage dédié volontaire.
- Les différences purement responsives resteront seulement de la mise en page CSS normale pour que le site reste lisible, mais pas des contenus ou ordres différents.

5. Vérifier le résultat
- Contrôler que la page d’accueil utilise bien le même `homePageBlocks` en mobile, tablette et desktop.
- Vérifier que “Top ventes” reste à la même position après sauvegarde et changement de viewport.
- Vérifier que les textes/images modifiés via l’éditeur live sont inclus dans la sauvegarde.

Fichiers principalement concernés :
- `src/context/AppContext.tsx`
- `src/hooks/useDesignSettings.ts`
- `src/hooks/useHomeBlocks.ts`
- `src/components/visual-editor/VisualEditorPanel.tsx`
- `src/components/visual-editor/tabs/SectionsEditorTab.tsx`
- `src/pages/Home.tsx`
- éventuellement les composants Hero si une image mobile différente force encore un contenu différent.
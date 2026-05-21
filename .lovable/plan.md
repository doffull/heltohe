## Plan d’intervention

1. **Roulette : un seul bouton + affichage 24h**
   - Garder le jeu uniquement dans le menu compact flottant en bas à droite (`UnifiedFab`).
   - Retirer le bouton roulette autonome de la home qui crée le doublon.
   - Conserver l’auto-ouverture avec `auto_open_delay_ms = 8000` et `show_after_dismiss_hours = 24`.
   - Vérifier le comportement après plusieurs refresh :
     - première visite sans cache local : ouverture après 8s ;
     - fermeture/refresh : pas de réouverture avant 24h ;
     - cache/cookies/localStorage conservés : le blocage 24h reste actif.

2. **Accès admin mobile**
   - Corriger la course de chargement des rôles : actuellement `/admin` peut rediriger vers `/` avant que le rôle admin soit fini de charger.
   - Faire attendre l’application jusqu’à ce que session + rôles soient tous les deux prêts avant de décider l’accès admin.
   - Tester sur viewport mobile : clic bouton admin du header, navigation directe `/admin`, refresh sur `/admin`.

3. **Menu header mobile qui clignote**
   - Stabiliser la navbar mobile au-dessus du héros : réduire les transitions inutiles et éviter le changement de forme différé qui peut provoquer un effet de flicker.
   - Vérifier l’ouverture/fermeture du menu mobile sur la home, pendant que la vidéo/hero tourne derrière.

4. **Sidebar gauche mobile opaque**
   - Remplacer le fond transparent du panneau par une vraie surface opaque issue du thème.
   - Garder l’image/vidéo interne visible uniquement dans le panneau, sans voir le héros derrière.
   - Vérifier ouverture/fermeture du panneau sur mobile.

5. **Édition live simplifiée**
   - Supprimer la barre “Admin Drag” du bas sur mobile/visiteur admin, car elle encombre et n’est pas adaptée.
   - Rendre le bouton stylo plus utile : accès clair à l’éditeur live, position mobile propre, sans superposition avec le header ou les CTA.
   - Réduire l’éditeur live aux essentiels : sauvegarder, hero, couleurs, sections principales ; retirer les éléments de positionnement avancés inutiles du parcours principal.

6. **Validation finale**
   - Tester en mobile 360px : home, bouton admin, menu mobile, sidebar, bouton roulette unique, auto-open 8s/24h.
   - Contrôler console et requêtes réseau pour vérifier l’absence d’erreurs critiques.

## Détails techniques

- Le problème admin vient probablement de `AuthContext` : `isLoading` passe à `false` avant la fin de `loadRoles()`, donc `Admin.tsx` voit temporairement `hasAdminPanelAccess = false` et redirige vers `/`.
- Le doublon roulette vient de `Home.tsx` qui rend `<RouletteFab />` en plus de `MainLayout.tsx` qui rend déjà `<UnifiedFab />` avec la roulette intégrée.
- La configuration backend de la roulette est déjà correcte : delay 8000ms, cooldown 24h, réaffichage après 24h.
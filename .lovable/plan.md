## Diagnostic — cause racine confirmée

J'ai chargé le site publié `https://warltkfr.lovable.app/` et inspecté le réseau.
Toutes les requêtes vers `design_settings_public` renvoient **HTTP 401 — `permission denied for table design_settings`** (code Postgres `42501`).

Conséquence directe :
- `useDesignSettings()` retourne `null`
- `AppContext` reste sur `INITIAL_DESIGN_SETTINGS` (valeurs par défaut)
- Donc : `hudLogo = ""` → logo absent, `siteName = "Mon Site"` → titre faux, `heroSlides = []` → hero vide, couleurs et header tombent sur les fallbacks → impression de site « cassé / décalé / sans header / sans images ».

Pourquoi ça marche dans l'aperçu Lovable mais pas en publié : l'aperçu utilise un rôle `sandbox_exec` qui a les droits ; le visiteur final utilise `anon` qui ne les a pas.

Ce que la base contient aujourd'hui :

```text
design_settings        (table) — RLS ON
  GRANTS: sandbox_exec (SELECT, INSERT)        ← anon/authenticated absents
  POLICIES:
    - "Admins can manage design settings"      (ALL)
    - "Public can read design_settings safe columns" (SELECT, anon+authenticated)
       → la policy autorise, mais le GRANT manque → 401

design_settings_public (vue, security_invoker=true)
  GRANTS: sandbox_exec uniquement              ← anon/authenticated absents
```

Postgres exige **les deux** : un GRANT au niveau table + une RLS policy. Il manque le GRANT, d'où le 401.

Le même problème touche aussi `visitor_sessions` (POST 401 observé) — à corriger par cohérence.

## Plan de correction

### 1. Migration SQL — restaurer l'accès public lecture seule

Une seule migration corrige le bug visuel principal :

- `GRANT SELECT ON public.design_settings TO anon, authenticated;`
  (RLS reste activée et la policy existante "Public can read design_settings safe columns" continue de filtrer les colonnes sensibles via la vue).
- `GRANT SELECT ON public.design_settings_public TO anon, authenticated;`
- Vérifier `visitor_sessions` (le POST 401 indique le même schéma de problème) et restaurer les droits `INSERT/UPDATE` cohérents avec sa policy publique existante.

Aucune donnée sensible n'est exposée : la vue `design_settings_public` ne sélectionne que les colonnes d'affichage (logo, couleurs, hero, header, etc.) — les colonnes admin restent dans `design_settings` et seul l'admin peut les lire grâce à la policy "Admins can manage…".

### 2. Garde-fous front-end (anti-régression)

Pour éviter qu'un futur 401 ne casse à nouveau l'affichage :

- `useDesignSettings` : afficher un `console.error` clair si la requête échoue (au lieu d'un null silencieux), et exposer l'`error` dans `AppContext` pour debug.
- `AppContext` : si `dbSettings` est `null` ET qu'on détecte une erreur réseau, retenter une fois après 1,5 s (transitoire réseau).
- Splash screen : ne pas se masquer tant que la première requête `design_settings_public` n'a pas répondu (succès OU erreur), pour éviter le « flash » avec valeurs par défaut.

### 3. Cache & minification (demandes secondaires de l'utilisateur)

À expliquer clairement : **le cache n'est pas la cause** de ce que tu vois. Vite minifie déjà tout le JS/CSS en production et les fichiers servis ont des hashes uniques (`index-ABC123.js`) qui forcent les navigateurs à recharger la nouvelle version dès que tu re-publies. Ajouter un « vide-cache » manuel ne résoudrait rien ici.

Cela dit, pour ta tranquillité, j'ajouterai :

- `<meta http-equiv="Cache-Control" content="no-cache">` sur `index.html` (le HTML de point d'entrée uniquement, pas les assets) → garantit que chaque visiteur voit toujours la dernière publication.
- Un petit utilitaire admin `/admin` → bouton **« Forcer le rechargement »** qui appelle `caches.keys().then(k => k.forEach(caches.delete))` + `location.reload(true)` — utile si jamais un Service Worker s'installait un jour.
- Vérification que `vite.config.ts` active bien `build.minify: 'esbuild'` (défaut) et `build.cssMinify: true` — à confirmer dans la config.

### 4. Vérification

Après application :

1. Recharger `https://warltkfr.lovable.app/` en navigation privée.
2. Vérifier dans le DevTools réseau que `design_settings_public` renvoie **200** avec un JSON contenant `hud_logo`, `hero_slides`, `site_name`, etc.
3. Vérifier visuellement que logo, header, hero, couleurs apparaissent comme dans l'aperçu Lovable.
4. Tester sur Firefox, Chrome, Edge, Safari — l'identité visuelle doit être strictement identique (le bug n'était pas lié au navigateur, c'était un 401 universel).

## Détails techniques

- Migration unique, idempotente (`GRANT … IF NOT EXISTS` n'existe pas en SQL standard mais `GRANT` est sûr à rejouer).
- Aucune modification du schéma, aucune perte de données.
- Aucun changement de RLS policy → la sécurité des colonnes admin (`legal_*`, secrets, etc.) reste intacte parce qu'elles ne sont pas exposées par la vue `design_settings_public`.
- Le composant `HeroErrorBoundary` et le système de logs d'erreurs créés précédemment restent en place (utiles à long terme), mais ils ne sont **pas** la solution — ils ne capturaient pas l'erreur car un 401 réseau ne déclenche pas d'erreur React, juste des données vides.

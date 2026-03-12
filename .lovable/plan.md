
## Problème

Le logo est un PNG blanc. Le thème actuel est clair (fond blanc). Résultat : logo blanc sur fond blanc = invisible.

### Endroits affectés (logos sans filtre adaptatif)

| Fichier | Ligne | Filtre actuel |
|---|---|---|
| `MainLayout.tsx` logo-wrapper (desktop) | ~168 | Aucun |
| `MainLayout.tsx` footer | ~560 | Aucun |
| `HUDOverlays.tsx` HUDLogo | ~134 | Aucun |
| `Sidebar.tsx` | ~39 | `drop-shadow` noir (insuffisant) |
| `App.tsx` SplashScreen | ~89 | `drop-shadow` noir (insuffisant) |

### Solution

Appliquer un filtre CSS universel sur **toutes les instances du logo** :

```
filter: drop-shadow(0 0 0 2px rgba(0,0,0,0.8)) brightness(0)
```

**Stratégie** : utiliser `brightness(0)` pour forcer le logo à s'afficher en noir (ce qui est lisible sur fond blanc), avec un fallback `drop-shadow` noir pour les contextes foncés.

Mais `brightness(0)` serait trop destructif si le logo a des couleurs. La meilleure approche est :
- Ajouter un large `drop-shadow` très contrasté (noir épais + blanc épais) pour créer un halo visible sur tout fond.

Filtre universel optimal :
```css
filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px #fff) drop-shadow(0 0 1px #000) drop-shadow(0 0 3px #000);
```

Cela crée un **halo blanc + contour noir** autour du logo, le rendant visible sur fond blanc ET fond noir.

### Fichiers à modifier

1. **`src/components/layout/MainLayout.tsx`** — ajouter le filtre sur le logo-wrapper (ligne ~168) et le footer (ligne ~560)
2. **`src/components/hud/HUDOverlays.tsx`** — ajouter le filtre sur l'img du HUDLogo
3. **`src/components/layout/Sidebar.tsx`** — renforcer le filtre existant
4. **`src/App.tsx`** — renforcer le filtre du SplashScreen
5. **`src/index.css`** — ajouter une classe utilitaire `.logo-visibility-filter` réutilisable

### Implémentation

Créer une constante de filtre partagée dans un fichier utilitaire, ou simplement harmoniser inline :

```typescript
const LOGO_FILTER = 'drop-shadow(0 0 1px #ffffff) drop-shadow(0 0 2px #ffffff) drop-shadow(0 0 2px #000000) drop-shadow(0 0 4px #000000)';
```

Appliquer ce filtre sur les 5 instances `<img>` du logo.

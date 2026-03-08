

## Problème identifié

Plusieurs champs du design ne survivent pas au rechargement de page parce qu'ils manquent à deux endroits :

1. **Pas de colonnes DB** pour : `sidebar_reappear_delay`, `slider_height`, `site_spacing`, `category_layout` (JSONB)
2. **Pas mappés** dans `settingsToDb()` ni `dbToSettings()` de `useDesignSettings.ts`

### Champs concernés
| Champ TypeScript | Utilisé dans | Statut |
|---|---|---|
| `sidebarReappearDelay` | Sidebar "Réapparition auto" + MainLayout | ❌ non persisté |
| `sliderHeight` | Hero presets + Home.tsx | ❌ non persisté |
| `siteSpacing` | Disposition tab + Home.tsx | ❌ non persisté |
| `categoryLayout` | Catégories tab + CategoryGrid | ❌ non persisté |

---

## Plan

### 1. Migration DB — 4 nouvelles colonnes
```sql
ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS sidebar_reappear_delay integer DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS slider_height text DEFAULT '100vh',
  ADD COLUMN IF NOT EXISTS site_spacing text DEFAULT 'compact',
  ADD COLUMN IF NOT EXISTS category_layout jsonb DEFAULT '{"preset":"portrait","columns":4,"aspectRatio":"3/4","gap":"md"}';
```

### 2. Mettre à jour `useDesignSettings.ts`

Dans `dbToSettings()` : lire les 4 nouveaux champs depuis la DB.

Dans `settingsToDb()` : écrire les 4 champs dans le payload d'upsert.

### 3. Mettre à jour `INITIAL_DESIGN_SETTINGS` dans `initialData.ts`

Ajouter les valeurs par défaut pour ces 4 champs afin que le fallback soit cohérent.

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| Migration SQL | 4 nouvelles colonnes |
| `src/hooks/useDesignSettings.ts` | Mapper les 4 nouveaux champs (read + write) |
| `src/data/initialData.ts` | Valeurs par défaut pour les 4 champs |


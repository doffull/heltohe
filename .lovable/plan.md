
## Problèmes identifiés (audit complet)

### Problème 1 — "Slider de produits" (rotation automatique) : à supprimer
Dans `AdminDesign.tsx` lignes 991-1034, il y a une carte **"Slider de produits"** avec un toggle "Activer le slider automatique", vitesse de rotation, et nombre de produits max. L'utilisateur veut une **seule image fixe** dans la sidebar, pas de rotation multi-produits. → Supprimer cette carte entière.

Dans `SidebarProductHUD.tsx`, la logique `sidebarSliderEnabled`, `sliderProducts`, `hasMultiple`, `activeIndex`, `isTransitioning` doit être simplifiée pour **toujours afficher un seul produit** (le produit survolé / sélectionné, ou le premier produit de la liste).

### Problème 2 — "Réapparition automatique" dupliquée : à fusionner
Dans `AdminDesign.tsx` :
- **Première occurrence** : lignes 1038-1067 (dans une grid `lg:grid-cols-2` avec "Apparence")
- **Deuxième occurrence** : lignes 1101-1132 (dans un `div` séparé avec une autre carte "Apparence")

C'est exactement le même bloc copié deux fois. → Supprimer la deuxième occurrence (lignes 1101-1165), garder uniquement la première.

### Problème 3 — Nom de marque / sous-titre s'affiche même quand vide
Dans `SidebarProductHUD.tsx` lignes 189-194 :
```tsx
{designSettings.sidebarBrandName || 'LVTK6'}   // fallback hardcodé
{designSettings.sidebarBrandSubtitle || 'NOUVELLE ÉDITION'}  // fallback hardcodé
```
Ces fallbacks affichent toujours "LVTK6" et "NOUVELLE ÉDITION" même quand l'utilisateur a tout effacé. → Remplacer par un rendu conditionnel : **n'afficher que si la valeur est non-vide**.

Même correction dans le `ProductSlide` (ligne 49) : `{designSettings.sidebarBrandName || 'LVTK6'}` → conditionnel.

Aussi dans `initialData.ts` lignes 200-201 : les valeurs par défaut `'LVTK6'` et `'NEW EDITION'` doivent être remplacées par des chaînes vides `''` pour que les utilisateurs qui n'ont jamais touché ces champs voient aussi rien.

### Problème 4 — Positionnement nom de marque / sous-titre
Actuellement le nom de marque est dans la **"Top Zone"** (`pt-28`, position fixe en haut) par-dessus le logo header. L'utilisateur veut pouvoir **choisir la position** (haut, milieu, bas).

**Solution** : Ajouter dans `AdminDesign.tsx` un sélecteur de position (3 boutons : Haut / Milieu / Bas) pour le bloc "Identité de marque". Persister dans `designSettings.sidebarBrandPosition` (nouveau champ : `'top' | 'center' | 'bottom'`). Dans `SidebarProductHUD.tsx`, utiliser cette valeur pour rendre le bloc dans la zone correspondante (top / center / bottom).

---

## Fichiers à modifier

| Fichier | Action |
|---|---|
| `src/pages/admin/AdminDesign.tsx` | Supprimer la carte "Slider de produits" ; supprimer le doublon "Réapparition automatique" ; ajouter sélecteur de position brand |
| `src/components/layout/SidebarProductHUD.tsx` | Supprimer logique slider multi-produits ; rendre brandName/brandSubtitle conditionnellement ; respecter `sidebarBrandPosition` |
| `src/data/initialData.ts` | Mettre `sidebarBrandName: ''` et `sidebarBrandSubtitle: ''` par défaut |
| `src/types/index.ts` | Ajouter `sidebarBrandPosition?: 'top' | 'center' | 'bottom'` à `DesignSettings` |
| `src/hooks/useDesignSettings.ts` | Mapper `sidebar_brand_position` en DB ↔ settings |

## Schéma DB
Pas de migration nécessaire — `sidebar_brand_name` et `sidebar_brand_subtitle` sont déjà persistés en DB. Pour `sidebarBrandPosition`, on peut le stocker dans un champ existant JSONB ou utiliser `as any` comme les autres champs dynamiques — pas besoin de nouvelle colonne.

## Résultat
- Sidebar affiche **1 seul produit** (plus de rotation automatique)  
- **1 seul** bloc "Réapparition automatique" dans l'admin  
- Si nom de marque/sous-titre vides → **rien ne s'affiche** sur la sidebar  
- Sélecteur Haut / Milieu / Bas pour positionner les textes de marque sur l'image

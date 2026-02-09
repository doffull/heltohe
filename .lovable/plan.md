

# Corrections Header/Sidebar + Presets Categories + Sidebar delai 10s

---

## Problemes identifies

1. **Header colle au top banner** : Pas d'espace entre le bandeau promo et le header. Le top banner et le header se chevauchent visuellement.
2. **Header rigide** : Quand la sidebar s'ouvre, le header ne se decale pas. La sidebar passe par-dessus le header et le top banner au lieu de les pousser vers la droite.
3. **Sidebar doit apparaitre apres 10 secondes** : Le sidebar doit s'ouvrir automatiquement apres un delai de 10 secondes au lieu d'etre ouvert immediatement.
4. **Categories sur une seule ligne (desktop)** : Les images de categories doivent etre plus petites et tenir sur une seule ligne (4 colonnes) sur desktop, avec la possibilite de changer les dimensions/dispositions dans l'admin.
5. **Presets manquants** : L'utilisateur veut des presets de disposition pour les categories, la sidebar, le hero slider, les hotspots et les bannieres marketing.

---

## 1. Header qui s'adapte a la sidebar

### Fichier : `src/components/layout/MainLayout.tsx`

Le header et le top banner doivent se decaler vers la droite quand la sidebar est ouverte, comme le font deja le `main` et le `footer`.

- **Top banner** : Ajouter `transition-all duration-500` et `sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"`.
- **Logo wrapper** : Meme traitement.
- **Header** : Remplacer le `pl-0 lg:pl-[180px]` par un margin-left sur tout le `<header>` : `sidebarActive ? "lg:ml-[35%]" : "lg:ml-0"` avec transition.
- **Supprimer** la regle `headerPreset === 'classic' && sidebarActive ? "pl-0 lg:pl-[180px]"` qui est insuffisante.
- Ajouter un petit gap entre le top banner et le header si besoin (border-b suffit normalement).

---

## 2. Sidebar avec delai d'apparition de 10 secondes

### Fichier : `src/components/layout/MainLayout.tsx`

- Changer `desktopSidebarOpen` initial de `true` a `false`.
- Ajouter un `useEffect` qui, uniquement sur la page d'accueil, ouvre la sidebar apres 10 secondes :
  ```
  useEffect(() => {
    if (isHomePage) {
      const timer = setTimeout(() => setDesktopSidebarOpen(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [isHomePage]);
  ```
- L'utilisateur peut toujours la fermer avec le bouton X. Le bouton de reouverture reste disponible.

---

## 3. Categories : taille reduite + presets de disposition

### Fichier : `src/pages/Home.tsx`

- Forcer `aspect-[3/4]` a quelque chose de plus compact sur desktop, par exemple `aspect-[4/3]` ou `aspect-[16/9]`, selon le preset choisi.
- Lire un nouveau champ `categoryLayout` dans designSettings qui controle le ratio et le nombre de colonnes.

### Fichier : `src/pages/admin/AdminDesign.tsx` (CategoriesTab)

Ajouter des presets de disposition pour les categories :
- **Grille compacte** : 4 colonnes, ratio 4:3, petites vignettes, tout sur une ligne.
- **Grille carree** : 4 colonnes, ratio 1:1.
- **Grille portrait** : 4 colonnes, ratio 3:4 (actuel).
- **Bande horizontale** : 4+ colonnes, ratio 16:9, style banniere.
- **2 colonnes larges** : 2 colonnes, ratio 16:9.

Chaque preset stocke : `{ columns: number, aspectRatio: string, gap: string }`.

### Fichier : `src/types/index.ts`

Ajouter dans DesignSettings :
```typescript
categoryLayout?: {
  preset: string;
  columns: number;
  aspectRatio: string; // '3/4', '4/3', '1/1', '16/9'
  gap: string; // 'sm', 'md', 'lg'
};
```

---

## 4. Presets pour les autres sections

### Presets Hero Slider (dans HeroSliderTab)
Ajouter quelques presets rapides en haut de l'onglet Hero :
- **Plein ecran** : 100vh, texte en bas a gauche (actuel)
- **Demi-ecran** : 60vh, texte centre
- **Banniere** : 40vh, texte a gauche, compact

### Presets Sidebar (dans SidebarTab)
- **Classique** : Image mannequin + carte produit + hotspots
- **Minimal** : Image seule + bouton CTA
- **Catalogue** : Grille de produits dans la sidebar

### Presets Hotspots (dans HotspotsTab)
- **Mode interactif** : Points cliquables (actuel)
- **Mode vitrine** : Labels statiques
- **Desactive** : Aucun hotspot visible

### Presets Bannieres Marketing (dans HeaderDesignTab > Top Banner)
- **Promo simple** : Texte noir sur fond clair
- **Urgent** : Fond rouge, texte blanc
- **Elegant** : Fond noir, texte dore

Ces presets seront de simples boutons en haut de chaque section qui appliquent des valeurs predefinies en un clic.

---

## Resume technique des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/layout/MainLayout.tsx` | Header et top banner s'adaptent a la sidebar (margin-left dynamique), sidebar ouvre apres 10s |
| `src/pages/Home.tsx` | Categories avec aspect ratio dynamique depuis designSettings |
| `src/types/index.ts` | Ajout `categoryLayout` dans DesignSettings |
| `src/pages/admin/AdminDesign.tsx` | Presets categories + presets hero + presets sidebar + presets hotspots + presets bannieres |
| `src/components/admin/HeaderDesignTab.tsx` | Presets bannieres marketing |

---

## Ordre d'implementation

1. Header et top banner adaptatifs (margin-left sidebar) + sidebar delai 10s
2. Categories : layout dynamique + presets dans l'admin
3. Presets Hero Slider
4. Presets Sidebar
5. Presets Hotspots et Bannieres


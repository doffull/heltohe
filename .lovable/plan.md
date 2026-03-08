
## Plan: Champs Titre & Description du site dans Design & Visuels

### Objectif
Ajouter une section "Identité de marque" dans la page admin **Design & Visuels** permettant de configurer :
- **Nom du site** (ex: "LVTK6 CONCEPT") — utilisé dans le header fallback, le footer, et l'onglet navigateur
- **Slogan / Description courte** — tagline affichée dans le footer et le `<meta description>` pour le SEO
- **Email de contact** — affiché dans le footer et la page À propos
- **Numéro de téléphone** — optionnel

Ces champs sont sauvegardés dans `design_settings` via le hook existant.

---

### 1. Migration DB — 4 nouvelles colonnes `design_settings`

```sql
ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS site_name text DEFAULT 'Mon Site',
  ADD COLUMN IF NOT EXISTS site_tagline text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '';
```

---

### 2. Mise à jour du type `DesignSettings` (`src/types/index.ts`)

Ajouter dans l'interface :
```typescript
siteName?: string;
siteTagline?: string;
contactEmail?: string;
contactPhone?: string;
```

---

### 3. Mise à jour du hook `useDesignSettings.ts`

Dans `dbToSettings()` : mapper `db.site_name → siteName`, etc.  
Dans `settingsToDb()` : ajouter les 4 champs dans le payload.

---

### 4. Nouvelle section dans `AdminDesign.tsx` — onglet **Logo**

Dans l'onglet **Logo** (qui gère déjà l'identité visuelle), ajouter une carte **"Identité de marque"** en première position avec :

```
┌─────────────────────────────────────────────┐
│ Identité de marque                          │
│ Ces informations apparaissent dans votre... │
├─────────────────────────────────────────────┤
│ Nom du site    [________________]           │
│ Slogan         [________________]           │
│ Email contact  [________________]           │
│ Téléphone      [________________]           │
└─────────────────────────────────────────────┘
```

---

### 5. Utilisation des champs dans l'UI

**Footer** (`Footer.tsx`) : remplacer le texte en dur `LVTK6 CONCEPT` par `designSettings.siteName`.

**Header** (`MainLayout.tsx`) : quand pas de logo image (hudLogo vide), afficher `designSettings.siteName` au lieu de `HMP`.

**Document title** : dans `App.tsx` ou un effet dans `AppContext`, faire `document.title = designSettings.siteName` quand la valeur change.

---

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Migration DB | Ajouter 4 colonnes à `design_settings` |
| `src/types/index.ts` | Ajouter 4 champs dans `DesignSettings` |
| `src/hooks/useDesignSettings.ts` | Mapper les 4 nouveaux champs |
| `src/data/initialData.ts` | Ajouter valeurs par défaut |
| `src/pages/admin/AdminDesign.tsx` | Carte "Identité de marque" dans l'onglet Logo |
| `src/components/layout/Footer.tsx` | Utiliser `siteName` dynamiquement |
| `src/components/layout/MainLayout.tsx` | Utiliser `siteName` comme fallback logo |
| `src/context/AppContext.tsx` | `document.title = siteName` via useEffect |

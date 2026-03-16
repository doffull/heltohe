
## Plan : Informations légales configurables depuis Admin > Paramètres

### Analyse de la situation

**`admin_config` table** (colonnes actuelles) : `config_key`, `admin_notification_email`, `colissimo_sender_*` — **aucun champ légal**.

**`design_settings` table** : contient déjà `site_name`, `contact_email`, `contact_phone` — ces champs sont publics (RLS SELECT = true), donc utilisables dans les pages légales.

**`admin_config`** est privée (SELECT admin seulement) → parfait pour stocker SIRET, TVA, forme juridique, adresse légale, capital social, directeur de publication — données sensibles visibles uniquement dans les pages légales publiques.

**Problème** : `admin_config` a une RLS `ALL` pour admins mais **aucune policy SELECT publique**. Pour que les pages légales lisent ces données côté public, il faut soit :
- A) Ajouter une policy SELECT publique sur `admin_config` pour des colonnes spécifiques
- B) Utiliser `design_settings` (déjà SELECT public) pour les données légales

**Décision** : Utiliser **`design_settings`** pour les infos légales — il est déjà public, déjà chargé globalement via `useDesignSettings`, et le site_name/contact sont déjà là. Les champs légaux (SIRET, TVA, etc.) ne sont pas "sensibles" car ils apparaissent sur les pages légales publiques.

### Migration DB : ajouter colonnes légales à `design_settings`

```sql
ALTER TABLE design_settings
  ADD COLUMN IF NOT EXISTS legal_company_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_company_form text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_capital text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_address text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_zip text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_city text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_siret text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_rcs text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_vat text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_director text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_rgpd_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS legal_return_email text DEFAULT '';
```

### Hook `useDesignSettings` — ajouter les nouveaux champs

`src/hooks/useDesignSettings.ts` + `src/types/index.ts` : ajouter les champs `legalCompanyName`, `legalCompanyForm`, `legalCapital`, `legalAddress`, `legalZip`, `legalCity`, `legalSiret`, `legalRcs`, `legalVat`, `legalDirector`, `legalRgpdEmail`, `legalReturnEmail` au type `DesignSettings`.

### Admin > Paramètres — nouvel onglet "Mentions légales"

Dans `AdminSettings.tsx`, ajouter un 4ème onglet **"Légal"** avec :
- Nom de la société / Raison sociale
- Forme juridique (SARL, SAS, auto-entrepreneur...)
- Capital social
- Adresse du siège social (rue, CP, ville)
- SIRET
- RCS
- N° TVA intracommunautaire
- Directeur de publication
- Email RGPD
- Email retours

Ces champs se sauvegardent via `updateDesignSettings` (auto-save) exactement comme les champs nom/téléphone existants.

### Pages légales — remplacer les placeholders

Créer un hook `useLegalInfo()` dans `src/hooks/useLegalInfo.ts` qui retourne les infos depuis `useDesignSettings` avec fallbacks clairs (`[Non configuré]`).

Mettre à jour les 5 pages légales pour utiliser ce hook :
- `MentionsLegales.tsx` → société, SIRET, RCS, TVA, adresse, directeur, hébergeur
- `CGV.tsx` → nom société, email retours, email contact
- `Confidentialite.tsx` → nom société, adresse, email RGPD
- `Cookies.tsx` → nom société
- `Retours.tsx` → email retours, délai, adresse

### Fichiers à modifier/créer

| Fichier | Action |
|---|---|
| `supabase/migrations/` | ADD COLUMN legal_* sur `design_settings` |
| `src/types/index.ts` | Ajouter champs `legal*` à `DesignSettings` |
| `src/hooks/useDesignSettings.ts` | Mapper les nouveaux champs DB ↔ type |
| `src/hooks/useLegalInfo.ts` | Nouveau hook centralisant les infos légales |
| `src/pages/admin/AdminSettings.tsx` | Nouvel onglet "Légal" avec 12 champs |
| `src/pages/legal/MentionsLegales.tsx` | Remplacer placeholders par données dynamiques |
| `src/pages/legal/CGV.tsx` | Remplacer placeholders |
| `src/pages/legal/Confidentialite.tsx` | Remplacer placeholders |
| `src/pages/legal/Cookies.tsx` | Remplacer placeholders |
| `src/pages/legal/Retours.tsx` | Remplacer placeholders |

### Résultat attendu

- Admin remplit ses infos légales une seule fois dans **Admin > Paramètres > Légal**
- Toutes les pages légales publiques affichent dynamiquement ces informations
- Les champs non remplis affichent un badge `[Non configuré]` en orange pour signaler à l'admin ce qui manque

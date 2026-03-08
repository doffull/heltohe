
## Root cause

`AppContext.tsx` stores **products** (partially redundant since AdminProducts uses Supabase hooks), **designSettings**, and **orders** in `localStorage`. The critical issue is `designSettings` — all the admin design customizations (hero slides, colors, HUD, stats, etc.) are ONLY in localStorage, never saved to the cloud `design_settings` table that already exists in the DB.

**What's already in the cloud (Supabase):**
- Products → `useProducts()` reads/writes via Supabase ✅
- Categories → `useCategories()` reads/writes via Supabase ✅
- Orders, Customers, Banners, Pages, etc. → all via Supabase ✅

**What's ONLY in localStorage (the problem):**
- `designSettings` in `AppContext` → saved to `localStorage` only, backed by `INITIAL_DESIGN_SETTINGS`
- The `design_settings` table in the DB already exists and has the right columns, but `AppContext` never reads from or writes to it

**Secondary: products in AppContext**  
`AppContext.products` / `setProducts` reads localStorage too. But `AdminProducts.tsx` uses `useProducts()` which reads from Supabase correctly. The `AppContext.products` is a leftover that some components may still consume — it could diverge. Need to verify.

---

## Plan

### 1. Create `useDesignSettings` hook
New file: `src/hooks/useDesignSettings.ts`

```typescript
export function useDesignSettings() // reads from DB
export function useSaveDesignSettings() // writes to DB (upsert on settings_key = 'main')
```

- `queryFn`: `supabase.from('design_settings').select('*').eq('settings_key', 'main').single()`
- Maps DB columns → `DesignSettings` object (the DB already stores JSONB columns like `hero_slides`, `stats`, `hud_buttons`, etc.)
- `mutationFn`: upsert with `settings_key: 'main'`

### 2. Update `AppContext.tsx`

Replace the localStorage-based `designSettings` state with:
```typescript
const { data: dbSettings } = useDesignSettings();
const saveDesignSettings = useSaveDesignSettings();

const [designSettings, setDesignSettingsLocal] = useState(INITIAL_DESIGN_SETTINGS);

// sync DB → local on load
useEffect(() => { if (dbSettings) setDesignSettingsLocal(dbSettings); }, [dbSettings]);

const updateDesignSettings = (updates) => {
  const next = { ...designSettings, ...updates };
  setDesignSettingsLocal(next);
  saveDesignSettings.mutate(next); // persist to cloud
};
```

Remove all `localStorage.setItem('app_design_settings', ...)` calls.

### 3. Map DesignSettings ↔ DB columns

The DB `design_settings` table already has matching columns:
- `hero_slides` JSONB → `heroSlides`
- `stats` JSONB → `stats`
- `hud_buttons` JSONB → `hudButtons`
- `background_media` JSONB → `backgroundMedia`
- `social_links` JSONB → `socialLinks`
- `home_sections` JSONB → `homeSections`
- `accent_color` TEXT → `accentColor`
- `sidebar_bg` TEXT → `sidebarBg`
- `header_bg_color` TEXT → `headerBgColor`
- `header_text_color` TEXT → `headerTextColor`
- `top_banner` JSONB → `topBanner`
- etc.

The hook needs a `dbToSettings()` and `settingsToDb()` mapper.

### 4. Remove localStorage product redundancy

`AppContext.products` uses localStorage. Since `AdminProducts` correctly uses `useProducts()` hook (Supabase), the `AppContext.products` array is stale/redundant for most cases. 

However, some components might still call `useApp().products`. I'll keep `AppContext.products` but make it derive from `useProducts()` data instead of localStorage, so there's a single source of truth (Supabase). Remove the localStorage save for products.

### 5. Debounce saves

To avoid hammering the DB on every keystroke in design sliders/inputs, debounce `saveDesignSettings` by 800ms using a `useRef` timeout.

---

## Files to modify/create

| File | Change |
|---|---|
| `src/hooks/useDesignSettings.ts` | **New** — read/write design settings from Supabase |
| `src/context/AppContext.tsx` | Replace localStorage design with Supabase hook; remove localStorage product save |

No DB migrations needed — `design_settings` table already exists with all needed columns.

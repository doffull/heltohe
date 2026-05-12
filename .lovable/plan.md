# Mini Navbar — Industrial Luxury Edition

## Goal

Replace the current MainLayout `<header>` block with a new **floating mini-navbar** inspired by the reference design (compact pill that morphs to a rounded panel on mobile open), restyled to match the project's Industrial Luxury identity (white/gray/black, Helvetica-MP, 45° chamfered edges instead of pure rounded-full, semantic tokens only).

The pasted source code is unusable (empty JSX), so the component will be rebuilt from scratch.

## Scope

**In scope**
- New `src/components/ui/mini-navbar.tsx` (presentational shell + animation).
- New `src/components/layout/MiniNavbarHeader.tsx` (project-aware wrapper that wires logo, dynamic nav items, cart, user, admin, search, chatbot, notifications — i.e. everything the current header does).
- Replace the `<header>…</header>` block inside `src/components/layout/MainLayout.tsx` (≈ lines 264-…) with `<MiniNavbarHeader />`. Keep the top banner, sidebar offset (`lg:ml-[35%]` when `sidebarActive`), `headerFixed` behavior, and admin notification/chat sheets intact by moving them into the wrapper.

**Out of scope**
- No changes to `Sidebar`, `Footer`, `MannequinHotspot`, sidebar auto-open logic, or any page content.
- No changes to `designSettings` schema, no admin UI changes.
- Auth/cart/admin behavior is preserved 1:1.

## Design rules (must follow)

- Tokens only: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, etc. No raw hex/`text-white`/`bg-black`.
- Shape: use the existing `chamfer-hud-sm` utility for the pill (45° corners), not `rounded-full`. Mobile-open expands to a slightly larger chamfered panel via a class swap with a 300 ms transition (mirrors the original's `rounded-full ↔ rounded-xl`).
- Typography: `hud-text` + `uppercase tracking-wider text-xs` for nav links, matching the rest of the site.
- Hover effect on nav links: subtle underline grow (already used in current header) — keep it.
- Respect `headerPreset` (`classic` / `centered` / `minimal` / `transparent` / `fullwidth`) and `headerBgColor` / `headerTextColor` from `designSettings`, same as today.

## Component contract

`MiniNavbar` (presentational):
- Props: `logo: ReactNode`, `links: { label: string; href: string }[]`, `actions: ReactNode`, `transparent?: boolean`, `className?: string`.
- Internal state: `isOpen` (mobile menu), `shapeClass` (delayed transition like the reference).
- Renders: floating bar with logo left, nav center (desktop only), `actions` slot right, hamburger on mobile, animated mobile drawer beneath.

`MiniNavbarHeader` (container):
- Reads `useApp`, `useAuth`, `useCart`, `useCategories`, `useLocation` (same hooks the current header uses).
- Builds the same `navItems` list (DEFAULT_NAV_ITEMS + DB categories, headerNavItems override).
- Builds the right-side `actions`: search (expandable), chatbot button (desktop), cart with badge, user, admin shield, admin notifications sheet, admin chat sheet, language toggle, signout.
- Applies `lg:ml-[35%]` when sidebar is active and `fixed`/`sticky` based on `headerFixed`.

## Files

- **Create** `src/components/ui/mini-navbar.tsx` — pure presentational, ~120 LOC.
- **Create** `src/components/layout/MiniNavbarHeader.tsx` — project wiring, ~250 LOC (extracted from MainLayout's existing header JSX).
- **Edit** `src/components/layout/MainLayout.tsx` — remove the inline `<header>` block + related state declarations that move into the wrapper (`searchOpen`, `notifOpen`, `chatOpen`, `messages`/`chatLogs` queries), replace with `<MiniNavbarHeader />`. Top banner stays in MainLayout.
- **Edit** `src/components/layout/index.ts` — export `MiniNavbarHeader` (keep `Header` export for backward compat in case other files import it; the old `Header.tsx` file is left untouched but unused by `MainLayout`).

## Technical notes

```text
MainLayout
 ├── TopBanner (unchanged)
 ├── MiniNavbarHeader            ← new
 │    └── MiniNavbar (ui)        ← new, presentational
 │         ├── logo slot         (BrandLogo)
 │         ├── nav links         (dynamic from designSettings + DB categories)
 │         └── actions slot      (search / chat / cart / user / admin / notifs)
 ├── Sidebar (unchanged)
 └── children
```

Animation parity with the reference:
- Mobile open → swap container class to expanded chamfered shape immediately.
- Mobile close → 300 ms `setTimeout` before swapping back to compact shape, exactly like the original `useEffect` pattern.
- Transition: `transition-all duration-300 ease-out`.

## Risks

- The current header carries a lot of behavior (admin sheets, sidebar offset). Plan keeps all of it; the visual change is the **shape / floating pill aesthetic**, not a feature reduction.
- If you'd rather keep the floating navbar **purely visual** (logo + links + login/signup) and move cart/user/admin elsewhere, say so and I'll reduce scope.

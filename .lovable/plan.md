## Problème

Sur mobile (≤360px), le header contient jusqu'à 6 boutons côte à côte (Cart, User, Admin, Notifications, Messages, Menu) en plus du sélecteur de langue. Ces icônes consomment ~220px et poussent le logo hors écran, surtout pour un admin connecté. Les icônes admin (Bell/Mail) ne sont pas masquées sur mobile et le sélecteur de langue n'est pas regroupé.

## Solution : regroupement compact mobile

### 1. Garder visibles sur mobile uniquement les essentiels

Dans `src/components/layout/MainLayout.tsx`, dans le bloc `Actions` (ligne 302+), restreindre à 3 boutons sur mobile :
- **Panier** (toujours visible — action commerciale prioritaire)
- **Menu hamburger** (déjà présent, contient déjà la nav)
- **Compte/Connexion** (User → `/compte` ou `/auth`)

### 2. Masquer sur mobile et déplacer dans le menu

- Bouton **Admin Shield** : ajouter `hidden lg:inline-flex` (entrée déjà présente dans le Sheet mobile via le menu)
- Bouton **Notifications (Bell)** : ajouter `hidden lg:inline-flex`
- Bouton **Messages clients (Mail)** : ajouter `hidden lg:inline-flex`
- Bouton **Chatbot (Bot)** : déjà `hidden lg:inline-flex` ✓
- **Sélecteur de langue** : déjà `hidden md:block` ✓ (OK)

Ces 3 actions admin restent accessibles via le menu hamburger sur mobile (ajouter une section "Admin" dans le `SheetContent` mobile avec liens directs vers `/admin`, `/admin/notifications` et `/admin/messages` quand `isAdmin`).

### 3. Compactage supplémentaire

- Réduire la hauteur des boutons mobile de `h-9 w-9` → `h-8 w-8` pour Cart/User/Menu (économise 12px) avec icônes `h-[16px] w-[16px]`.
- Réduire le gap mobile entre actions de `gap-0.5` → `gap-0` (les boutons ont déjà leur padding).
- Garder le logo `flex-1` avec une hauteur réduite sur très petit : `h-6 sm:h-8 lg:h-10` (au lieu de `h-7 sm:h-8`).

### 4. Vérification

- Viewport 320px : logo lisible + 3 icônes (Cart, User, Menu) sans débordement.
- Viewport 360px : confortable, badge panier reste visible.
- Admin connecté mobile : seules 3 icônes visibles ; Notifications + Messages accessibles via menu hamburger.
- Desktop ≥1024px : aucun changement visuel (toutes les icônes restent affichées comme avant).

## Fichier modifié

- `src/components/layout/MainLayout.tsx` — classes responsives sur les boutons d'actions et ajout d'une section admin dans le menu mobile.

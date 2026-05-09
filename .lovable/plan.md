## Objectifs

1. **Header mobile** — Le logo doit être visible. Aujourd'hui les icônes (Aide, Panier, Compte, Admin, Notif, Mail, Menu) prennent toute la largeur et compressent/écrasent le logo.
2. **Safe area iOS** — Respecter `env(safe-area-inset-*)` pour notch / barre du bas.
3. **Mode paysage** — Vérifier que le Hero ne déborde pas en landscape téléphone.
4. **Hero Techwear** — Agrandir encore l'image produit sur mobile (cible ~75svh portrait).

---

## 1. Header mobile compact (`src/components/layout/MainLayout.tsx`)

Sur mobile (`<lg`), garder visible **uniquement** :
- Logo (mr-auto, taille préservée `h-8`)
- Panier (avec badge)
- Menu hamburger

Tout le reste passe **dans la Sheet menu mobile** :
- Chatbot Aide → bouton dans le panneau
- Compte (User) → ligne dans la nav
- Admin (Shield) → ligne dans la nav (si admin)
- Notifications (Bell) → ligne dans la nav (si admin)
- Messages clients (Mail) → ligne dans la nav (si admin)
- Sélecteur de langue → en bas du panneau

Implémentation : ajouter `hidden lg:flex` (ou `lg:inline-flex`) sur les boutons Chatbot, User, Admin, Notifications, Mail, Language. Réduire `gap-2 lg:gap-3` → `gap-1 lg:gap-3` pour serrer ce qui reste. Le hauteur header passe à `h-12 lg:h-20` pour gagner de la place.

Dans la Sheet mobile (déjà existante), ajouter en haut un petit groupe d'actions rapides (Compte, Aide, Admin si admin, Langue).

## 2. Safe area & viewport (`index.html` + `src/index.css`)

- `index.html` : s'assurer que la balise viewport contient `viewport-fit=cover` (ajouter si absent).
- `src/index.css` : ajouter
  ```css
  body { 
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
  .header-container { padding-top: env(safe-area-inset-top); }
  ```
  (et ajuster le `top: 0` du header pour gérer la safe area top sans superposer la notch).

## 3. Hero Techwear plus grand + landscape (`src/styles/home-techwear.css`)

**Portrait mobile (`max-width: 768px`)** :
- `--hw-card-height` : `min(62svh, 480px)` → **`min(75svh, 600px)`**
- `--hw-card-width` : `min(100vw, 520px)` → **`min(96vw, 460px)`** (un poil de marge latérale)
- Padding-top : `48px` → `calc(56px + env(safe-area-inset-top))`
- Padding-bottom : `20px` → `calc(20px + env(safe-area-inset-bottom))`
- Réduire encore les panels colors/sizes : chip min-height `22px → 20px`, size-chip `26px → 24px` pour libérer de la place pour l'image agrandie.

**Ultra-mobile (`max-width: 480px`)** :
- `--hw-card-height` : `min(60svh, 440px)` → **`min(74svh, 560px)`**

**Nouveau breakpoint paysage** :
```css
@media (max-width: 932px) and (orientation: landscape) and (max-height: 500px) {
  #hw-hero {
    --hw-card-width: min(48vw, 360px);
    --hw-card-height: min(88svh, 360px);
    padding-top: calc(48px + env(safe-area-inset-top));
  }
  #hw-hero .hw-stage-inner {
    flex-direction: row !important;
    align-items: flex-start;
    gap: 12px;
  }
  #hw-hero .hw-card-col { flex: 0 0 auto; }
  #hw-hero .hw-right { flex: 1; margin-top: 0; }
  #hw-hero .hw-ctas { margin-top: 6px; }
}
```
→ Image à gauche, panneaux colors/sizes/CTA à droite en landscape, plus de scroll inutile.

## 4. Vérification

- Viewport 360×621 portrait : logo visible dans header, image hero ~75% écran, panneaux colors+sizes+CTAs dessous.
- Viewport 360×640 paysage simulé (640×360) : layout horizontal, hero ne dépasse pas le viewport.
- iPhone notch (375×812 portrait) : logo + panier + menu sous la notch, pas de chevauchement.

## Fichiers modifiés

- `src/components/layout/MainLayout.tsx` — masquer icônes secondaires en mobile, les déplacer dans la Sheet, compacter le gap, baisser hauteur header.
- `src/index.css` — safe-area body + header.
- `index.html` — `viewport-fit=cover` si manquant.
- `src/styles/home-techwear.css` — hero +25% taille mobile, breakpoint landscape, safe-area.

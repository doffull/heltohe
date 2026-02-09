
# Plan : Header avance, Sidebar conditionnelle, Footer logo, Top banner, Animation logo, Francisation, Commandes avancees, Communication clients

---

## 1. Header avance : categories centrees, choix des liens, affichage logo configurable

### Probleme actuel
Les liens du header sont codes en dur dans `NAV_ITEMS` (Home, Shop, Homme, Femme, Enfant, About). On ne peut pas choisir quelles categories afficher, ni centrer les liens, ni masquer le logo depuis l'admin.

### Solution
- **`HeaderDesignTab.tsx`** : Ajouter les options suivantes :
  - **Choix des liens de navigation** : Liste a cocher des categories (depuis la table `categories`) + liens systeme (Accueil, Boutique, A propos). L'admin coche ceux qu'il veut afficher.
  - **Centrage des categories** : Option pour centrer le texte dans la nav (deja supporte par le preset "centered", mais ajouter un toggle "Centrer la navigation" independant du preset).
  - **Afficher/masquer le logo dans le header** : Toggle deja partiellement en place via `showLogo`, mais le relier au header specifiquement.
- **`DesignSettings` (types)** : Ajouter `headerNavItems?: { label: string; href: string }[]` pour stocker les liens choisis.
- **`MainLayout.tsx`** : Remplacer le `NAV_ITEMS` statique par `designSettings.headerNavItems` (avec fallback sur les liens par defaut).

### Migration SQL
```sql
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_nav_items jsonb DEFAULT '[]'::jsonb;
```

---

## 2. Sidebar uniquement sur la page d'accueil + adaptation du header

### Probleme actuel
La sidebar gauche s'affiche sur toutes les pages (Boutique, Produit, Panier, etc.) et decale tout le contenu avec `lg:ml-[35%]`.

### Solution
- **`MainLayout.tsx`** :
  - Lire `location.pathname` pour determiner si on est sur `/` (page d'accueil).
  - Afficher la sidebar **uniquement** quand `pathname === '/'`.
  - Le `main` et `footer` n'utilisent `lg:ml-[35%]` que sur la page d'accueil avec sidebar ouverte.
  - Sur toutes les autres pages, le layout est standard (pleine largeur, header normal).
  - Le bouton toggle sidebar n'apparait que sur la page d'accueil.
  - Le header s'adapte : quand la sidebar est visible, le logo-wrapper reste ; sinon, header classique pleine largeur.

---

## 3. Logo dans le footer + logo icone du site + logo anime (GIF)

### Solution
- **`DesignSettings` (types)** : Ajouter `footerLogo?: string`, `faviconUrl?: string`.
- **`AdminDesign.tsx` (LogoTab)** : Ajouter 3 sections :
  - **Logo principal** (deja present) : accepte image et GIF animes.
  - **Logo footer** : `FileDropZone` pour uploader un logo specifique au footer.
  - **Favicon** : `FileDropZone` pour uploader l'icone du site (favicon).
- **`MainLayout.tsx` (footer)** : Remplacer le bloc "HMP" en dur par l'affichage de `designSettings.footerLogo` (ou fallback sur le logo principal).
- **`index.html`** : Le favicon sera gere dynamiquement via un `useEffect` dans `App.tsx` qui met a jour `document.querySelector('link[rel="icon"]')`.
- Le composant `FileDropZone` accepte deja les images, il faut juste s'assurer que les GIF passent (MIME `image/gif` deja couvert par `accept={['image']}`).

---

## 4. Top menu / bandeau promo au-dessus du header

### Solution
- **`DesignSettings` (types)** : Ajouter `topBanner?: { enabled: boolean; text: string; bgColor: string; textColor: string; link?: string }`.
- **`HeaderDesignTab.tsx`** : Ajouter une section "Bandeau superieur" avec :
  - Toggle activer/desactiver
  - Texte du bandeau (ex: "Livraison gratuite des 50EUR")
  - Couleur de fond et couleur de texte
  - Lien optionnel
- **`MainLayout.tsx`** : Au-dessus du `<header>`, afficher un `<div>` conditionnel avec le bandeau quand active. Ajuster le `pt-` du `<main>` pour compenser la hauteur supplementaire.

### Migration SQL
```sql
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS top_banner jsonb DEFAULT '{"enabled": false, "text": "", "bgColor": "#000000", "textColor": "#ffffff"}'::jsonb;
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS footer_logo text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS favicon_url text DEFAULT '';
ALTER TABLE design_settings ADD COLUMN IF NOT EXISTS header_nav_items jsonb DEFAULT '[]'::jsonb;
```

---

## 5. Animation du logo entre les transitions de pages et a l'arrivee

### Solution
- **`App.tsx`** : Ajouter un composant `LogoTransition` qui s'affiche pendant les transitions de page (entre `exit` et `initial` de framer-motion).
  - Le logo apparait centre a l'ecran avec une animation de scale + fade pendant 0.3-0.5s.
  - Utiliser `AnimatePresence` existant et un overlay conditionnel.
- **Au premier chargement** : Un composant `SplashScreen` qui affiche le logo pendant 1-1.5s avec une animation d'entree (scale + opacity), puis disparait.
- **Admin (`LogoTab`)** : Ajouter un toggle "Animation du logo aux transitions" et un select du type d'animation (fade, scale, glitch, slide).
- **`DesignSettings`** : Ajouter `logoAnimation?: { enabled: boolean; type: 'fade' | 'scale' | 'glitch' | 'slide'; duration: number }`.

---

## 6. Francisation complete + selecteur de langue discret

### Probleme actuel
De nombreux textes restent en anglais : "Search...", "Cart", "Account", "Sign In", "Quick Links", "Follow Us", "Newsletter", "Subscribe", "Shop", les labels du footer, etc.

### Solution
- **`MainLayout.tsx`** : Traduire tous les textes statiques en utilisant le systeme `t()` existant ou directement en francais (langue par defaut). Ex : "Search..." -> "Rechercher...", "Cart" -> "Panier", "Quick Links" -> "Liens rapides", etc.
- **Ajouter un selecteur de langue** : Un petit bouton discret dans le footer (ou le header) avec un drapeau/code langue (FR/EN). Au clic, bascule la langue via `setLanguage()` du contexte.
- **`translations`** : Completer le fichier `types/index.ts` avec les traductions manquantes.
- **Devise** : Ajouter `EUR` comme devise par defaut. Tous les prix sont deja affiches en EUR. Ajouter un selecteur de devise dans le footer (EUR/USD/GBP) qui est stocke dans `designSettings`.

---

## 7. Commandes : modification complete + factures + Colissimo + suivi

### Probleme actuel
La modal de commande permet de modifier le statut, le paiement, le transporteur, le tracking et les notes. Mais on ne peut pas modifier les infos client (nom, email, telephone, adresse) ni les articles de la commande.

### Solution
- **`AdminOrders.tsx`** : Etendre le formulaire d'edition :
  - **Infos client editables** : Nom, email, telephone, adresse, ville, code postal, pays -- tous modifiables dans le formulaire.
  - **Articles editables** : Pouvoir modifier la quantite, supprimer un article, changer le prix.
  - **Recalcul automatique** du sous-total et total quand on modifie les articles.
- **`useOrders.ts` (useUpdateOrder)** : Etendre pour accepter les champs client et items :
  ```typescript
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerZip?: string;
  customerCountry?: string;
  items?: OrderItem[];
  subtotal?: number;
  total?: number;
  ```
- **Colissimo** : Ajouter un lien direct vers le suivi Colissimo (`https://www.laposte.fr/outils/suivre-vos-envois?code={trackingNumber}`) affiche a cote du numero de suivi.
- **Facture** : Deja implementee (`downloadInvoice`). S'assurer qu'elle prend en compte les modifications.

---

## 8. Communication directe avec les clients (bouton email)

### Solution
- **`AdminOrders.tsx`** : Ajouter un bouton "Contacter" dans le detail de la commande qui ouvre un `mailto:{customerEmail}` avec sujet pre-rempli ("Commande {orderNumber}").
- **`AdminCustomers.tsx`** : Ajouter un bouton email a cote de chaque client.
- C'est la solution la plus simple et fiable sans integration email tierce. Le `mailto:` ouvre le client mail de l'admin.

---

## Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `supabase/migration` | Colonnes `top_banner`, `footer_logo`, `favicon_url`, `header_nav_items` (design_settings) |
| `src/types/index.ts` | Ajout `headerNavItems`, `topBanner`, `footerLogo`, `faviconUrl`, `logoAnimation` dans DesignSettings + traductions etendues |
| `src/components/admin/HeaderDesignTab.tsx` | Choix des nav items, centrage, top banner, affichage logo |
| `src/components/layout/MainLayout.tsx` | Sidebar conditionnelle (accueil uniquement), header adaptatif, top banner, footer logo, textes en francais, selecteur langue/devise |
| `src/pages/admin/AdminDesign.tsx` (LogoTab) | Upload logo footer, favicon, animation logo |
| `src/pages/admin/AdminOrders.tsx` | Edition complete (client + articles), lien Colissimo, bouton contacter |
| `src/hooks/useOrders.ts` | Etendre useUpdateOrder pour client/items |
| `src/App.tsx` | Splash screen logo + favicon dynamique |
| `src/pages/admin/AdminCustomers.tsx` | Bouton email par client |

---

## Ordre d'implementation

1. Migration SQL (top_banner, footer_logo, favicon_url, header_nav_items)
2. Sidebar conditionnelle (accueil uniquement) + adaptation header
3. Header avance (nav items configurables, top banner)
4. Footer logo + favicon dynamique
5. Francisation complete + selecteur langue/devise
6. Animation logo (splash + transitions)
7. Commandes avancees (edition complete + Colissimo + contacter)

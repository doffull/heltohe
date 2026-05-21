# Audit total LVTK6 — Plan de livraison

## Point bloquant admin — RÉSOLU
- Compte connecté actuellement : `6000art@gmail.com` ✅ rôle `admin` confirmé en base
- Dernière connexion réussie : 21/05 à 10:05
- Les 2 autres comptes (`amsy94`, `kolrparis`) n'ont aucun rôle → redirection normale vers `/`
- Tu peux maintenant accéder à `/admin`. Si besoin de promouvoir un autre compte : page `/admin/roles` créée à la livraison précédente.

## Méthode
Chaque livraison = (1) audit code + DB + logs, (2) tests en navigateur réel aux 3 tailles (360 / 768 / 1440), (3) corrections, (4) re-test, (5) rapport dans `AUDIT_REPORT.md`. Je ne passe pas à la suivante sans ton OK.

## Périmètre — 6 livraisons

### Livraison 1 — Parcours visiteur (front public)
Pages : `/`, `/boutique`, `/boutique/:slug`, `/:categorySlug`, `/a-propos`, `/contact`, `/fidelite`, `/guide-des-tailles`, pages légales (5)
Tests : navigation header/sidebar, hero, grilles produits, filtres, galerie zoom, ajout panier, formulaire contact, popups newsletter, FAB roulette/chat, responsive 360/768/1440.

### Livraison 2 — Compte client & authentification
Pages : `/auth` (signup/login/reset), `/compte`, `/compte/profil`, `/compte/adresses`, `/compte/commandes`, `/compte/fidelite`
Tests : inscription, connexion email, Google OAuth, déconnexion, édition profil, ajout adresse, historique commandes, points fidélité, échange récompense.

### Livraison 3 — Tunnel commande (sans paiement réel)
Pages : `/panier`, `/checkout` (étapes adresse → livraison Colissimo → récap → commande créée en `pending`)
Tests : ajout/modif/suppression panier, codes promo, livraison domicile vs point relais (carte Leaflet), validation Gemini identité, création commande, email de confirmation Resend, réservation stock.

### Livraison 4 — Admin : catalogue & opérations
Pages : Dashboard, Live, Produits, Catégories, Stock, Préparations, Commandes, Clients, Médias, Pages
Tests : CRUD produits, import PDF/CSV via Gemini, drag&drop catégories, édition stock inline, validation commande 3 étapes, génération bons Colissimo.

### Livraison 5 — Admin : marketing, design & config
Pages : Marketing, Roulette, Notifications, Chatbot, Design, Home-icons, Checkout, Colissimo, WooCommerce, Paramètres, Rôles, Audit, Erreurs
Tests : éditeur visuel live, popups newsletter, segments roulette, templates email/SMS, sync WooCommerce, attribution rôles.

### Livraison 6 — Transverse & durcissement
- Erreur runtime détectée : `Cannot read properties of undefined (reading 'toLowerCase')` dans ImageProtection → à corriger
- Lint Supabase (RLS, fonctions search_path)
- Edge functions : logs des 14 fonctions
- SEO : meta, H1, alt, JSON-LD sur toutes les pages publiques
- Accessibilité : warnings Radix DialogTitle/Description
- Performance : taille bundle, lazy loading
- Rapport final consolidé dans `AUDIT_REPORT.md`

## Hors périmètre (à ta demande)
- Paiement réel (Stripe/Paddle) → à brancher après
- Tests de charge / E2E automatisés (Playwright) → on reste sur tests manuels navigateur

## Livrable
- `AUDIT_REPORT.md` mis à jour à chaque livraison avec : bugs trouvés / corrigés / restants, captures clés, recommandations.

## Démarrage
Je commence par la **Livraison 1** (front visiteur) dès ton feu vert. Confirme-moi : on enchaîne les 6 livraisons l'une après l'autre, ou tu veux qu'on s'arrête après chacune pour valider ?

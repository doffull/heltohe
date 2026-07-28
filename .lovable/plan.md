
## Objectif

Ajouter un système d'avis clients **vérifiés** (uniquement pour les acheteurs) sur chaque fiche produit, et intégrer les widgets **Trustpilot** sur le site.

---

## 1. Base de données

Nouvelle table `product_reviews` :
- `product_id`, `user_id`, `order_id` (traçabilité de l'achat)
- `rating` 1-5, `title`, `comment`
- `status` : `pending` / `approved` / `rejected` (modération)
- `is_verified_purchase` (badge « Achat vérifié »)
- `admin_reply` + `admin_reply_at` (droit de réponse boutique)
- `helpful_count`

Table `product_review_votes` : un utilisateur vote « utile » 1x par avis.

Fonctions SQL :
- `can_user_review_product(product_id)` : renvoie l'`order_id` livré éligible, ou null.
- `submit_product_review(...)` (SECURITY DEFINER) : vérifie l'achat, empêche les doublons, insère en statut `pending` (ou `approved` selon config admin).
- `get_product_review_stats(product_id)` : moyenne + distribution 1-5 étoiles + total.

RLS :
- Lecture publique des avis `approved` uniquement.
- L'auteur voit ses propres avis (tous statuts).
- Admin/moderator : accès complet + modération.

## 2. Frontend — fiche produit

Nouveau composant `ProductReviews.tsx` sous la description produit :
- Résumé : note moyenne (étoiles), nombre d'avis, barres de distribution 1-5.
- Liste paginée avec badges « Achat vérifié », date, taille achetée, bouton « Utile ».
- Bouton **« Laisser un avis »** :
  - Non connecté → invite à se connecter.
  - Connecté mais pas d'achat livré → message « Réservé aux acheteurs ».
  - Éligible → modale avec étoiles + titre + commentaire (validation zod, max 2000 caractères).
- Tri : plus récents / mieux notés / moins bien notés.
- Filtre par nombre d'étoiles.

Mise à jour de la carte produit (`ProductCard`) : afficher étoiles + nombre d'avis sous le prix.

JSON-LD `AggregateRating` + `Review` injecté sur la fiche produit pour le SEO (étoiles Google).

## 3. Admin — modération

Nouvelle page `/admin/reviews` (`AdminReviews.tsx`) :
- Tableau filtrable (en attente / approuvés / rejetés / tous produits).
- Actions : approuver, rejeter, supprimer, répondre publiquement.
- Réglage global : auto-approbation ON/OFF (stocké dans `design_settings.settings_json.reviews`).
- Ajout d'une entrée « Avis clients » dans la sidebar admin avec compteur d'avis en attente.

## 4. Notifications

- À la livraison d'une commande (`orders.status = 'delivered'`) : email Resend « Donnez votre avis » avec lien direct vers la fiche produit + section avis (template éditable dans Notification Management).
- À l'approbation d'un avis : email de remerciement au client.
- À l'admin : notification en cas de nouvel avis à modérer (si auto-approbation OFF).

## 5. Trustpilot

Nouveau composant `TrustpilotWidget.tsx` chargeant `https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js` (asynchrone, une seule fois).

Réglages admin (dans Design Settings → nouvel onglet **« Avis & Trustpilot »**) :
- `trustpilot.businessUnitId` (à saisir)
- `trustpilot.domain` (ex. `lvtk2026.lovable.app`)
- `trustpilot.locale` (`fr-FR` par défaut)
- Toggles d'affichage : Micro TrustBox (header/footer), Carousel homepage, Grand widget page « Avis ».

Emplacements :
- **Footer** : micro TrustBox (étoiles + note globale).
- **Homepage** : carousel des derniers avis Trustpilot (bloc positionnable dans l'éditeur live comme les autres sections).
- Fiche produit : possibilité optionnelle d'ajouter le TrustBox à côté des avis internes.

Aucun secret nécessaire : les widgets Trustpilot fonctionnent avec juste le Business Unit ID public.

---

## Détails techniques

- **Éligibilité d'achat** : `orders` où `user_id = auth.uid()`, `status = 'delivered'`, et le `product_id` figure dans `items` (jsonb).
- **Anti-doublon** : contrainte unique `(user_id, product_id)` — un avis par produit par client, éditable pendant 30 jours.
- **Modération auto** : par défaut ON pour ne pas bloquer, avec filtrage anti-spam basique (longueur mini, mots interdits configurables).
- **Performance** : les stats (moyenne + count) sont calculées via la fonction SQL, mises en cache 60s côté client (React Query).
- **Sécurité** : validation zod côté client + serveur, RLS + `SECURITY DEFINER` avec `search_path = public`, honeypot pas nécessaire car auth obligatoire.
- **SEO** : JSON-LD `Product` enrichi avec `aggregateRating` uniquement s'il y a ≥ 1 avis approuvé.

---

## Livrables

1. Migration DB (table, fonctions, RLS, GRANT).
2. `src/components/product/ProductReviews.tsx` + sous-composants (`ReviewStars`, `ReviewCard`, `ReviewForm`, `ReviewsSummary`).
3. Injection dans `ProductPage` + JSON-LD.
4. Étoiles sur `ProductCard`.
5. `src/pages/admin/AdminReviews.tsx` + route + entrée sidebar.
6. Réglages Trustpilot dans Design Settings + onglet dédié.
7. `src/components/TrustpilotWidget.tsx` intégré footer + homepage (via éditeur live).
8. Templates d'emails « demande d'avis » et « avis approuvé » dans Notification Management.

Après ton feu vert, je te demanderai ton **Business Unit ID Trustpilot** au moment de l'intégration (ou tu peux le coller dès maintenant).

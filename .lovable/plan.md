

## Plan : Nettoyage images template + Google Auth + Sécurité + Audit complet

### 1. Supprimer toutes les images Unsplash du code

Le fichier `src/data/initialData.ts` contient **85 références Unsplash** : images produits fictifs, slides hero, catégories, commandes fictives, et fond de sidebar. Ces données servaient de template initial.

**Actions :**
- Remplacer toutes les URLs Unsplash par `'/placeholder.svg'` dans `initialData.ts` (produits, commandes, heroSlides, backgroundMedia, categories, pages)
- Les images `src/assets/hero/` et `src/assets/categories/` sont des fichiers locaux utilisés comme fallback dans `Home.tsx` — **à conserver** uniquement si ce sont vos propres images. Si ce sont des images trouvées sur Internet, elles seront aussi remplacées par des placeholders gris génériques
- Le site charge ses vraies données depuis la base de données (produits, catégories, slides hero configurés via l'admin). Le `initialData.ts` ne sert que de fallback quand la base est vide

### 2. Connexion Google OAuth

Lovable Cloud gère automatiquement Google OAuth. 

**Actions :**
- Configurer le Social Auth via l'outil dédié (génère le module `src/integrations/lovable/`)
- Ajouter un bouton "Se connecter avec Google" sur la page `Auth.tsx` utilisant `lovable.auth.signInWithOAuth("google")`
- Le bouton sera ajouté sous les formulaires login et inscription

### 3. Sécurité renforcée

L'admin est déjà protégé (vérification `isAdmin` + RLS + `has_role` RPC). Renforcements supplémentaires :

**Actions :**
- **Rate limiting** sur le formulaire de contact : ajouter un délai minimum entre soumissions (anti-spam côté client)
- **Honeypot field** sur les formulaires publics (contact, inscription newsletter) : champ invisible qui piège les bots
- **CSRF-like protection** : les formulaires Supabase sont déjà protégés par le JWT, mais on ajoutera une validation anti-bot sur les formulaires anonymes
- **Audit de sécurité** : lancer un scan de sécurité complet et corriger les findings restants
- Activer HIBP reste une action manuelle (Cloud > Users > Auth Settings)

> Note : les captchas externes (reCAPTCHA, hCaptcha) nécessitent des clés API tierces. Le honeypot + rate limiting offrent une protection anti-bot efficace sans dépendance externe.

### 4. Audit des redirections, liens et catégories

**Actions :**
- Vérifier que toutes les routes dans `App.tsx` pointent vers des composants existants
- Vérifier la cohérence entre les catégories en base et les slugs de navigation
- Vérifier les liens du footer, header, et menus
- Vérifier que les pages légales sont accessibles
- Vérifier les liens cassés dans le code (URLs mortes, routes inexistantes)
- Documenter les résultats dans un rapport d'audit

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| `src/data/initialData.ts` | Remplacer toutes les URLs Unsplash par placeholders |
| `src/assets/hero/*`, `src/assets/categories/*` | Supprimer si images Internet, sinon conserver |
| `src/pages/Auth.tsx` | Ajouter bouton Google OAuth |
| `src/pages/Contact.tsx` | Ajouter honeypot + rate limiting anti-bot |
| `src/components/layout/Footer.tsx` | Vérifier/corriger les liens |
| `src/components/layout/Header.tsx` | Vérifier/corriger les liens de navigation |
| Scan sécurité | Lancer et corriger les findings |


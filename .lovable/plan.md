# Espace admin « Footer »

Créer une section dédiée dans le tableau de bord pour piloter entièrement le pied de page, sans toucher au code.

## Ce que l'on pourra gérer

- **Marque** : logo du footer (déjà stocké dans les réglages), nom du site affiché, slogan, texte de copyright et mention « Tous droits réservés » (FR/EN).
- **Contact** : email et téléphone affichés, avec interrupteurs pour les montrer/masquer.
- **Réseaux sociaux** : liste ordonnable (ajouter / renommer / URL / supprimer), avec choix du mode d'affichage (icônes, texte, les deux). Aujourd'hui le footer complète automatiquement Facebook/Instagram/TikTok/YouTube avec des liens `#` — cette injection automatique devient optionnelle.
- **Colonnes de liens** (nouveau) : jusqu'à 4 colonnes personnalisées (titre + liens internes/externes), par exemple « Aide », « Légal », « Boutique ». Affichées seulement si configurées.
- **Modules** : afficher ou masquer le bouton « Installer l'app », le widget Trustpilot dans le footer, et le voyant technique « NODE_ACTIVE ».
- **Aperçu live** du footer directement dans la page admin, et sauvegarde selon la stratégie habituelle (barre de sauvegarde + auto-save).

## Détails techniques

- Nouvelle page `src/pages/admin/AdminFooter.tsx`, route `footer/*` dans `src/pages/admin/Admin.tsx`, entrée de menu « Footer » (icône `PanelBottom`) placée près de « Design ».
- Stockage dans `design_settings` : réutilisation de `footer_logo`, `site_tagline`, `contact_email`, `contact_phone`, `social_links`, `social_display_mode`, `trustpilot`.
- Migration : ajout d'une colonne `footer_config jsonb` (défaut `{}`) sur `design_settings` pour les nouveaux réglages (colonnes de liens, textes de copyright, interrupteurs de modules, injection auto des réseaux). Aucune nouvelle table, donc RLS/GRANT existants conservés.
- Mapping ajouté dans `src/hooks/useDesignSettings.ts` (lecture + écriture) et typage dans `src/types/index.ts` (`FooterConfig`).
- `src/components/layout/Footer.tsx` lit ces réglages : rendu conditionnel des blocs, colonnes de liens, textes configurables. Valeurs par défaut identiques au rendu actuel pour éviter toute régression visuelle.
- Mobile-first : la page admin réutilise les utilitaires responsives existants (`admin-tabs-scroll`, cibles tactiles 44 px).

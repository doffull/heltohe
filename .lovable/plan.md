# Brancher l'espace admin « Footer » sur le vrai footer du site

## Le problème

Le site affiche un footer écrit en dur dans la mise en page principale (logo + texte « Helvetica-MP… », colonne « Liens Rapides », icônes FB/IG/TK/YT en `#`, newsletter, liens légaux, copyright, sélecteur FR/EN + EUR).

L'espace Admin → Footer existe et enregistre bien ses réglages, mais il pilote un composant footer alternatif qui n'est affiché sur aucune page. D'où l'impression qu'aucun réglage n'a d'effet.

## Ce qui va changer

Le footer réellement affiché sur le site devient entièrement piloté par Admin → Footer, sans changer son allure actuelle par défaut :

- **Marque** : logo (déjà géré), texte de présentation éditable (aujourd'hui figé), slogan.
- **Colonnes de liens** : la colonne « Liens Rapides » et les autres colonnes deviennent les colonnes configurables de l'admin. Par défaut, les liens actuels (Accueil, Boutique, Mon Compte, À Propos) sont pré-remplis pour éviter toute perte.
- **Réseaux sociaux** : les pastilles FB/IG/TK/YT figées sont remplacées par la liste de réseaux de l'admin (libellé + URL + mode icônes/texte/les deux). Le remplissage automatique reste une option.
- **Newsletter** : bloc affichable/masquable, avec titre, texte et libellé de bouton éditables.
- **Liens légaux** : ligne affichable/masquable, avec possibilité de choisir quels liens apparaissent (mentions légales, CGV, confidentialité, cookies, retours).
- **Bas de footer** : copyright personnalisable (avec `{year}` et `{site}`), mention « Tous droits réservés » FR/EN, interrupteurs pour le sélecteur de langue et l'affichage de la devise.
- **Modules** : bouton « Installer l'app », widget Trustpilot, voyant technique — interrupteurs déjà présents, désormais réellement appliqués.
- **Contact** : email / téléphone affichables dans la colonne marque.

L'aperçu live de la page admin reflétera le rendu réel.

## Détails techniques

- `src/components/layout/MainLayout.tsx` : le bloc `<footer>` en dur est remplacé par le composant `Footer`, adapté pour conserver la mise en page actuelle (grille 4 colonnes, marges `lg:ml-[35%]` quand la sidebar est active, couleurs `footerBgColor` / `footerTextColor`).
- `src/components/layout/Footer.tsx` : refonte pour reprendre le markup actuel du footer du site (grille marque / colonnes / réseaux / newsletter, liens légaux, barre du bas langue+devise) tout en lisant `designSettings.footerConfig`. Props optionnelles pour la classe de décalage sidebar.
- `src/types/index.ts` : extension de `FooterConfig` (`brandText`, `showNewsletter`, `newsletterTitle`, `newsletterText`, `newsletterButton`, `showLegalLinks`, `legalLinks`, `showLanguageSwitch`, `showCurrency`).
- `src/pages/admin/AdminFooter.tsx` : nouveaux champs dans les onglets existants (Marque & contact, Colonnes, Modules) + onglet/section « Newsletter & bas de footer ». Même stratégie de sauvegarde (barre de sauvegarde + auto-save) et aperçu live mis à jour.
- Aucune migration nécessaire : tout est stocké dans la colonne `footer_config` (jsonb) déjà présente.
- Valeurs par défaut identiques au rendu actuel : aucune régression visuelle si l'admin ne touche à rien.

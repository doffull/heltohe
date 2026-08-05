# Mentions légales & CGV : afficher les vraies informations société

## Diagnostic (vérifié)

Les informations saisies dans Admin > Paramètres > Légal sont **bien enregistrées** en base :
- Société : Le Corner des Accessoires
- SIRET : 882205685 · RCS : 882 205 685 R.C.S. Paris · TVA : FR03882205685
- Capital : 4900 · Adresse : 24, rue René Boulanger, 75010 Paris
- Directeur : HELVETICA-MP · Email : shop@helvetica-mp.com

Le problème est en lecture : le site public lit les réglages via une vue publique restreinte qui n'expose que 6 champs légaux (nom, forme, capital, adresse, CP, ville). Les champs **SIRET, RCS, TVA, directeur de publication, email RGPD, email retours, email et téléphone de contact ne sont pas exposés** — les pages affichent donc « Non configuré » pour ceux-là.

## Correctif

1. Étendre la vue publique des réglages pour inclure les champs légaux manquants :
   `legal_siret`, `legal_rcs`, `legal_vat`, `legal_director`, `legal_rgpd_email`, `legal_return_email`, `contact_email`, `contact_phone`.
   Ces informations sont légalement obligatoires et publiques (art. 6 LCEN), donc leur exposition est attendue. Aucune donnée sensible (clés, config paiement) n'est ajoutée.

2. Vérifier que les 5 pages légales (Mentions légales, CGV, Confidentialité, Cookies, Retours) affichent les valeurs et ne conservent aucun badge « Non configuré » sur les champs renseignés.

3. Nettoyer les valeurs à l'affichage : supprimer les espaces/virgules parasites en fin de saisie (ex. « Le Corner des Accessoires, », « 24, rue René Boulanger  ») et n'afficher le suffixe « € » du capital que si le capital est renseigné.

4. Ajouter dans les mentions légales les mentions manquantes construites depuis les données existantes : numéro de TVA, RCS, SIRET (déjà prévus), et affichage du capital social formaté.

## Détails techniques

- Migration SQL : `CREATE OR REPLACE VIEW public.design_settings_public` avec les colonnes ajoutées (mêmes GRANT `SELECT` à `anon`/`authenticated` qu'aujourd'hui).
- `src/hooks/useDesignSettings.ts` : le mapping DB → app existe déjà pour ces champs, rien à changer côté écriture.
- `src/hooks/useLegalInfo.ts` : ajout d'un `trim()`/normalisation des valeurs et assouplissement de `fullAddress` (afficher l'adresse partielle disponible au lieu de « Non configuré » si un seul champ manque).
- Vérification finale en preview sur `/mentions-legales` et `/cgv`.

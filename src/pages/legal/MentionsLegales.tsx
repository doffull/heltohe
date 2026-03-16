import { LegalLayout } from './LegalLayout';

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions Légales" lastUpdated="Mars 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le présent site est édité par :<br />
        <strong>[Nom de la société]</strong><br />
        Forme juridique : [SARL / SAS / Auto-entrepreneur]<br />
        Capital social : [Montant] €<br />
        Siège social : [Adresse complète]<br />
        SIRET : [Numéro SIRET]<br />
        RCS : [Ville] [Numéro RCS]<br />
        N° TVA intracommunautaire : [FR XX XXX XXX XXX]
      </p>
      <p>
        Directeur de la publication : [Prénom Nom]<br />
        Contact : <a href="mailto:contact@votre-site.fr">contact@votre-site.fr</a><br />
        Téléphone : [+33 X XX XX XX XX]
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par :<br />
        <strong>Lovable / Supabase</strong><br />
        Site web : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer">https://lovable.dev</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, etc.) est protégé par le droit d'auteur et
        est la propriété exclusive de [Nom de la société] ou de ses partenaires. Toute reproduction, distribution, modification
        ou utilisation de ces contenus sans autorisation expresse et préalable est strictement interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous
        disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition concernant vos données
        personnelles. Pour exercer ces droits, contactez-nous à :{' '}
        <a href="mailto:rgpd@votre-site.fr">rgpd@votre-site.fr</a>.
      </p>
      <p>
        Pour plus d'informations, consultez notre{' '}
        <a href="/confidentialite">Politique de Confidentialité</a>.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Ce site peut contenir des liens vers des sites tiers. [Nom de la société] ne peut être tenu responsable du contenu
        de ces sites externes et ne contrôle pas leur politique de confidentialité ou leurs pratiques.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        [Nom de la société] s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois,
        la société ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition. En
        conséquence, [Nom de la société] décline toute responsabilité pour toute imprécision, inexactitude ou omission portant
        sur des informations disponibles sur ce site.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront
        compétents.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter par email à :{' '}
        <a href="mailto:contact@votre-site.fr">contact@votre-site.fr</a>
      </p>
    </LegalLayout>
  );
}

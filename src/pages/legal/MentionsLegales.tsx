import { LegalLayout } from './LegalLayout';
import { useLegalInfo } from '@/hooks/useLegalInfo';

function NC({ value }: { value: string }) {
  if (value !== '[Non configuré]') return <>{value}</>;
  return (
    <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-500 border border-orange-500/30 text-[11px] font-mono px-1.5 py-0.5 rounded">
      Non configuré
    </span>
  );
}

export default function MentionsLegales() {
  const info = useLegalInfo();

  return (
    <LegalLayout title="Mentions Légales" lastUpdated="Mars 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le présent site est édité par :<br />
        <strong><NC value={info.companyName} /></strong><br />
        Forme juridique : <NC value={info.companyForm} /><br />
        Capital social : <NC value={info.capital} />{info.capital !== '[Non configuré]' ? ' €' : ''}<br />
        Siège social : <NC value={info.fullAddress} /><br />
        SIRET : <NC value={info.siret} /><br />
        RCS : <NC value={info.rcs} /><br />
        N° TVA intracommunautaire : <NC value={info.vat} />
      </p>
      <p>
        Directeur de la publication : <NC value={info.director} /><br />
        Contact : <a href={`mailto:${info.contactEmail}`}><NC value={info.contactEmail} /></a><br />
        Téléphone : <NC value={info.contactPhone} />
      </p>

      <h2>Hébergement</h2>
      <p>
        Ce site est hébergé par :<br />
        <strong>Lovable</strong><br />
        Site web : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer">https://lovable.dev</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, etc.) est protégé par le droit d'auteur et
        est la propriété exclusive de <NC value={info.companyName} /> ou de ses partenaires. Toute reproduction, distribution, modification
        ou utilisation de ces contenus sans autorisation expresse et préalable est strictement interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous
        disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition concernant vos données
        personnelles. Pour exercer ces droits, contactez-nous à :{' '}
        <a href={`mailto:${info.rgpdEmail}`}><NC value={info.rgpdEmail} /></a>.
      </p>
      <p>
        Pour plus d'informations, consultez notre{' '}
        <a href="/confidentialite">Politique de Confidentialité</a>.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Ce site peut contenir des liens vers des sites tiers. <NC value={info.companyName} /> ne peut être tenu responsable du contenu
        de ces sites externes et ne contrôle pas leur politique de confidentialité ou leurs pratiques.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        <NC value={info.companyName} /> s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois,
        la société ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition. En
        conséquence, <NC value={info.companyName} /> décline toute responsabilité pour toute imprécision, inexactitude ou omission portant
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
        <a href={`mailto:${info.contactEmail}`}><NC value={info.contactEmail} /></a>
      </p>
    </LegalLayout>
  );
}

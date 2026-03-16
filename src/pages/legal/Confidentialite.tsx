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

export default function Confidentialite() {
  const info = useLegalInfo();

  return (
    <LegalLayout title="Politique de Confidentialité" lastUpdated="Mars 2026">
      <p>
        La présente politique de confidentialité décrit comment <NC value={info.companyName} /> (ci-après "nous") collecte, utilise
        et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à
        la loi Informatique et Libertés.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est :<br />
        <strong><NC value={info.companyName} /></strong><br />
        <NC value={info.fullAddress} /><br />
        Email : <a href={`mailto:${info.rgpdEmail}`}><NC value={info.rgpdEmail} /></a>
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons les catégories de données suivantes :</p>
      <ul>
        <li><strong>Données d'identification</strong> : nom, prénom, adresse email, adresse postale, numéro de téléphone</li>
        <li><strong>Données de commande</strong> : historique des achats, préférences de taille, produits consultés</li>
        <li><strong>Données de connexion</strong> : adresse IP, type de navigateur, pages visitées, durée de la visite</li>
        <li><strong>Données de paiement</strong> : ces données sont traitées directement par notre prestataire de paiement sécurisé — nous ne stockons jamais vos coordonnées bancaires</li>
      </ul>

      <h2>3. Finalités du traitement</h2>
      <p>Vos données sont utilisées pour les finalités suivantes :</p>
      <ul>
        <li>Traitement et suivi de vos commandes</li>
        <li>Gestion de votre compte client</li>
        <li>Envoi de confirmations de commande et de notifications d'expédition</li>
        <li>Envoi de notre newsletter (avec votre consentement)</li>
        <li>Amélioration de nos services et de l'expérience utilisateur</li>
        <li>Respect de nos obligations légales et comptables</li>
        <li>Prévention de la fraude</li>
      </ul>

      <h2>4. Base légale du traitement</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> : traitement des commandes, gestion du compte</li>
        <li><strong>Consentement</strong> : newsletter, cookies non essentiels</li>
        <li><strong>Intérêt légitime</strong> : amélioration des services, prévention de la fraude</li>
        <li><strong>Obligation légale</strong> : conservation des documents comptables</li>
      </ul>

      <h2>5. Durée de conservation</h2>
      <ul>
        <li>Données de compte : jusqu'à la suppression du compte + 3 ans</li>
        <li>Données de commande : 10 ans (obligation comptable)</li>
        <li>Données de navigation : 13 mois maximum</li>
        <li>Listes newsletter : jusqu'au désabonnement</li>
      </ul>

      <h2>6. Partage des données</h2>
      <p>
        Vos données peuvent être partagées avec des prestataires tiers dans le strict cadre de l'exécution de nos services :
      </p>
      <ul>
        <li>Transporteurs (Colissimo, DHL, etc.) pour la livraison</li>
        <li>Prestataires de paiement sécurisé (Stripe, etc.)</li>
        <li>Hébergeur du site</li>
        <li>Outils d'analyse d'audience</li>
      </ul>
      <p>
        Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales.
      </p>

      <h2>7. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes</li>
        <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données ("droit à l'oubli")</li>
        <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
        <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
        <li><strong>Droit à la limitation</strong> : demander la suspension temporaire d'un traitement</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à :{' '}
        <a href={`mailto:${info.rgpdEmail}`}><NC value={info.rgpdEmail} /></a>. Vous pouvez également déposer une réclamation auprès
        de la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
      </p>

      <h2>8. Sécurité</h2>
      <p>
        Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre
        tout accès non autorisé, perte, destruction ou divulgation. Notre site utilise le protocole HTTPS pour sécuriser
        les échanges de données.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Pour plus d'informations sur l'utilisation des cookies, consultez notre{' '}
        <a href="/cookies">Politique Cookies</a>.
      </p>

      <h2>10. Modifications</h2>
      <p>
        Nous nous réservons le droit de modifier la présente politique à tout moment. Les modifications entrent en vigueur
        dès leur publication sur le site. Nous vous informerons des changements significatifs par email.
      </p>
    </LegalLayout>
  );
}

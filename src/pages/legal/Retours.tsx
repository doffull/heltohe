import { LegalLayout } from './LegalLayout';

export default function Retours() {
  return (
    <LegalLayout title="Retours & Échanges" lastUpdated="Mars 2026">
      <p>
        Votre satisfaction est notre priorité. Si vous n'êtes pas entièrement satisfait(e) de votre commande, nous vous
        expliquons ci-dessous comment procéder à un retour ou un échange.
      </p>

      <h2>Droit de rétractation légal (14 jours)</h2>
      <p>
        Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de{' '}
        <strong>14 jours calendaires</strong> à compter de la réception de votre commande pour exercer votre droit de
        rétractation, sans avoir à justifier de motif ni à payer de pénalités.
      </p>

      <h2>Notre politique étendue (30 jours)</h2>
      <p>
        Au-delà de l'obligation légale, nous vous offrons <strong>30 jours</strong> à compter de la réception pour
        retourner vos articles (hors articles soldés ou personnalisés). Cette politique s'applique uniquement aux articles
        en parfait état, non portés, avec leurs étiquettes d'origine attachées et dans leur emballage d'origine.
      </p>

      <h2>Comment effectuer un retour ?</h2>
      <p>Suivez ces étapes simples :</p>
      <ul>
        <li>
          <strong>Étape 1</strong> — Contactez notre service client à{' '}
          <a href="mailto:retours@votre-site.fr">retours@votre-site.fr</a> en indiquant votre numéro de commande et
          la raison du retour.
        </li>
        <li>
          <strong>Étape 2</strong> — Nous vous enverrons une autorisation de retour et, selon les cas, une étiquette
          de retour prépayée.
        </li>
        <li>
          <strong>Étape 3</strong> — Emballez soigneusement les articles et déposez le colis dans un point relais ou
          bureau de poste.
        </li>
        <li>
          <strong>Étape 4</strong> — Une fois le colis réceptionné et contrôlé, nous traitons votre demande dans un
          délai de 5 à 7 jours ouvrés.
        </li>
      </ul>

      <h2>État des articles retournés</h2>
      <p>Les articles retournés doivent être :</p>
      <ul>
        <li>Non portés, non lavés, non altérés</li>
        <li>Dans leur emballage d'origine (si applicable)</li>
        <li>Avec toutes les étiquettes attachées</li>
        <li>Accompagnés du bon de livraison ou du numéro de commande</li>
      </ul>

      <h2>Articles non retournables</h2>
      <p>Les articles suivants ne peuvent pas faire l'objet d'un retour ou d'un échange :</p>
      <ul>
        <li>Articles soldés (sauf défaut de fabrication)</li>
        <li>Articles personnalisés ou sur-mesure</li>
        <li>Sous-vêtements et articles d'hygiène (pour des raisons sanitaires)</li>
        <li>Articles portant des traces d'utilisation, de lavage ou d'altération</li>
        <li>Articles sans étiquette</li>
      </ul>

      <h2>Remboursements</h2>
      <p>
        Le remboursement sera effectué dans un délai de <strong>14 jours</strong> après réception et vérification du
        retour, via le même moyen de paiement que celui utilisé lors de la commande.
      </p>
      <ul>
        <li>Le montant remboursé inclut le prix des articles retournés</li>
        <li>Les frais de livraison initiaux ne sont remboursés que dans le cas d'un droit de rétractation légal (14 jours)</li>
        <li>Les frais de retour sont à votre charge, sauf en cas de défaut ou d'erreur de notre part</li>
      </ul>

      <h2>Échanges</h2>
      <p>
        Pour échanger un article contre une autre taille ou couleur, effectuez un retour et passez une nouvelle commande.
        Cela garantit la disponibilité du nouvel article et accélère le traitement. En cas de rupture de stock, un
        remboursement vous sera proposé.
      </p>

      <h2>Article défectueux ou erreur de commande</h2>
      <p>
        Si vous avez reçu un article défectueux ou ne correspondant pas à votre commande, contactez-nous dans les 48h
        suivant la réception à <a href="mailto:retours@votre-site.fr">retours@votre-site.fr</a> avec des photos de
        l'article. Nous prendrons en charge les frais de retour et procéderons à un remplacement ou un remboursement
        complet selon votre préférence.
      </p>

      <h2>Contact service retours</h2>
      <p>
        Email : <a href="mailto:retours@votre-site.fr">retours@votre-site.fr</a><br />
        Téléphone : [+33 X XX XX XX XX] (du lundi au vendredi, 9h–18h)<br />
        Délai de réponse : sous 48h ouvrées
      </p>
    </LegalLayout>
  );
}

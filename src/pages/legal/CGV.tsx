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

export default function CGV() {
  const info = useLegalInfo();

  return (
    <LegalLayout title="Conditions Générales de Vente" lastUpdated="Mars 2026">
      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits effectuées sur ce site entre
        <NC value={info.companyName} /> (ci-après "le Vendeur") et tout client non professionnel (ci-après "le Client"). Toute
        commande passée sur ce site implique l'acceptation pleine et entière des présentes CGV.
      </p>

      <h2>Article 2 — Produits</h2>
      <p>
        Les produits proposés à la vente sont ceux figurant sur le site au moment de la consultation par le Client. Les
        photographies et descriptions des produits sont fournies à titre indicatif et ne sont pas contractuelles. Des
        variations mineures de couleur peuvent apparaître en raison des paramètres d'affichage de l'écran.
      </p>

      <h2>Article 3 — Prix</h2>
      <p>
        Les prix sont indiqués en euros (€) toutes taxes comprises (TTC). Le Vendeur se réserve le droit de modifier ses
        prix à tout moment, étant entendu que le prix applicable à la commande est celui en vigueur au moment de la
        validation de celle-ci. Les frais de livraison sont indiqués séparément lors du passage de commande.
      </p>

      <h2>Article 4 — Commande</h2>
      <p>Pour passer une commande, le Client doit :</p>
      <ul>
        <li>Sélectionner les produits souhaités et les ajouter au panier</li>
        <li>Valider le panier et renseigner ses coordonnées de livraison</li>
        <li>Choisir son mode de livraison</li>
        <li>Procéder au paiement sécurisé</li>
        <li>Recevoir une confirmation de commande par email</li>
      </ul>
      <p>
        Le Vendeur se réserve le droit de refuser ou d'annuler toute commande pour des raisons légitimes, notamment en
        cas de rupture de stock, d'erreur de prix ou de suspicion de fraude.
      </p>

      <h2>Article 5 — Paiement</h2>
      <p>
        Le paiement s'effectue en ligne par carte bancaire (Visa, Mastercard, American Express) via un système sécurisé.
        Les données bancaires sont cryptées et ne transitent pas sur nos serveurs. La commande n'est validée qu'après
        confirmation du paiement.
      </p>

      <h2>Article 6 — Livraison</h2>
      <p>
        Les commandes sont expédiées dans un délai de 2 à 5 jours ouvrés après confirmation du paiement. Les délais de
        livraison indicatifs sont :
      </p>
      <ul>
        <li>France métropolitaine : 2 à 4 jours ouvrés</li>
        <li>DOM-TOM : 5 à 10 jours ouvrés</li>
        <li>Europe : 3 à 7 jours ouvrés</li>
        <li>International : 7 à 15 jours ouvrés</li>
      </ul>
      <p>
        En cas de retard de livraison, le Client sera informé par email. Le Vendeur ne peut être tenu responsable des
        retards dus aux transporteurs ou aux événements de force majeure.
      </p>

      <h2>Article 7 — Droit de rétractation</h2>
      <p>
        Conformément à l'article L221-18 du Code de la consommation, le Client dispose d'un délai de <strong>14 jours
        calendaires</strong> à compter de la réception de la commande pour exercer son droit de rétractation, sans avoir
        à justifier de motif ni à payer de pénalités.
      </p>
      <p>
        Pour exercer ce droit, le Client doit notifier sa décision de rétractation par email à{' '}
        <a href={`mailto:${info.returnEmail}`}><NC value={info.returnEmail} /></a> ou via le formulaire de contact, puis retourner
        les articles dans leur état d'origine. Les frais de retour sont à la charge du Client.
      </p>
      <p>
        Les articles soldés, personnalisés ou portés ne peuvent être ni repris ni échangés, sauf vice de fabrication.
      </p>

      <h2>Article 8 — Garanties</h2>
      <p>
        Tous les produits vendus bénéficient de la garantie légale de conformité (articles L217-4 et suivants du Code de
        la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil). En cas de
        défaut de conformité, le Client peut demander la réparation, le remplacement ou le remboursement du produit.
      </p>

      <h2>Article 9 — Service client</h2>
      <p>
        Pour toute question ou réclamation, notre service client est joignable à :{' '}
        <a href={`mailto:${info.contactEmail}`}><NC value={info.contactEmail} /></a>. Nous nous engageons à répondre dans un délai
        de 48 heures ouvrées.
      </p>

      <h2>Article 10 — Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une
        solution amiable avant tout recours judiciaire. Le Client peut également recourir au service de médiation de la
        consommation.
      </p>
    </LegalLayout>
  );
}

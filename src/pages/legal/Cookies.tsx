import { LegalLayout } from './LegalLayout';

export default function Cookies() {
  return (
    <LegalLayout title="Politique Cookies" lastUpdated="Mars 2026">
      <p>
        Ce site utilise des cookies et technologies similaires pour améliorer votre expérience de navigation, analyser
        l'utilisation du site et personnaliser le contenu. La présente politique explique ce que sont les cookies, comment
        nous les utilisons et comment vous pouvez les gérer.
      </p>

      <h2>Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre
        visite sur un site web. Il permet au site de mémoriser vos actions et préférences pendant une période donnée, afin
        que vous n'ayez pas à les saisir à nouveau à chaque visite.
      </p>

      <h2>Cookies que nous utilisons</h2>

      <h3>Cookies essentiels (obligatoires)</h3>
      <p>
        Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés. Ils permettent
        notamment :
      </p>
      <ul>
        <li>La gestion de votre session et de votre connexion</li>
        <li>Le fonctionnement du panier d'achats</li>
        <li>La sécurisation des transactions</li>
        <li>La mémorisation de vos préférences de langue</li>
      </ul>
      <p><strong>Durée de conservation :</strong> durée de la session ou jusqu'à 1 an pour les préférences.</p>

      <h3>Cookies de performance / analytiques</h3>
      <p>
        Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site en collectant des
        informations de manière anonyme. Ils nous permettent d'améliorer le fonctionnement et le contenu du site.
      </p>
      <ul>
        <li>Mesure d'audience (pages visitées, durée des sessions, taux de rebond)</li>
        <li>Analyse des performances techniques</li>
        <li>Détection des erreurs de navigation</li>
      </ul>
      <p><strong>Durée de conservation :</strong> jusqu'à 13 mois.</p>

      <h3>Cookies de personnalisation</h3>
      <p>
        Ces cookies permettent de personnaliser votre expérience sur le site, notamment en mémorisant vos préférences et
        en vous proposant des contenus adaptés à vos intérêts :
      </p>
      <ul>
        <li>Mémorisation de vos produits consultés récemment</li>
        <li>Affichage de recommandations personnalisées</li>
        <li>Préférences d'affichage</li>
      </ul>
      <p><strong>Durée de conservation :</strong> jusqu'à 6 mois.</p>

      <h3>Cookies tiers</h3>
      <p>
        Certains cookies sont déposés par des partenaires tiers lorsque vous utilisez leurs services intégrés à notre
        site (par exemple, les systèmes de paiement). Ces partenaires ont leurs propres politiques de confidentialité
        qui s'appliquent à leurs cookies.
      </p>

      <h2>Comment gérer vos cookies ?</h2>
      <p>
        Vous pouvez à tout moment paramétrer votre navigateur pour accepter ou refuser les cookies. Voici comment procéder
        sur les principaux navigateurs :
      </p>
      <ul>
        <li>
          <strong>Chrome</strong> : Paramètres → Confidentialité et sécurité → Cookies et autres données de site
        </li>
        <li>
          <strong>Firefox</strong> : Options → Vie privée et sécurité → Cookies et données de site
        </li>
        <li>
          <strong>Safari</strong> : Préférences → Confidentialité → Gérer les données de site web
        </li>
        <li>
          <strong>Edge</strong> : Paramètres → Cookies et autorisations de site
        </li>
      </ul>
      <p>
        Attention : le refus de certains cookies peut altérer votre expérience sur le site et empêcher l'utilisation de
        certaines fonctionnalités (panier, connexion, etc.).
      </p>

      <h2>Consentement</h2>
      <p>
        Conformément à la réglementation CNIL, nous vous demandons votre consentement avant de déposer des cookies non
        essentiels sur votre terminal. Vous pouvez modifier vos préférences à tout moment depuis le bandeau cookies
        accessible en bas de page.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative à notre utilisation des cookies, contactez-nous à :{' '}
        <a href="mailto:rgpd@votre-site.fr">rgpd@votre-site.fr</a>
      </p>

      <p>
        Pour en savoir plus sur les cookies et votre vie privée, consultez le site de la CNIL :{' '}
        <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
      </p>
    </LegalLayout>
  );
}

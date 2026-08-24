export interface LegalSection {
  id: string;
  heading: string;
  /**
   * Plain text body. Supported light syntax:
   * - blank line   → new paragraph
   * - `### Titre`  → sub-heading
   * - `- item`     → list item
   * - `{{variable}}` → société / contact info from Admin > Paramètres > Légal
   */
  body: string;
}

export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export type LegalPageKey = 'cgv' | 'mentionsLegales' | 'confidentialite' | 'cookies' | 'retours';

export const LEGAL_PAGE_LABELS: Record<LegalPageKey, { label: string; route: string }> = {
  cgv: { label: 'CGV', route: '/cgv' },
  mentionsLegales: { label: 'Mentions légales', route: '/mentions-legales' },
  confidentialite: { label: 'Confidentialité', route: '/confidentialite' },
  cookies: { label: 'Cookies', route: '/cookies' },
  retours: { label: 'Retours', route: '/retours' },
};

/** Variables available inside legal texts. */
export const LEGAL_VARIABLES = [
  '{{societe}}',
  '{{forme_juridique}}',
  '{{capital}}',
  '{{adresse}}',
  '{{siret}}',
  '{{rcs}}',
  '{{tva}}',
  '{{directeur}}',
  '{{email_contact}}',
  '{{email_rgpd}}',
  '{{email_retours}}',
  '{{telephone}}',
  '{{site}}',
] as const;

function s(id: string, heading: string, body: string): LegalSection {
  return { id, heading, body: body.trim() };
}

export const DEFAULT_LEGAL_CONTENT: Record<LegalPageKey, LegalPageContent> = {
  cgv: {
    title: 'Conditions Générales de Vente',
    lastUpdated: 'Mars 2026',
    sections: [
      s('art1', 'Article 1 — Objet', `
Les présentes Conditions Générales de Vente (CGV) régissent les ventes de produits effectuées sur ce site entre {{societe}} (ci-après "le Vendeur") et tout client non professionnel (ci-après "le Client"). Toute commande passée sur ce site implique l'acceptation pleine et entière des présentes CGV.`),
      s('art2', 'Article 2 — Produits', `
Les produits proposés à la vente sont ceux figurant sur le site au moment de la consultation par le Client. Les photographies et descriptions des produits sont fournies à titre indicatif et ne sont pas contractuelles. Des variations mineures de couleur peuvent apparaître en raison des paramètres d'affichage de l'écran.`),
      s('art3', 'Article 3 — Prix', `
Les prix sont indiqués en euros (€) toutes taxes comprises (TTC). Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix applicable à la commande est celui en vigueur au moment de la validation de celle-ci. Les frais de livraison sont indiqués séparément lors du passage de commande.`),
      s('art4', 'Article 4 — Commande', `
Pour passer une commande, le Client doit :

- Sélectionner les produits souhaités et les ajouter au panier
- Valider le panier et renseigner ses coordonnées de livraison
- Choisir son mode de livraison
- Procéder au paiement sécurisé
- Recevoir une confirmation de commande par email

Le Vendeur se réserve le droit de refuser ou d'annuler toute commande pour des raisons légitimes, notamment en cas de rupture de stock, d'erreur de prix ou de suspicion de fraude.`),
      s('art5', 'Article 5 — Paiement', `
Le paiement s'effectue en ligne par carte bancaire (Visa, Mastercard, American Express) via un système sécurisé. Les données bancaires sont cryptées et ne transitent pas sur nos serveurs. La commande n'est validée qu'après confirmation du paiement.`),
      s('art6', 'Article 6 — Livraison', `
Les commandes sont expédiées dans un délai de 2 à 5 jours ouvrés après confirmation du paiement. Les délais de livraison indicatifs sont :

- France métropolitaine : 2 à 4 jours ouvrés
- DOM-TOM : 5 à 10 jours ouvrés
- Europe : 3 à 7 jours ouvrés
- International : 7 à 15 jours ouvrés

En cas de retard de livraison, le Client sera informé par email. Le Vendeur ne peut être tenu responsable des retards dus aux transporteurs ou aux événements de force majeure.`),
      s('art7', 'Article 7 — Droit de rétractation', `
Conformément à l'article L221-18 du Code de la consommation, le Client dispose d'un délai de 14 jours calendaires à compter de la réception de la commande pour exercer son droit de rétractation, sans avoir à justifier de motif ni à payer de pénalités.

Pour exercer ce droit, le Client doit notifier sa décision de rétractation par email à {{email_retours}} ou via le formulaire de contact, puis retourner les articles dans leur état d'origine. Les frais de retour sont à la charge du Client.

Les articles soldés, personnalisés ou portés ne peuvent être ni repris ni échangés, sauf vice de fabrication.`),
      s('art8', 'Article 8 — Garanties', `
Tous les produits vendus bénéficient de la garantie légale de conformité (articles L217-4 et suivants du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 et suivants du Code civil). En cas de défaut de conformité, le Client peut demander la réparation, le remplacement ou le remboursement du produit.`),
      s('art9', 'Article 9 — Service client', `
Pour toute question ou réclamation, notre service client est joignable à : {{email_contact}}. Nous nous engageons à répondre dans un délai de 48 heures ouvrées.`),
      s('art10', 'Article 10 — Droit applicable', `
Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable avant tout recours judiciaire. Le Client peut également recourir au service de médiation de la consommation.`),
    ],
  },

  mentionsLegales: {
    title: 'Mentions Légales',
    lastUpdated: 'Mars 2026',
    sections: [
      s('editeur', 'Éditeur du site', `
Le présent site est édité par :
{{societe}}
Forme juridique : {{forme_juridique}}
Capital social : {{capital}}
Siège social : {{adresse}}
SIRET : {{siret}}
RCS : {{rcs}}
N° TVA intracommunautaire : {{tva}}

Directeur de la publication : {{directeur}}
Contact : {{email_contact}}
Téléphone : {{telephone}}`),
      s('hebergement', 'Hébergement', `
Ce site est hébergé par :
Lovable
Site web : https://lovable.dev`),
      s('pi', 'Propriété intellectuelle', `
L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes, etc.) est protégé par le droit d'auteur et est la propriété exclusive de {{societe}} ou de ses partenaires. Toute reproduction, distribution, modification ou utilisation de ces contenus sans autorisation expresse et préalable est strictement interdite.`),
      s('donnees', 'Données personnelles', `
Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition concernant vos données personnelles. Pour exercer ces droits, contactez-nous à : {{email_rgpd}}.

Pour plus d'informations, consultez notre Politique de Confidentialité.`),
      s('liens', 'Liens hypertextes', `
Ce site peut contenir des liens vers des sites tiers. {{societe}} ne peut être tenu responsable du contenu de ces sites externes et ne contrôle pas leur politique de confidentialité ou leurs pratiques.`),
      s('responsabilite', 'Limitation de responsabilité', `
{{societe}} s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, la société ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition. En conséquence, {{societe}} décline toute responsabilité pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur ce site.`),
      s('droit', 'Droit applicable', `
Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront compétents.`),
      s('contact', 'Contact', `
Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter par email à : {{email_contact}}`),
    ],
  },

  confidentialite: {
    title: 'Politique de Confidentialité',
    lastUpdated: 'Mars 2026',
    sections: [
      s('intro', '', `
La présente politique de confidentialité décrit comment {{societe}} (ci-après "nous") collecte, utilise et protège vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés.`),
      s('responsable', '1. Responsable du traitement', `
Le responsable du traitement des données est :
{{societe}}
{{adresse}}
Email : {{email_rgpd}}`),
      s('donnees', '2. Données collectées', `
Nous collectons les catégories de données suivantes :

- Données d'identification : nom, prénom, adresse email, adresse postale, numéro de téléphone
- Données de commande : historique des achats, préférences de taille, produits consultés
- Données de connexion : adresse IP, type de navigateur, pages visitées, durée de la visite
- Données de paiement : ces données sont traitées directement par notre prestataire de paiement sécurisé — nous ne stockons jamais vos coordonnées bancaires`),
      s('finalites', '3. Finalités du traitement', `
Vos données sont utilisées pour les finalités suivantes :

- Traitement et suivi de vos commandes
- Gestion de votre compte client
- Envoi de confirmations de commande et de notifications d'expédition
- Envoi de notre newsletter (avec votre consentement)
- Amélioration de nos services et de l'expérience utilisateur
- Respect de nos obligations légales et comptables
- Prévention de la fraude`),
      s('base', '4. Base légale du traitement', `
- Exécution du contrat : traitement des commandes, gestion du compte
- Consentement : newsletter, cookies non essentiels
- Intérêt légitime : amélioration des services, prévention de la fraude
- Obligation légale : conservation des documents comptables`),
      s('conservation', '5. Durée de conservation', `
- Données de compte : jusqu'à la suppression du compte + 3 ans
- Données de commande : 10 ans (obligation comptable)
- Données de navigation : 13 mois maximum
- Listes newsletter : jusqu'au désabonnement`),
      s('partage', '6. Partage des données', `
Vos données peuvent être partagées avec des prestataires tiers dans le strict cadre de l'exécution de nos services :

- Transporteurs (Colissimo, DHL, etc.) pour la livraison
- Prestataires de paiement sécurisé (Stripe, etc.)
- Hébergeur du site
- Outils d'analyse d'audience

Nous ne vendons jamais vos données personnelles à des tiers à des fins commerciales.`),
      s('droits', '7. Vos droits', `
Conformément au RGPD, vous disposez des droits suivants :

- Droit d'accès : obtenir une copie de vos données
- Droit de rectification : corriger des données inexactes
- Droit à l'effacement : demander la suppression de vos données ("droit à l'oubli")
- Droit à la portabilité : recevoir vos données dans un format structuré
- Droit d'opposition : vous opposer à certains traitements
- Droit à la limitation : demander la suspension temporaire d'un traitement

Pour exercer ces droits, contactez-nous à : {{email_rgpd}}. Vous pouvez également déposer une réclamation auprès de la CNIL (https://www.cnil.fr).`),
      s('securite', '8. Sécurité', `
Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte, destruction ou divulgation. Notre site utilise le protocole HTTPS pour sécuriser les échanges de données.`),
      s('cookies', '9. Cookies', `
Pour plus d'informations sur l'utilisation des cookies, consultez notre Politique Cookies.`),
      s('modifs', '10. Modifications', `
Nous nous réservons le droit de modifier la présente politique à tout moment. Les modifications entrent en vigueur dès leur publication sur le site. Nous vous informerons des changements significatifs par email.`),
    ],
  },

  cookies: {
    title: 'Politique Cookies',
    lastUpdated: 'Mars 2026',
    sections: [
      s('intro', '', `
Ce site utilise des cookies et technologies similaires pour améliorer votre expérience de navigation, analyser l'utilisation du site et personnaliser le contenu. La présente politique explique ce que sont les cookies, comment {{societe}} les utilise et comment vous pouvez les gérer.`),
      s('definition', "Qu'est-ce qu'un cookie ?", `
Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur un site web. Il permet au site de mémoriser vos actions et préférences pendant une période donnée, afin que vous n'ayez pas à les saisir à nouveau à chaque visite.`),
      s('types', 'Cookies que nous utilisons', `
### Cookies essentiels (obligatoires)

Ces cookies sont indispensables au fonctionnement du site et ne peuvent pas être désactivés. Ils permettent notamment :

- La gestion de votre session et de votre connexion
- Le fonctionnement du panier d'achats
- La sécurisation des transactions
- La mémorisation de vos préférences de langue

Durée de conservation : durée de la session ou jusqu'à 1 an pour les préférences.

### Cookies de performance / analytiques

Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site en collectant des informations de manière anonyme.

- Mesure d'audience (pages visitées, durée des sessions, taux de rebond)
- Analyse des performances techniques
- Détection des erreurs de navigation

Durée de conservation : jusqu'à 13 mois.

### Cookies de personnalisation

Ces cookies permettent de personnaliser votre expérience sur le site :

- Mémorisation de vos produits consultés récemment
- Affichage de recommandations personnalisées
- Préférences d'affichage

Durée de conservation : jusqu'à 6 mois.

### Cookies tiers

Certains cookies sont déposés par des partenaires tiers lorsque vous utilisez leurs services intégrés à notre site (par exemple, les systèmes de paiement). Ces partenaires ont leurs propres politiques de confidentialité qui s'appliquent à leurs cookies.`),
      s('gestion', 'Comment gérer vos cookies ?', `
Vous pouvez à tout moment paramétrer votre navigateur pour accepter ou refuser les cookies. Voici comment procéder sur les principaux navigateurs :

- Chrome : Paramètres → Confidentialité et sécurité → Cookies et autres données de site
- Firefox : Options → Vie privée et sécurité → Cookies et données de site
- Safari : Préférences → Confidentialité → Gérer les données de site web
- Edge : Paramètres → Cookies et autorisations de site

Attention : le refus de certains cookies peut altérer votre expérience sur le site et empêcher l'utilisation de certaines fonctionnalités (panier, connexion, etc.).`),
      s('consentement', 'Consentement', `
Conformément à la réglementation CNIL, nous vous demandons votre consentement avant de déposer des cookies non essentiels sur votre terminal. Vous pouvez modifier vos préférences à tout moment depuis le bandeau cookies accessible en bas de page.`),
      s('contact', 'Contact', `
Pour toute question relative à notre utilisation des cookies, contactez-nous à : {{email_rgpd}}

Pour en savoir plus sur les cookies et votre vie privée, consultez le site de la CNIL : https://www.cnil.fr/fr/cookies-et-autres-traceurs`),
    ],
  },

  retours: {
    title: 'Retours & Échanges',
    lastUpdated: 'Mars 2026',
    sections: [
      s('intro', '', `
Votre satisfaction est notre priorité. Si vous n'êtes pas entièrement satisfait(e) de votre commande, nous vous expliquons ci-dessous comment procéder à un retour ou un échange.`),
      s('retractation', 'Droit de rétractation légal (14 jours)', `
Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours calendaires à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motif ni à payer de pénalités.`),
      s('etendue', 'Notre politique étendue (30 jours)', `
Au-delà de l'obligation légale, nous vous offrons 30 jours à compter de la réception pour retourner vos articles (hors articles soldés ou personnalisés). Cette politique s'applique uniquement aux articles en parfait état, non portés, avec leurs étiquettes d'origine attachées et dans leur emballage d'origine.`),
      s('procedure', 'Comment effectuer un retour ?', `
Suivez ces étapes simples :

- Étape 1 — Contactez notre service client à {{email_retours}} en indiquant votre numéro de commande et la raison du retour.
- Étape 2 — Nous vous enverrons une autorisation de retour et, selon les cas, une étiquette de retour prépayée.
- Étape 3 — Emballez soigneusement les articles et déposez le colis dans un point relais ou bureau de poste.
- Étape 4 — Une fois le colis réceptionné et contrôlé, nous traitons votre demande dans un délai de 5 à 7 jours ouvrés.`),
      s('etat', 'État des articles retournés', `
Les articles retournés doivent être :

- Non portés, non lavés, non altérés
- Dans leur emballage d'origine (si applicable)
- Avec toutes les étiquettes attachées
- Accompagnés du bon de livraison ou du numéro de commande`),
      s('exclusions', 'Articles non retournables', `
Les articles suivants ne peuvent pas faire l'objet d'un retour ou d'un échange :

- Articles soldés (sauf défaut de fabrication)
- Articles personnalisés ou sur-mesure
- Sous-vêtements et articles d'hygiène (pour des raisons sanitaires)
- Articles portant des traces d'utilisation, de lavage ou d'altération
- Articles sans étiquette`),
      s('remboursements', 'Remboursements', `
Le remboursement sera effectué dans un délai de 14 jours après réception et vérification du retour, via le même moyen de paiement que celui utilisé lors de la commande.

- Le montant remboursé inclut le prix des articles retournés
- Les frais de livraison initiaux ne sont remboursés que dans le cas d'un droit de rétractation légal (14 jours)
- Les frais de retour sont à votre charge, sauf en cas de défaut ou d'erreur de notre part`),
      s('echanges', 'Échanges', `
Pour échanger un article contre une autre taille ou couleur, effectuez un retour et passez une nouvelle commande. Cela garantit la disponibilité du nouvel article et accélère le traitement. En cas de rupture de stock, un remboursement vous sera proposé.`),
      s('defectueux', 'Article défectueux ou erreur de commande', `
Si vous avez reçu un article défectueux ou ne correspondant pas à votre commande, contactez-nous dans les 48h suivant la réception à {{email_retours}} avec des photos de l'article. Nous prendrons en charge les frais de retour et procéderons à un remplacement ou un remboursement complet selon votre préférence.`),
      s('contact', 'Contact service retours', `
Email : {{email_retours}}
Téléphone : {{telephone}} (du lundi au vendredi, 9h–18h)
Délai de réponse : sous 48h ouvrées`),
    ],
  },
};

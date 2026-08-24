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
    title: 'Conditions Générales de Vente — HELVETICA-MP',
    lastUpdated: 'Août 2026',
    sections: [
      s('art1', 'Article 1 — Acceptation des Conditions Générales de Vente', `
### 1.1 Portée des CGV
Les présentes Conditions Générales de Vente (ci-après « CGV ») s’appliquent à toutes les ventes de produits (ci-après : les « produits ») réalisées à travers le site Internet de HELVETICA-MP, accessible à l’adresse www.helvetica-mp.com (ci-après désigné le « Site »). Elles définissent les droits et obligations des parties dans le cadre de la vente de produits par HELVETICA-MP à des consommateurs (« Client » ou « Vous » ou « Acheteur »). Les présentes conditions générales constituent l’unique document régissant la relation contractuelle entre HELVETICA-MP et les Clients, définissent les modalités d’accès et d’utilisation du Site et déterminent les droits et obligations des parties. Elles sont accessibles et imprimables à tout moment par un lien direct en bas de page du Site. La version applicable des conditions générales est celle consultable en ligne sur le Site à la date de la commande de l’Acheteur, dont un exemplaire lui est adressé avec sa confirmation de commande. Les présentes conditions générales de vente prévalent sur toutes autres conditions générales ou particulières non expressément agréées par HELVETICA-MP. Elles peuvent être complétées le cas échéant par des conditions d’utilisation particulières à certains services offerts sur le Site, lesquelles complètent les présentes conditions générales et, en cas de contradiction, prévalent sur ces dernières.

### 1.2 Identité du vendeur et contact
Les services sont proposés par la société Le Corner des Accessoires, SAS dont le siège social se situe au 24, rue René Boulanger – 75010 Paris, inscrite au Registre du Commerce et des Sociétés de Paris sous le numéro 882 205 685. HELVETICA-MP peut être contactée à l'adresse email suivante : shop@helvetica-mp.com

### 1.3 Acceptation des CGV
L’acceptation de ces CGV est une condition sine qua non de tout achat sur le Site. Cette acceptation est pleinement reconnue par le Client, qui s’engage à lire attentivement les CGV avant de procéder à un achat. La validation de la commande par le Client constitue une acceptation sans réserve des CGV en vigueur au jour de la commande, dont la conservation et la reproduction sont assurées par HELVETICA-MP.

### 1.4 Acceptation et opposabilité
L’acceptation des présentes conditions générales par l’Acheteur est matérialisée par une case à cocher lors de l’inscription sur le Site ou lors de la passation de commande. Cette acceptation ne peut être que pleine et entière. Toute acceptation sous réserve est considérée comme nulle et non avenue. L’Acheteur qui n’accepte pas d’être lié par les présentes conditions générales ne doit pas passer de commande sur le Site.

### 1.5 Preuve de la Transaction
Les registres informatisés, conservés dans les systèmes informatiques de HELVETICA-MP dans des conditions raisonnables de sécurité, seront considérés comme les preuves de communications, des commandes et des paiements intervenus entre les parties. L’archivage des bons de commande et des factures est effectué sur un support fiable et durable pouvant être produit à titre de preuve.`),

      s('art2', 'Article 2 — Processus de Commande et Responsabilités', `
### 2.1 Création et Validation de la Commande
Le Client remplit avec soin le formulaire de commande en ligne, en indiquant précisément les références des produits sélectionnés ainsi que les quantités désirées. Il est également requis de fournir toutes les informations nécessaires à la livraison (nom, adresse de livraison, etc.). Le Client est invité à communiquer toute information pertinente susceptible d’affecter la livraison de sa commande. Une fois la commande saisie sur le Site, le Client aura la possibilité de vérifier le détail de sa commande, son prix total, et de corriger d’éventuelles erreurs avant de confirmer sa commande, ce qui implique l’acceptation des présentes CGV, le prix des produits et la description des produits disponibles à la vente.

### 2.2 Conséquences des erreurs de saisie
HELVETICA-MP ne peut être tenu pour responsable des erreurs de saisie par le Client ni des conséquences en termes de retard ou d’erreur de livraison. Dans ce contexte, tous les frais engendrés par une éventuelle réexpédition seront à la charge exclusive du Client. Le Client est donc encouragé à vérifier l’exactitude des informations fournies avant de valider sa commande en ligne.

### 2.3 Modification ou Annulation de la Commande
Le Client dispose de la possibilité de modifier ou d’annuler sa commande jusqu’à sa validation finale. Après confirmation de la commande, toute demande d'annulation effectuée avant 12h00 (midi) est acceptée sans frais. Toutefois, si la commande a déjà été préparée et expédiée entre-temps, l'annulation ne pourra plus être prise en compte avant l'acheminement : l'ensemble des frais d'expédition et de retour demeureront à la charge exclusive du Client. Passé ce délai ou après expédition, la commande est considérée comme définitive, sous réserve de l’exercice ultérieur du droit de rétractation ou en cas d’indisponibilité des produits conformément à l’article 3. L’Acheteur doit s’assurer que les coordonnées renseignées dans son Compte ou communiquées lors de sa commande sont correctes et qu’elles lui permettent de recevoir l’email de confirmation de sa commande. À défaut de réception de celui-ci, l’Acheteur doit contacter HELVETICA-MP aux coordonnées mentionnées ci-dessus. HELVETICA-MP recommande à l’Acheteur de conserver les informations contenues dans la confirmation de commande. La confirmation de commande est réputée reçue par l’Acheteur lorsqu’il peut y avoir accès.

### 2.4 Refus de Commande
HELVETICA-MP se réserve le droit de refuser toute commande d’un Client avec lequel existe un litige relatif au paiement d’une commande précédente ou pour tout autre motif légitime lié notamment à la suspicion d’une fraude sur la commande.`),

      s('art3', 'Article 3 — Disponibilité des Produits et gestion des indisponibilités', `
### 3.1 Disponibilité des offres
Les offres de produits et les prix affichés sur le site HELVETICA-MP.COM sont proposés dans la limite des stocks disponibles et pour la durée pendant laquelle ils sont visibles sur le Site. Les informations sur la disponibilité des produits sont fournies au moment de la commande. En cas de modification de cette disponibilité après la validation de la commande, le Client en sera informé par les moyens les plus rapides (courrier électronique ou téléphone) en utilisant les coordonnées fournies lors de la passation de la commande.

### 3.2 Gestion de l’indisponibilité des produits après commande
En cas d’indisponibilité du produit commandé, HELVETICA-MP informera immédiatement le Client de cette indisponibilité et du délai prévisible de livraison d’un produit de remplacement. Le Client aura alors la possibilité :
- D’accepter la livraison d’un produit de substitution d’une qualité et d’un prix équivalent à celui initialement commandé, conformément aux articles L. 216-1 et L. 216-2 du Code de la consommation ;
- D’annuler sa commande, entraînant le remboursement intégral des sommes versées dans un délai maximum de quatorze (14) jours suivant la date à laquelle le contrat a été dénoncé, conformément à l’article L. 216-3 du Code de la consommation.

### 3.3 Modalités de Remboursement
Le remboursement sera effectué par le même moyen de paiement que celui utilisé pour la transaction initiale.

### 3.4 Information du Consommateur, caractéristiques des Produits
Conformément à l’article L. 111-1 du Code de la consommation, HELVETICA-MP s’engage à fournir au consommateur, avant la conclusion du contrat de vente, les informations relatives aux caractéristiques essentielles du bien, au prix du bien et à la date ou au délai auquel le vendeur s’engage à livrer le bien. Ainsi, avant toute Commande, l’Acheteur peut prendre connaissance, sur le Site, des caractéristiques de chaque Produit qu’il désire commander. Les Produits sont proposés à la vente en ligne dans la limite des stocks disponibles, ou sous réserve de la possibilité de les commander le cas échéant. Les photographies et les descriptions des Produits proposés à la vente en ligne sont le plus précis possibles. Elles n’engagent HELVETICA-MP que pour ce qui est indiqué précisément. L’Acheteur est toutefois informé et accepte que certaines caractéristiques des Produits, notamment leur couleur, peuvent ne pas correspondre exactement aux photographies présentées sur le Site en raison de contraintes techniques.`),

      s('art4', 'Article 4 — Politique de Tarification et Conditions de Paiement', `
### 4.1 Affichage des Prix
Les prix des produits proposés sur le site HELVETICA-MP sont indiqués en euros (€) et comprennent toutes les taxes applicables (TTC), à l’exception des frais de traitement, d’expédition et de livraison, qui sont facturés en supplément. Ces frais supplémentaires sont indiqués et communiqués au Client avant la finalisation de la commande.
Attention : En dehors de l’Union Européenne ainsi que dans les DOM-TOM, des droits de douane ou taxes locales sont susceptibles d’être exigibles et peuvent être facturés à réception du colis par l’Acheteur, en sus du prix payé à HELVETICA-MP. Ces droits et taxes restent à la charge exclusive de l’Acheteur.
L’Acheteur garantit à HELVETICA-MP qu’il dispose des autorisations nécessaires pour utiliser le mode de paiement choisi. HELVETICA-MP se réserve le droit de suspendre ou d’annuler toute commande et/ou livraison en cas de non-paiement de toute somme due par l’Acheteur, d'incident de paiement ou de suspicion de fraude. Des pénalités d’un montant égal à 1,5 fois le taux d’intérêt légal français seront applicables de plein droit aux montants impayés dès la première présentation d’une mise en demeure par lettre recommandée AR.

### 4.2 Modification des Prix
HELVETICA-MP se réserve le droit de modifier les prix de ses produits à tout moment et sans préavis. Cependant, les produits seront facturés sur la base des tarifs en vigueur au moment de la validation de la commande par le Client, sous réserve de la disponibilité desdits Produits.

### 4.3 Information sur la livraison et les frais
Le Client est informé de façon claire et précise des frais de livraison applicables à sa commande avant la conclusion du contrat. Par défaut, les Produits peuvent être livrés en France et dans l’Union Européenne. La livraison est effectuée dans le délai indiqué dans l’email de confirmation de commande. À défaut de livraison dans le délai convenu, l’Acheteur peut résoudre la commande par lettre recommandée AR ou écrit sur support durable après avoir mis en demeure HELVETICA-MP d'effectuer la livraison dans un délai supplémentaire raisonnable. En cas de résolution, l’Acheteur est remboursé de l’intégralité des sommes versées au plus tard dans les 14 jours suivant la date de dénonciation.

### 4.4 Modalités de Paiement
Le paiement du prix total de la commande est dû dès la validation de la commande.

### 4.5 Clause de Réserve de Propriété
Les Produits commandés demeurent la propriété de HELVETICA-MP jusqu’à l’encaissement complet et définitif du prix. Cette clause ne fait pas obstacle au transfert à l'Acheteur, dès la livraison physique, des risques de perte et de détérioration des produits.`),

      s('art5', 'Article 5 — Vérification des colis à la livraison', `
Le Vendeur rappelle qu’au moment où le Client prend possession physiquement du colis, les risques de perte ou d’endommagement des produits lui sont transférés. HELVETICA-MP encourage vivement le Client à vérifier l’état du colis en présence du transporteur.

En cas de dommages apparents (colis endommagé, bande de garantie ouverte, produits manquants), le Client a la possibilité de refuser le colis ou de l’accepter en formulant des réserves précises, complètes et motivées sur le bordereau de livraison.

Toute réclamation ou anomalie doit être signalée dans les plus brefs délais par email à : shop@helvetica-mp.com.`),

      s('art6', 'Article 6 — Modalités de Paiement et Sécurité', `
### 6.1 Généralités
Le règlement des achats s'effectue au choix du Client par : Carte bancaire sécurisée, PayPal (option 4 fois sans frais disponible), Apple Pay ou Google Pay.

### 6.2 Paiement par Carte Bancaire
Le Site accepte les cartes Visa, MasterCard et Carte Bleue. Le processus est sécurisé via Payplug. Le débit de la carte bancaire est effectué immédiatement après validation de la commande.

### 6.3 Sécurité des Transactions
Toutes les transactions sont protégées par des technologies de cryptage avancées (protocole SSL) garantissant la confidentialité absolue des données bancaires transmises.`),

      s('art7', 'Article 7 — Droit de rétractation, Échanges et Conditions de retour', `
### 7.1 Frais et conditions générales de retour
Les retours de produits sont systématiquement et intégralement à la charge de l'Acheteur, sauf en cas d'erreur avérée imputable à HELVETICA-MP (erreur de référence, produit défectueux ou non conforme à la commande).

### 7.2 Exercice du droit de rétractation
Conformément aux dispositions légales, l’Acheteur dispose d’un délai de 14 (quatorze) jours à compter de la date de réception des Produits pour exercer son droit de rétractation ou demander un échange sans pénalités. L’Acheteur doit adresser sa demande par écrit à HELVETICA-MP (via le formulaire de rétractation ou par mail à shop@helvetica-mp.com) en précisant obligatoirement son numéro de commande.

### 7.3 Modalités et état impératif des produits retournés
Les Produits doivent être retournés au plus tard dans les 14 jours suivant la notification de rétractation. Pour être acceptés, les articles doivent obligatoirement être retournés :
- Neufs, non portés et non lavés ;
- Strictement exempts de toute odeur, notamment sans trace de parfum ni odeur de cigarette / tabac ;
- Dans leur emballage d’origine complet et intact (boîte, packaging ou polybag d'origine) avec l’ensemble des accessoires et étiquettes attachées ;
- Emballés dans un carton de transport adapté, accompagnés d'une copie de la facture d’achat et du Formulaire de retour et d'échange dûment complété (disponible en Annexe 3).

Tout article retourné incomplet, endommagé, sali ou présentant une odeur (parfum, tabac) ne pourra faire l'objet d'un remboursement ni d'un échange et sera retourné au Client à ses frais.

### 7.4 Adresse d'expédition des retours
Tous les retours doivent être expédiés par voie postale affranchie à l'adresse suivante :
HELVETICA-MP – Entrepôt
22 Avenue Paul Langevin
95220 Herblay
(Attention : Notre entrepôt ne prend en charge aucun dépôt de colis en mains propres).

### 7.5 Délais de traitement et Remboursement
Dès réception du colis conforme, HELVETICA-MP traite la demande (échange ou remboursement) sous un délai moyen de 4 jours ouvrés. Le remboursement s'effectue au plus tard sous 14 jours via le mode de paiement initial, déduction faite des frais de retour qui restent à la charge du Client (sauf en cas d'erreur imputable à HELVETICA-MP). HELVETICA-MP se réserve le droit de différer le remboursement jusqu'à parfaite réception et vérification de l'état des Produits.

### 7.6 Exceptions légales
Le droit de rétractation ne peut être exercé pour les articles descellés par le Client après livraison ne pouvant être renvoyés pour des raisons d’hygiène ou de protection de la santé, ainsi que pour les produits nettement personnalisés (art. L. 221-28 du Code de la consommation).`),

      s('art8', 'Article 8 — Droits de Propriété Intellectuelle', `
Tous les textes, visuels, marques, logos et éléments graphiques figurant sur le Site sont la propriété exclusive de HELVETICA-MP ou de ses concédants. Toute reproduction, copie ou extraction, totale ou partielle, est strictement interdite sans autorisation expresse et préalable.`),

      s('art9', 'Article 9 — Sécurité et Protection des Données Personnelles', `
HELVETICA-MP respecte les exigences du RGPD et garantit la confidentialité des données personnelles de ses Clients.

Conformément à l’article L. 223-2 du Code de la consommation, le Client est informé de son droit à s'inscrire gratuitement sur la liste d'opposition au démarchage téléphonique accessible sur www.bloctel.gouv.fr.`),

      s('art10', 'Article 10 — Sécurité des Comptes et Gestion des Mots de Passe', `
L'Acheteur est seul responsable de la protection et de la confidentialité du mot de passe associé à son Compte client. Toute action effectuée depuis son espace personnel est réputée avoir été réalisée par lui-même.`),

      s('art11', 'Article 11 — Responsabilité', `
HELVETICA-MP ne saurait être tenue pour responsable des dommages indirects subis par le Client du fait de l'utilisation des Produits ou des désagréments inhérents à l'usage des réseaux de télécommunication et d'Internet.`),

      s('art12', 'Article 12 — Force Majeure', `
HELVETICA-MP ne pourra être tenue pour responsable de l’inexécution ou du retard dans l’exécution de ses obligations contractuelles en cas de survenance d’un événement qualifié de force majeure par la jurisprudence française (intempéries exceptionnelles, grèves de transporteurs, incendies, pannes informatiques majeures, etc.).`),

      s('art13', 'Article 13 — Garanties légales', `
L’Acheteur bénéficie de plein droit de la garantie légale de conformité (art. L. 217-4 et suivants du Code de la consommation) et de la garantie des vices cachés (art. 1641 et suivants du Code civil).
- Erreur de préparation, non-conformité ou vice caché : Si le produit reçu présente un défaut avéré ou ne correspond pas à la commande par erreur de notre part, HELVETICA-MP organise et prend intégralement à sa charge les frais de retour et de réexpédition du produit de remplacement, ou procède au remboursement complet si le remplacement est impossible.
- Retour pour convenance (taille, préférence) hors rétractation : Toute demande d'échange ou de retour pour convenance personnelle formulée dans un délai de 3 jours suivant la livraison reste soumise à l'accord préalable de HELVETICA-MP et s'effectue aux frais exclusifs de l'Acheteur.`),

      s('art14', 'Article 14 — Droit Applicable et Médiation des Litiges', `
Les présentes CGV sont régies par la législation française.

En cas de litige, l’Acheteur consommateur a le droit de recourir gratuitement au service du médiateur suivant en vue d'une résolution amiable :
AME MÉDIATION DE LA CONSOMMATION
197 boulevard Saint-Germain, 75007 Paris
Téléphone : 09 53 01 02 69
Site internet : https://www.mediationconso-ame.com`),

      s('art15', 'Article 15 — Constatation de Livraison', `
En cas de contestation relative à la livraison d’un colis marqué livré par le transporteur, le Client doit faire parvenir à shop@helvetica-mp.com :
- Une déclaration sur l’honneur signée attestant de la non-réception ;
- Une copie de sa pièce d’identité en cours de validité.

Une enquête interne et transporteur sera immédiatement déclenchée pour régulariser le dossier.`),

      s('annexe1', 'Annexe 1 — Formulaire de rétractation', `
(À compléter et renvoyer uniquement en cas de volonté de vous rétracter du contrat.)

À l'attention de :
Le Corner des Accessoires (HELVETICA-MP)
24, rue René Boulanger – 75010 Paris
Email : shop@helvetica-mp.com

Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous :
- Numéro de commande : __________________________________
- Commandé le : _________________ / Reçu le : _________________
- Nom du (des) Acheteur(s) : __________________________________
- Adresse de l'Acheteur : __________________________________
- Signature de l'Acheteur (si envoi sur papier) :
- Date : _________________`),

      s('annexe2', 'Annexe 2 — Textes légaux (Code de la consommation et Code civil)', `
- Article L. 217-4 du Code de la consommation : Le vendeur est tenu de livrer un bien conforme au contrat et répond des défauts de conformité existant lors de la délivrance.
- Article L. 217-5 du Code de la consommation : Le bien est conforme au contrat s’il est propre à l’usage habituellement attendu d’un bien semblable [...].
- Article L. 217-12 du Code de la consommation : L’action résultant du défaut de conformité se prescrit par deux ans à compter de la délivrance du bien.
- Article 1641 du Code civil : Le vendeur est tenu de la garantie à raison des défauts cachés de la chose vendue qui la rendent impropre à l’usage auquel on la destine.
- Article 1648 alinéa 1er du Code civil : L’action résultant des vices rédhibitoires doit être intentée par l’acquéreur dans un délai de deux ans à compter de la découverte du vice.`),

      s('annexe3', 'Annexe 3 — Formulaire de retour et d\'échange', `
Merci pour votre commande passée sur www.helvetica-mp.com. Vous disposez d'un délai de 14 jours après réception pour retourner/échanger votre article. Les frais de retour sont à la charge du client (non remboursables, sauf erreur de notre part).

### 1. Informations commande & client
Nom & Prénom : _________________________________________
Adresse : ______________________________________________
Code Postal : ______________ Ville : ___________________
Téléphone : ________________ Email : ___________________
N° de commande : ___________ Date de commande : _________
Date de réception : ________ Date de retour : ___________

### 2. Conditions de retour (contrôle qualité)
Les produits doivent être retournés NON PORTÉS, NON LAVÉS, STRICTEMENT SANS ODEUR (ni parfum, ni tabac / cigarette), avec leurs étiquettes d'origine et dans leur emballage d'origine, le tout placé dans un carton de transport protecteur.

### 3. Détail du retour / échange
Pour chaque article, indiquez : Référence / Taille & couleur / Demande (échange ou remboursement) / Échange souhaité / Motif.
- Exemple : Silver | M - NOIR | ÉCHANGE | L - NOIR | Motif 2
- Motifs de retour : 1 = Trop grand ; 2 = Trop petit ; 3 = Ne me convient pas ; 4 = Défectueux / Erreur de préparation
- Signature du client : ______________________

### 4. Adresse de retour & expédition
- Imprimez et insérez ce formulaire complété dans le carton d'expédition.
- Assurez-vous du parfait état du produit (état neuf, sans odeur).
- Affranchissez votre colis à la Poste et expédiez-le à l'adresse suivante : HELVETICA-MP – Entrepôt, 22 Avenue Paul Langevin, 95220 Herblay.

Note : Notre entrepôt ne prend en charge aucun colis remis en mains propres. Traitement du retour sous 4 jours ouvrés dès réception du colis. Service client : shop@helvetica-mp.com`),
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

# CN23 hors France — format d'impression et notice de découpage

> **Statut : RÉSOLU le 16/09/2026.** L'hypothèse formulée ci-dessous était
> **fausse**, et la vérification l'a montrée en cinq minutes. Elle est
> conservée telle quelle : le raisonnement se tenait, seule sa conclusion
> était mauvaise, et c'est le genre d'erreur qu'on refait si on l'efface.
>
> ## Ce que la vérification a montré
>
> Étiquette suisse `HMP-MTVEO78Y`, fichier réellement stocké : **deux
> en-têtes `%PDF`, deux `%%EOF`** — deux documents collés bout à bout.
>
> | | Contenu | Format | Pages |
> |---|---|---|---|
> | Document 1 | étiquette de transport | 100 × 150 mm | 1 |
> | Document 2 | **CN23** | **A4 210 × 297 mm** | **4** |
>
> La CN23 est **déjà parfaite** : A4, 4 exemplaires, code SH `620240`,
> origine `CHINE`, poids et valeur justes, case « Vente de marchandise »
> cochée. Colissimo applique ses propres défauts, qui sont exactement ceux
> qu'il fallait.
>
> **`OUTPUT_PRINT_TYPE_CN23` et `numberOfCopies` ne servaient donc à rien
> ici.** Le §2 et le §3 ci-dessous partent d'une bonne lecture du plugin mais
> visent à côté.
>
> ## La vraie cause
>
> `extractPdf`, dans `create-colissimo-label`, prenait **du premier `%PDF` au
> dernier `%%EOF`**. Avec deux parties, elle les concaténait en un fichier
> invalide. Aucune erreur n'était levée : le fichier s'ouvre, mais ce qu'on y
> voit dépend du lecteur — `file` lit le premier en-tête et annonce
> l'étiquette seule, `pdfinfo` suit le dernier `startxref` et annonce la CN23
> seule, **sans l'étiquette**. Un des deux documents disparaît toujours.
>
> Sondage des 60 dernières commandes étiquetées : **7 fichiers concaténés,
> toutes les commandes suisses**, et aucune commande française (51) ni belge
> (2) — l'UE n'exige pas de CN23. Le défaut était donc systématique sur
> exactement les destinations à déclaration douanière, depuis l'ouverture de
> l'international le 14/09.
>
> Corrigé le 16/09 : découpage sur la `boundary` annoncée, repli par
> découpage à **chaque** `%PDF`, puis fusion `pdf-lib` en un PDF valide —
> page 1 l'étiquette, pages 2 à 5 la CN23. Un document unique reste renvoyé
> **octet pour octet** : les envois France ne repassent par aucune
> réécriture.
>
> ## Ce qui reste vrai et non traité
>
> Le **§4 garde toute sa valeur** : nous n'envoyons aucun bloc
> `fields.field[]`. L'**EORI est absent**, alors que le plugin officiel
> *refuse* de générer une étiquette pour les États-Unis sans lui, et ajoute
> le numéro de TVA pour le Royaume-Uni. Rien ne l'a corrigé.
>
> ---
>
> *Ce qui suit est l'analyse d'origine du 15/09/2026, laissée intacte.*

---

# Analyse d'origine — 15/09/2026

> **Statut à la date de rédaction : analysé, non corrigé.**
> Signalement d'origine : *« sur les étiquettes générées hors France, il doit y
> avoir une notice de découpage »*.
>
> Sources : plugin officiel **`colissimo-shipping-methods-for-woocommerce` 3.1.1**
> et **Kit Imprimante thermique** Colissimo, fournis par le client.

---

## 1. La réponse courte à la question posée

**Aucune des deux archives ne contient la moindre occurrence de « notice de découpage ».**

Recherche menée sur `découp`, `decoup`, `notice de`, `cut`, `cutting`, `fold`,
`pliage`, `liasse`, `pochette` — dans le code PHP et JS, dans le fichier de
traduction `.pot` (2 800 chaînes), dans la documentation PDF du kit thermique,
puis en balayage binaire de l'ensemble des fichiers des deux archives.

Zéro résultat. La notice n'est donc pas un objet que le plugin fabrique ou
nomme : **c'est un document produit par Colissimo lui-même**, et ce que le
plugin pilote, c'est le *format* dans lequel Colissimo le renvoie.

---

## 2. Ce que le plugin fait et que nous ne faisons pas

Le plugin distingue **deux formats d'impression** là où nous n'en pilotons
qu'un seul.

| | Plugin WooCommerce 3.1.1 | `create-colissimo-label` (nous) |
|---|---|---|
| Format de l'**étiquette** | `outputFormat.outputPrintingType`, réglable | `PDF_10x15_300dpi` en dur — l. 331 |
| Format de la **CN23** | champ `OUTPUT_PRINT_TYPE_CN23`, défaut **`PDF_A4_300dpi`** | **jamais envoyé** |
| Nombre d'exemplaires CN23 | `numberOfCopies`, défaut **4** | **jamais envoyé** |
| Bloc `fields.field[]` | 9 clés (voir §4) | **inexistant** — 0 occurrence dans le fichier |

### Côté plugin

`src/Classes/Label/LabelGenerationPayload.php:931`

```php
$this->payload['fields']['field'][] = [
    'key'   => 'OUTPUT_PRINT_TYPE_CN23',
    'value' => Helper::get_option('lpc_cn23_format', self::DEFAULT_FORMAT), // PDF_A4_300dpi
];

$numberOfCopies = intval(Helper::get_option('lpc_cn23_number', 4));

$customsDeclarationPayload = [
    'includeCustomsDeclarations' => 1,
    'numberOfCopies'             => empty($numberOfCopies) ? 4 : $numberOfCopies,
    'contents'                   => [ /* … */ ],
    'invoiceNumber'              => $order->get_order_number(),
];
```

Les deux réglages sont exposés à l'administrateur de la boutique — chaînes
`"CN23 format"` et `"Number of CN23 documents to generate"` du `.pot`.

### Côté nous

`supabase/functions/create-colissimo-label/index.ts:310`

```ts
customsDeclarations = {
  includeCustomsDeclarations: true,
  contents: { article: articles, category: { value: 3 } },
  importersReference: String(order.order_number || ''),
  importersEmail: String(order.customer_email || ''),
  importersPhone: String(order.customer_phone || ''),
};
```

et l. 328 :

```ts
outputFormat: { x: 0, y: 0, outputPrintingType: 'PDF_10x15_300dpi' },
```

Nous demandons la déclaration douanière (`includeCustomsDeclarations: true`)
sans jamais dire **dans quel format** ni **en combien d'exemplaires** la
produire.

---

## 3. L'hypothèse — et pourquoi elle n'est pas encore une certitude

En l'absence de `OUTPUT_PRINT_TYPE_CN23`, la CN23 est vraisemblablement rendue
**dans le format de l'étiquette**, soit `PDF_10x15_300dpi` : une vignette
thermique.

Or une déclaration douanière ne s'utilise pas ainsi. Elle se produit en **A4,
en plusieurs exemplaires** — l'usage veut quatre : douane export, transporteur,
douane import, destinataire — qu'on **découpe** et qu'on glisse dans la
pochette porte-documents adhésive collée sur le colis. C'est la planche A4 qui
porte les traits de coupe et la notice qui les explique.

Si notre CN23 sort en 10×15, il n'y a ni planche, ni traits de coupe, ni
notice. **La remarque du client décrirait donc exactement ce symptôme.**

⚠️ **Ce n'est pas vérifié.** Trois éléments manquent pour conclure :

1. **Une étiquette hors France réellement générée** par notre fonction — pour
   constater le nombre de pages, le format et la présence effective de la CN23.
   Tant qu'on ne l'a pas ouverte, le raisonnement reste théorique.
2. **La formulation exacte du client.** « Notice de découpage » peut désigner
   la planche A4 à découper, ou un feuillet d'instructions distinct.
3. **La documentation contractuelle Colissimo.** Le champ
   `OUTPUT_PRINT_TYPE_CN23` **n'apparaît pas dans la documentation REST
   publique** ; le plugin le connaît de l'API SOAP historique. Il faut
   confirmer qu'il est accepté sur l'endpoint que nous utilisons.

---

## 4. Ce que la comparaison révèle par ailleurs

Nous n'envoyons **aucun** bloc `fields.field[]`. Le plugin en pose neuf. Trois
méritent attention pour l'international, indépendamment du sujet de la notice.

| Clé | Rôle chez le plugin | Chez nous |
|---|---|---|
| `EORI` | numéro EORI de l'expéditeur | absent |
| `LENGTH` / `WIDTH` / `HEIGHT` | dimensions du colis | absents |
| `ACCOUNT_NUMBER` | numéro de compte | absent |

### L'EORI est un vrai risque, distinct de celui-ci

`LabelGenerationPayload.php:1026` :

```php
if (self::GB_COUNTRY_CODE === $destinationCountryId) {
    $eoriNumber = Helper::get_option('lpc_eori_uk_number');
    if ($totalItemsAmount >= 1000) {
        $eoriNumber .= ' ' . Helper::get_option('lpc_eori_number');
    }
} elseif (self::US_COUNTRY_CODE === $destinationCountryId) {
    $eoriNumber = Helper::get_option('lpc_usa_eori_number');
    if (empty($eoriNumber)) {
        throw new Exception('The EORI number is mandatory for shipments to the USA…');
    }
}
```

Le plugin **refuse de générer l'étiquette** pour les États-Unis sans EORI. Il
ajoute aussi, pour le Royaume-Uni, le numéro de TVA en commentaire de la
déclaration. Nous ne faisons ni l'un ni l'autre : un envoi US ou UK part
aujourd'hui sans ces mentions.

Cela ne concerne pas la notice de découpage, mais c'est la même famille de
défaut — une expédition hors France qui part incomplète — et ça se manifestera
au premier colis bloqué en douane.

### Autre écart mineur

Le plugin envoie `invoiceNumber` dans la déclaration ; nous envoyons
`importersReference`. Les deux champs existent et ne servent pas la même chose.
À vérifier au même moment.

---

## 5. Ce qu'il faudrait faire, dans l'ordre

Rien n'est engagé tant que le point 1 n'a pas parlé.

1. **Ouvrir une étiquette hors France déjà émise.** C'est le seul moyen de
   savoir ce que Colissimo nous renvoie aujourd'hui. Le §27 du `PROJECT.md`
   rappelle la règle : *le dépôt n'est pas le déploiement* — et ici, le code
   ne dit pas ce que l'API a effectivement produit.
2. **Confirmer auprès de Colissimo** que `OUTPUT_PRINT_TYPE_CN23` est accepté
   sur l'endpoint REST utilisé par `create-colissimo-label`.
3. **Ajouter le champ et `numberOfCopies`**, en les rendant réglables en
   administration plutôt qu'en dur — même principe que le code SH, laissé
   paramétrable le 14/09 (§27).
4. **Traiter l'EORI et la TVA UK** dans la foulée, tant que le sujet douane est
   ouvert.

---

## 6. Rappel de la règle d'or du projet

Une seule fonction fabrique les étiquettes : **`create-colissimo-label`**. Elle
ne prend qu'un `order_id` et relit la commande en base. L'action `generateLabel`
de `colissimo-proxy` est **dépréciée** et ne doit pas être réutilisée — voir
`PROJECT.md` §27.5. Toute correction de format CN23 se fait donc dans
`create-colissimo-label`, et nulle part ailleurs.

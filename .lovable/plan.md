
## Intégration Colissimo — Plan complet

### Contexte
L'API Colissimo Entreprise (La Poste) propose deux services clés :
- **`getPointRetraitAcheminement`** : liste les points relais autour d'un code postal
- **`generateLabel`** : génère une étiquette PDF Colissimo pour une commande

Les credentials sont : un **numéro de compte client** (ex: `123456`) + **mot de passe API**.

---

### Ce qu'on va construire

**1. Deux secrets à stocker**
- `COLISSIMO_LOGIN` — numéro de compte client
- `COLISSIMO_PASSWORD` — mot de passe API

**2. Edge function `colissimo-proxy`**
Proxy sécurisé pour deux actions :
- `action: "getRelayPoints"` → appel `getPointRetraitAcheminement` avec code postal + mode de livraison → retourne la liste des points relais proches (nom, adresse, horaires)
- `action: "generateLabel"` → appel `generateLabel` avec les infos de commande → retourne le PDF en base64 + numéro de tracking

**3. Au checkout — Sélecteur de point relais interactif**
Quand l'utilisateur choisit "Colissimo Point Relais" à l'étape livraison :
- Un champ code postal permet de chercher les points relais
- Une liste de **3-5 points relais** s'affiche avec nom, adresse, distance
- Le client sélectionne son point relais préféré (stocké dans `form.relayInfo`)

**4. Dans AdminOrders — Bouton "Générer étiquette Colissimo"**
Dans la vue détail d'une commande avec statut Expédiée :
- Bouton **"Étiquette Colissimo"** appelle `colissimo-proxy` avec les données client
- Télécharge le PDF de l'étiquette officielle
- Stocke le numéro de tracking dans le champ `trackingNumber` de la commande

---

### Fichiers modifiés
| Fichier | Action |
|---|---|
| `supabase/functions/colissimo-proxy/index.ts` | CRÉER — proxy API Colissimo |
| `supabase/config.toml` | MODIFIER — ajouter `colissimo-proxy` |
| `src/pages/Checkout.tsx` | MODIFIER — sélecteur point relais interactif |
| `src/pages/admin/AdminOrders.tsx` | MODIFIER — bouton génération étiquette |

---

### Flux technique

```text
[Checkout]
  ↓ code postal saisi
  → supabase.functions.invoke("colissimo-proxy", { action: "getRelayPoints", zipCode, deliveryMode })
  → Edge function → POST https://ws.colissimo.fr/pointretrait-ws-cxf/PointRetraitServiceWS/2.0/getPointRetraitAcheminement
  ← liste points relais
  → Affichage cards sélectionnables

[AdminOrders]
  ↓ clic "Étiquette Colissimo"
  → supabase.functions.invoke("colissimo-proxy", { action: "generateLabel", order })
  → Edge function → POST https://ws.colissimo.fr/sls-ws/SlsServiceWS/2.0/generateLabel
  ← PDF base64 + trackingNumber
  → Téléchargement PDF + maj trackingNumber en DB
```

---

### Note importante
L'API Colissimo utilise du JSON (REST) sur l'endpoint `https://ws.colissimo.fr`. Pour tester en sandbox, Colissimo fournit un environnement de recette. On configurera d'abord sur la **production** directement avec tes vraies credentials.

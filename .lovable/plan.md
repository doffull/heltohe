

## 3 fonctionnalités à implémenter

---

### 1. Chatbot flottant sur toute la boutique + persona "Expert Helvetica"

**Ce qui existe** : Le chatbot est uniquement sur la page `/contact`. L'utilisateur veut un **widget flottant** accessible depuis toutes les pages du site, avec un expert nommé "Helvetica".

**Architecture** :
- Créer `src/components/layout/ChatBotWidget.tsx` — bouton flottant (bas droite) qui ouvre une fenêtre de chat. Identique au chat de Contact mais dans un panneau flottant avec avatar "Helvetica".
- Modifier le `SYSTEM_PROMPT` dans `supabase/functions/contact-chat/index.ts` pour que le bot se présente comme **"Helvetica"**, expert de la marque LVTK6. Il répond à tout : style, mode, conseils vestimentaires, tendances, questions produits, logistique, etc.
- Ajouter `<ChatBotWidget />` dans `src/components/layout/MainLayout.tsx`
- Pas de nouvelle edge function : réutiliser `contact-chat`

**UI** :
```
[💬 Helvetica]  ← bouton flottant bas-droite, chamfer-hud style
↓ clic
┌─────────────────────────────────┐
│ 🤖 Helvetica  • En ligne        │
├─────────────────────────────────┤
│ Messages scrollables             │
├─────────────────────────────────┤
│ [Posez votre question...] [▶]   │
└─────────────────────────────────┘
```

---

### 2. Espace admin "Chatbot" pour gérer Helvetica

**Page** : `src/pages/admin/AdminChatbot.tsx` — nouvelle page dans le panneau admin

**Fonctionnalités** :
- **Personnalité du bot** : éditer le `system_prompt` stocké en base (table `bot_config` à créer)
- **Informations produits/boutique** : zone de texte avec les données que le bot doit connaître (horaires, adresses, politiques, etc.)
- **Suggestions rapides** : gérer les chips de suggestions affichées dans le chat
- **Statistiques** : nombre de conversations (table `chat_logs` à créer)

**Migration SQL** :
```sql
-- Table de configuration du bot
CREATE TABLE public.bot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL,
  suggestions jsonb DEFAULT '[]',
  bot_name text DEFAULT 'Helvetica',
  bot_avatar text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Ligne par défaut insérée
INSERT INTO public.bot_config (system_prompt, bot_name, suggestions) VALUES (...)

-- Table de logs de conversations (stats)
CREATE TABLE public.chat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
```

**RLS** : `bot_config` lisible par tous (anon) pour que le widget puisse le charger. Modifiable uniquement par admin via edge function.

**Edge function mise à jour** : `contact-chat` lit `bot_config` depuis la base au lieu du prompt hardcodé.

**Admin** :
- Ajouter l'entrée "Chatbot" dans `SIDEBAR_ITEMS` de `Admin.tsx`
- Route `/admin/chatbot/*`

---

### 3. Colissimo + PayPlug

#### 3a. Colissimo (livraison)

**Ce que c'est** : Colissimo est un service de La Poste (France) pour la livraison de colis. L'intégration typique = **widget de sélection de point relais** + **génération d'étiquettes** via leur API.

**Scope réaliste pour cette implémentation** :
- Page de **checkout** (`src/pages/Checkout.tsx` à créer) avec étape de livraison
- Option "Domicile" vs "Point relais Colissimo" dans le formulaire
- Calcul du coût selon le mode de livraison (défini en admin)
- Note : La génération d'étiquettes nécessite un compte Colissimo Pro et une edge function séparée — intégration visuelle complète mais API réelle en mode démo

**Admin Settings** : Ajouter onglet "Livraison" dans `AdminSettings.tsx` pour configurer les tarifs Colissimo (domicile, relais, gratuit dès X€).

#### 3b. PayPlug (paiement)

**Ce que c'est** : PayPlug est un prestataire de paiement français (Banque Populaire / BPCE). Leur API ressemble à Stripe.

**Ce qu'il faut** :
- Edge function `payplug-checkout` qui crée un paiement PayPlug et retourne l'URL de paiement
- Page `/checkout` avec bouton "Payer avec PayPlug"
- **Clé API PayPlug** à stocker en secret (clé secrète et clé publique test disponibles dans le dashboard PayPlug)

**Flow** :
```
Panier → /checkout → Saisie adresse + choix livraison → Résumé → PayPlug popup/redirect → Confirmation
```

**Ce que je demanderai** : la clé secrète PayPlug (à récupérer sur https://www.payplug.com dans Paramètres > Clés API).

---

### Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `src/components/layout/ChatBotWidget.tsx` | **CRÉER** — widget flottant Helvetica |
| `src/components/layout/MainLayout.tsx` | **MODIFIER** — intégrer `<ChatBotWidget />` |
| `src/pages/admin/AdminChatbot.tsx` | **CRÉER** — gestion du bot |
| `src/pages/admin/Admin.tsx` | **MODIFIER** — ajouter route + sidebar |
| `supabase/functions/contact-chat/index.ts` | **MODIFIER** — lire bot_config depuis la base |
| `supabase/migrations/` | **CRÉER** — tables `bot_config` + `chat_logs` |
| `src/pages/Checkout.tsx` | **CRÉER** — page checkout avec Colissimo + PayPlug |
| `src/pages/Cart.tsx` | **MODIFIER** — bouton "Passer commande" → `/checkout` |
| `src/pages/admin/AdminSettings.tsx` | **MODIFIER** — onglet Livraison |
| `supabase/functions/payplug-checkout/` | **CRÉER** — edge function PayPlug |
| `src/pages/admin/Admin.tsx` | **MODIFIER** — route `/admin/chatbot` |

**Note importante sur PayPlug** : Avant d'implémenter, je devrai demander ta clé secrète PayPlug test (`sk_test_...`) via l'outil de secrets sécurisés. Je te guiderai pour la récupérer depuis ton dashboard PayPlug.




## Modifications : Retirer PayPlug, préparer SogeCommerce pour plus tard

L'utilisateur souhaite supprimer PayPlug et ne pas implémenter SogeCommerce pour l'instant. Le checkout doit fonctionner sans paiement en ligne intégré.

### Changements

**1. Supprimer l'Edge Function PayPlug**
- Supprimer `supabase/functions/payplug-checkout/index.ts`
- Retirer la config `[functions.payplug-checkout]` de `supabase/config.toml`

**2. Adapter le Checkout**
Modifier `src/pages/Checkout.tsx` :
- Retirer l'étape "Paiement" PayPlug
- Remplacer par une étape de **confirmation** simple : créer la commande en DB avec `payment_status: 'pending'` et `payment_method: 'manual'` (virement/paiement à la livraison)
- Afficher un message de confirmation avec instructions de paiement manuel

**3. Mettre à jour AdminSettings**
Retirer l'onglet/section PayPlug des paramètres.

### Structure du nouveau Checkout

```
Adresse → Livraison (Colissimo) → Confirmation
```

À la confirmation, la commande est créée avec statut "en attente de paiement" et l'utilisateur voit :
- RIB pour virement
- Ou option "paiement à la livraison"
- Confirmation email envoyée

### Fichiers à modifier

| Fichier | Action |
|---|---|
| `supabase/functions/payplug-checkout/index.ts` | **SUPPRIMER** |
| `src/pages/Checkout.tsx` | **MODIFIER** — retirer logique PayPlug, étape confirmation uniquement |
| `supabase/config.toml` | **MODIFIER** — retirer config payplug-checkout |
| `src/pages/admin/AdminSettings.tsx` | **MODIFIER** — retirer section PayPlug |


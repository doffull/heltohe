
## Plan : Email de confirmation de commande avec Resend

### Ce qui existe
- `Checkout.tsx` : crée la commande en DB dans `handlePlaceOrder`, puis passe à l'étape `confirmation`
- Aucune edge function d'envoi d'email n'existe encore
- Secret `RESEND_API_KEY` non encore configuré

### Étapes d'implémentation

**1. Stocker le secret Resend**
Utiliser l'outil `add_secret` pour que l'utilisateur saisisse sa clé `re_...`

**2. Créer l'edge function `send-order-confirmation`**
`supabase/functions/send-order-confirmation/index.ts`
- Reçoit : `{ orderNumber, customerName, customerEmail, items, subtotal, shippingCost, total, deliveryMode }`
- Appelle l'API Resend (`https://api.resend.com/emails`) avec un template HTML
- Envoie depuis `noreply@resend.dev` (ou domaine custom si configuré)
- Template HTML propre aux couleurs LVTK6 : fond blanc, accentuation noir/primaire, liste des articles commandés, montant total, instructions de virement

**3. Ajouter la config dans `supabase/config.toml`**
```toml
[functions.send-order-confirmation]
verify_jwt = false
```

**4. Modifier `Checkout.tsx`**
Dans `handlePlaceOrder`, après le `insert` réussi, appeler :
```typescript
await supabase.functions.invoke('send-order-confirmation', {
  body: {
    orderNumber: num,
    customerName: `${form.firstName} ${form.lastName}`,
    customerEmail: form.email,
    items: orderItems,
    subtotal: subtotal - promoDiscount,
    shippingCost,
    total: orderTotal,
    deliveryMode,
  }
});
```
L'email est envoyé en "fire and forget" — une erreur d'email ne bloque pas la confirmation de commande.

### Template email (structure)
```
[Logo LVTK6]
Bonjour {prénom},
Votre commande {N°} a bien été reçue.

[Tableau des articles]
Sous-total / Livraison / Total TTC

[Encadré virement bancaire]
Bénéficiaire : LVTK6 Concept
Montant : XX.XX €
Référence : LVTK-XXXXX

Expédition Colissimo dès réception du paiement.
```

### Fichiers modifiés
| Fichier | Action |
|---|---|
| `supabase/functions/send-order-confirmation/index.ts` | CRÉER |
| `supabase/config.toml` | MODIFIER — ajouter la fonction |
| `src/pages/Checkout.tsx` | MODIFIER — appeler la fonction après insert |

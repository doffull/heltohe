## Objectif

Rendre les icônes d'action du header accessibles aux lecteurs d'écran et utilisateurs au survol, avec des libellés cohérents et dynamiques.

## Modifications dans `src/components/layout/MainLayout.tsx`

Ajouter `aria-label` (et `title` si manquant) sur chaque bouton/lien d'icône du bloc Actions :

| Icône | aria-label | title |
|---|---|---|
| Recherche (Search) | "Rechercher" / "Fermer la recherche" | idem |
| Recherche – bouton fermeture (X) | "Fermer la recherche" | idem |
| Chatbot (Bot) | "Ouvrir l'assistant" | "Assistant" (déjà) |
| Panier (ShoppingBag) | `Panier (${itemCount} article${itemCount>1?'s':''})` | "Panier" |
| Compte (User) | `user ? 'Mon compte' : 'Se connecter'` | idem |
| Admin (Shield) | "Administration" | "Administration" |
| Notifications (Bell) | `Notifications (${unreadCount} non lu${unreadCount>1?'s':''})` | déjà "Notifications" |
| Messages clients (MailIcon) | `Messages clients (${chatCount})` | déjà "Messages clients" |
| Sélecteur langue | `Changer la langue (actuellement ${language})` | idem |
| Menu mobile (hamburger) | "Ouvrir le menu" | idem |

Pour les badges numériques (panier, notifs, messages) : ajouter `aria-hidden="true"` sur le `<span>` du badge puisque l'info est déjà reprise dans `aria-label`.

Pour les liens englobant un bouton (`<Link><Button/></Link>`) : appliquer `aria-label` sur le `<Link>` (élément réellement focusable côté navigation) **et** garder `aria-label` sur le `<Button>` pour cohérence — ou plus propre, mettre uniquement sur le `Link` et `aria-hidden` sur l'icône `lucide`. Choix retenu : `aria-label` sur le `Link`, icônes restent décoratives implicitement.

## Aucune autre logique modifiée

Pas de changement de comportement, uniquement d'attributs d'accessibilité. Pas de migration ni de modif de styles.

## Vérification

- Inspecter le header avec les DevTools Accessibility tree : chaque action a un nom accessible non vide.
- Les libellés se mettent à jour quand `itemCount` / `unreadCount` / `chatCount` / `language` / `user` changent.

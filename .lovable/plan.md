# Liens de navigation configurables (Sidebar + Mega Menu)

## Objectif
Dans `/admin/design`, ajouter un panneau permettant de :
- Masquer / réafficher chaque lien de la **Sidebar gauche** et du **Mega Menu**
- Réordonner les liens par glisser-déposer
- Renommer les libellés (FR / EN pour la sidebar)
- Sauvegarde explicite (cohérent avec la règle "Admin: pas d'auto-save")

## Où ça change

### 1. Modèle de données — `designSettings`
Ajouter deux champs dans `design_settings` (JSON, pas de migration SQL — `design_settings` est déjà un blob libre) :

```ts
sidebarNavLinks: Array<{ id: string; label: string; labelEN: string; icon: string; enabled: boolean }>
megaMenuLinks:   Array<{ id: string; label: string; href: string; enabled: boolean }>
```

Valeurs par défaut = la liste hardcodée actuelle (`Accueil/Boutique/À propos` pour la sidebar ; `Accueil/Boutique/Nouveautés/À propos/Contact/Fidélité` pour le mega menu).

Fichiers touchés :
- `src/types/index.ts` — type `DesignSettings`
- `src/data/initialData.ts` — defaults
- `src/hooks/useDesignSettings.ts` — fallback de lecture

### 2. Consommation côté site
- `src/components/layout/Sidebar.tsx` — remplacer la constante `navItems` par `designSettings.sidebarNavLinks.filter(l => l.enabled)`, avec un map id→icône Lucide (Home, ShoppingBag, Info, etc.) pour conserver les icônes.
- `src/components/layout/MegaMenu.tsx` — remplacer `STATIC_LINKS` par `designSettings.megaMenuLinks.filter(l => l.enabled)`.

### 3. Admin — nouvel onglet "Navigation" dans `/admin/design`
Dans `src/pages/admin/AdminDesign.tsx`, ajouter une carte "Liens de navigation" avec deux sous-sections :

**Sidebar gauche**
- Liste des 3 liens avec :
  - Switch on/off
  - Champ libellé FR
  - Champ libellé EN
  - Poignée de drag pour réordonner
- Bouton "Ajouter un lien" (optionnel — choix d'icône via IconPicker existant)

**Mega Menu**
- Même UI : switch, label, champ href, drag-handle, bouton ajouter.

Bouton "Enregistrer" en pied de carte (utilise `useSaveDesignSettings` déjà en place dans le projet, cf. `VisualEditorPanel.tsx`). Toast de confirmation.

Drag-and-drop : `@dnd-kit/core` + `@dnd-kit/sortable` (déjà utilisés ailleurs dans le projet d'après le pattern Categories — à vérifier rapidement, sinon fallback boutons ↑/↓).

## Hors scope
- Pas de migration DB.
- Pas de changement sur Header, FAB, ou autre menu.
- Pas de gestion multi-langue au-delà du FR/EN déjà supporté.
- Pas de sous-menus / nesting.

## Détails techniques
- Sécurité : `designSettings` est public, donc aucun secret n'y transite — OK.
- Compatibilité : si `sidebarNavLinks`/`megaMenuLinks` absents en DB, on retombe sur les defaults → pas de régression pour les installations existantes.
- Sauvegarde explicite via bouton (pas d'auto-save) conformément à la convention admin du projet.

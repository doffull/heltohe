
# Bouton d'accès rapide à l'admin dans le header

## Ce qui sera fait

Un bouton avec l'icône `Shield` sera ajouté dans le header du site, visible **uniquement** pour les utilisateurs ayant le rôle admin. Il permettra de basculer instantanément vers le panneau d'administration `/admin`.

## Emplacement

```text
[Navigation]          [Search] [Cart] [User] [Shield] [Menu mobile]
                                               ^
                                         visible uniquement
                                         si isAdmin === true
```

## Détails techniques

**Fichier modifié :** `src/components/layout/MainLayout.tsx`

### Changements

1. **Import** : Ajouter `Shield` depuis `lucide-react`
2. **Hook** : `useAuth()` est déjà importé — utiliser `isAdmin` en plus de `user`
3. **Desktop** : Ajouter un `Link` vers `/admin` avec un bouton `ghost` + icône `Shield`, placé entre le bouton utilisateur et le bouton menu mobile
4. **Mobile** : Ajouter une entrée "Administration" dans le menu Sheet (section du bas), conditionnée par `isAdmin`
5. **Condition** : Le bouton ne s'affiche que si `isAdmin === true`

### Code ajouté (desktop)

```tsx
{isAdmin && (
  <Link to="/admin">
    <Button variant="ghost" size="icon">
      <Shield className="h-5 w-5" />
    </Button>
  </Link>
)}
```

### Code ajouté (mobile, dans le Sheet)

```tsx
{isAdmin && (
  <Link to="/admin" className="flex items-center justify-between py-3">
    <span className="text-lg font-medium">Administration</span>
    <Shield className="h-5 w-5" />
  </Link>
)}
```

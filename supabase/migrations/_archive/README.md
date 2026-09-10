# Archive des migrations — jusqu'au 09/09/2026

Les 188 fichiers de ce dossier ont été remplacés par
`../20260909120000_baseline.sql`, qui décrit la base telle qu'elle existe
réellement sur `hzjzqdlyehclnpeqkier`.

**Ils ne sont plus exécutés.** Ni par `supabase db push`, ni autrement : le
dossier `_archive/` n'est pas lu par le CLI.

## Pourquoi les garder

Le baseline dit ce que la base **contient**. Ces fichiers disent ce qu'on
**voulait** qu'elle contienne — et l'écart entre les deux a déjà servi deux fois :

- le bucket `labels` n'avait jamais été créé, alors que ses politiques
  existaient depuis le 18/08 (`20260818142129`) ;
- `storage.objects` n'avait aucune politique, alors que quatre migrations en
  décrivaient huit.

Dans les deux cas, c'est en relisant ces fichiers qu'on a su quoi reconstruire.
Ils restent aussi la seule trace de l'*intention* derrière chaque changement :
un baseline ne dit jamais pourquoi une colonne existe.

## Ce qui s'est passé

Lors du passage de `bumfyrfmormisyjletpb` à `hzjzqdlyehclnpeqkier` (§21 de
`PROJECT.md`), `supabase_migrations.schema_migrations` a été recopiée telle
quelle. Constat du 09/09 : **284 versions déclarées appliquées, pour 188
fichiers**. Une centaine d'entrées ne correspondait à aucun fichier, et
plusieurs objets décrits par les fichiers n'existaient pas en base.

`supabase db push` sautait donc ce qu'il croyait déjà fait — d'où des mois de
migrations appliquées à la main.

## Ne pas les rejouer

Les exécuter sur la base actuelle échouerait dès les premières
(`already exists`), et laisserait la base à mi-chemin. Si un objet manque,
écrire une nouvelle migration horodatée après le baseline — jamais réexécuter
un fichier d'ici.

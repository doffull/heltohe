Plan de correction ciblé pour que les éléments admin visibles sur ta capture soient vraiment modifiables.

1. Sécuriser les interactions des liens de navigation
   - Remplacer les lignes cliquables actuelles par de vrais contrôles accessibles avec `id` + `htmlFor`.
   - Ajouter un clic sur toute la ligne sans double-déclenchement, pour que cocher “Accueil”, “Boutique”, “Homme”, “Femme”, etc. marche même en cliquant le texte ou la ligne.
   - Corriger l’édition des liens actifs/personnalisés pour que changer le label ou l’URL ne soit pas perdu pendant la saisie.

2. Sécuriser les switches admin
   - Rendre “Activer le bandeau”, “Header fixe” et “Afficher le logo” cliquables aussi via leur libellé.
   - Ajouter un retour visuel/état stable pour éviter que le switch revienne immédiatement à l’état précédent pendant la sauvegarde.

3. Corriger la sauvegarde des réglages header
   - Ajouter une sauvegarde immédiate ciblée quand on coche/décoche un lien ou un switch important, au lieu de dépendre seulement du délai de 800 ms.
   - Conserver la sauvegarde différée pour les champs texte afin de ne pas envoyer une requête à chaque lettre.
   - Afficher une erreur claire si la base refuse l’écriture, plutôt que donner l’impression que le bouton ne marche pas.

4. Empêcher les protections du site de bloquer l’admin
   - Adapter la protection anti-copie/sélection pour qu’elle soit complètement inactive sur toutes les routes `/admin`, même si le rôle admin n’est pas encore chargé.
   - Élargir les éléments autorisés à interagir (`button`, `label`, éléments Radix, switches, checkboxes), afin que les composants admin ne soient jamais bloqués par l’overlay sécurité.

5. Vérifier le résultat
   - Tester dans l’admin : cocher/décocher les liens de navigation, activer/désactiver le bandeau, modifier un lien personnalisé, rafraîchir la page et vérifier que les changements restent.
   - Vérifier qu’aucun élément de la zone montrée sur ta capture ne se chevauche ou ne devient impossible à sélectionner.
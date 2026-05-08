## Plan d’intervention

1. **Agrandir le Hero Techwear sur mobile**
   - Augmenter la largeur/hauteur du carré image pour qu’il occupe presque toute la largeur du téléphone.
   - Garder le panneau couleurs/tailles sous l’image, compact, sans décalage quand l’image grandit.
   - Réduire les CTA “Acheter” / “Découvrir” sur mobile : boutons plus fins, moins hauts, moins imposants, mais toujours lisibles.

2. **Corriger la validation définitive des positions du Hero Techwear**
   - Remplacer le drag local actuel du badge/nom produit et du panneau par une logique plus stable basée sur les réglages par device déjà prévus.
   - Sauvegarder la position validée dans la configuration mobile/tablette/desktop correspondante, au lieu d’écraser seulement une position globale.
   - Éviter le “retour à la place initiale” après validation en synchronisant l’état local avec la position réellement persistée.

3. **Ajouter le redimensionnement du bouton “Jeu du jour”**
   - Ajouter une poignée/admin control simple pour redimensionner le bouton en plus du glisser-déposer.
   - Persister séparément la taille par device, comme pour la position.
   - Faire en sorte que la validation ✓ rende la position/taille définitive et que le bouton ne revienne plus à sa place précédente.

4. **Vérification ciblée mobile**
   - Contrôler le rendu sur viewport mobile 360px : image plus grande, CTA compacts, panneau sous l’image, positions sauvegardées après validation.
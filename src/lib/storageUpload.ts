/**
 * Options d'envoi partagées pour le stockage Supabase.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE
 *
 * Le 10/09/2026, le projet consommait 444 Go de « cached egress » pour un quota
 * de 250 Go — 178 % — alors que le bucket ne pèse que 694 Mo. Deux causes
 * cumulées :
 *
 *   1. le transfert du 04/09 avait recopié les objets sans en-tête
 *      `cache-control`, et l'API Storage retombe alors sur `no-cache` : chaque
 *      affichage retéléchargeait l'image entière, sans cache navigateur ni CDN ;
 *   2. sur les six points d'envoi de l'application, **quatre** ne fixaient aucun
 *      `cacheControl`. Ceux-là recevaient le défaut Supabase — une heure, soit
 *      8 760 fois moins qu'un an.
 *
 * Le premier point relevait d'un rattrapage ponctuel
 * (`scripts/fix-media-cache-control.sh`). Le second est structurel : six façons
 * différentes d'envoyer un fichier dans la même application, c'est ce qui a
 * permis l'oubli. D'où cette constante unique.
 *
 * ⚠️ NE PAS RÉINTRODUIRE D'OPTIONS D'UPLOAD ÉCRITES À LA MAIN. Passer par
 * `mediaUploadOptions()` : c'est le seul moyen que l'oubli ne se reproduise pas.
 */

/**
 * Durée de cache des médias, en secondes — un an.
 *
 * ⚠️ Ce choix ne tient QUE parce que tous les chemins d'envoi sont horodatés :
 *
 *     categories/${Date.now()}.${ext}
 *     products/${Date.now()}-${random}.${ext}
 *     products/gifs/${productId}-${Date.now()}.gif
 *
 * Aucun chemin n'est jamais réutilisé : remplacer une image produit une nouvelle
 * URL, donc un cache d'un an ne peut pas servir une version périmée.
 *
 * ⚠️ Le jour où un envoi écrira à chemin FIXE, cette hypothèse tombe — l'ancienne
 * image resterait affichée un an chez qui l'a déjà vue. Dans ce cas, horodater le
 * chemin plutôt que raccourcir cette valeur.
 */
export const MEDIA_CACHE_CONTROL = '31536000';

export interface MediaUploadOptions {
  cacheControl: string;
  upsert?: boolean;
  contentType?: string;
}

/**
 * Options à passer à `supabase.storage.from(...).upload(...)`.
 *
 * @param extra `upsert`, `contentType`… — tout sauf `cacheControl`, qui est
 *              imposé pour que la valeur reste la même partout.
 */
export function mediaUploadOptions(
  extra: Omit<Partial<MediaUploadOptions>, 'cacheControl'> = {},
): MediaUploadOptions {
  return { ...extra, cacheControl: MEDIA_CACHE_CONTROL };
}

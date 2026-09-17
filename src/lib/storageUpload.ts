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

/* ══════════════════════════════════════════════════════════════════════════
   Redimensionnement à l'envoi
   ══════════════════════════════════════════════════════════════════════════

   ⚠️ POURQUOI

   Le `cache-control` ci-dessus a réglé le fait que les images étaient
   retéléchargées. Il n'a rien réglé à leur POIDS : au 17/09/2026, le bucket
   portait 1 917 objets pour 2,4 Go, avec des PNG de 4096 × 4096 pesant 26 Mo
   affichés dans des emplacements de 800 px. 160 Go d'egress par jour.

   `scripts/resize-media.mjs` rattrape l'existant. Ce code-ci empêche le
   problème de revenir : sans lui, la prochaine image envoyée par l'admin
   repart à 4096 px et tout est à refaire. Les images arrivent d'exports IA
   bruts, jamais retaillés.

   ⚠️ CE QUI EST TRAITÉ, ET RIEN D'AUTRE

   PNG et JPEG, exclusivement, et le format est TOUJOURS conservé. Liste
   blanche et non liste noire : un format inconnu, ou introduit plus tard,
   doit passer intact par défaut plutôt que d'être traité par accident.

   Un GIF animé passé par `canvas` ne garderait que sa PREMIÈRE image —
   l'animation serait détruite en silence. Un SVG serait rastérisé, donc
   ruiné. D'où la liste blanche.

   ⚠️ CE CODE NE DOIT JAMAIS FAIRE ÉCHOUER UN ENVOI

   Toute erreur — décodage impossible, mémoire insuffisante, navigateur sans
   `createImageBitmap` — renvoie le fichier D'ORIGINE. Une image lourde reste
   infiniment préférable à une image perdue : l'admin ne saurait pas quoi
   corriger, et le redimensionnement n'est qu'une optimisation.

   Conséquence assumée : l'opération est silencieuse. Aucun retour à l'écran,
   par choix explicite du 17/09/2026 — l'admin envoie une image, elle est
   envoyée. */

/**
 * Largeur maximale à l'envoi.
 *
 * 2048 px, partout et sans exception, alors que `resize-media.mjs` affine par
 * chemin (1920 pour les fonds de hero, 1600 pour le décor).
 *
 * La différence est délibérée : **au moment de l'envoi, on ne sait pas encore
 * à quoi l'image servira.** Deux des six points d'envoi écrivent d'ailleurs à
 * des chemins génériques (`useMediaLibrary` à la racine, `useFileUpload` avec
 * un dossier variable). Un plafond unique et généreux évite de réduire à
 * 1600 px une image qui finira en fiche produit.
 *
 * 2048 est la valeur qui satisfait le cas le plus exigeant : l'image produit
 * s'affiche au maximum à ~812 px et le zoom vaut ×2,5, soit 2 030 px pour un
 * rendu 1:1 au grossissement maximal (cf. `ProductImageGallery.tsx`).
 *
 * Le script pourra toujours affiner ensuite, en connaissant le chemin.
 */
export const MAX_UPLOAD_WIDTH = 2048;

/**
 * Qualité JPEG — l'échelle 0–1 de `canvas.toBlob`.
 *
 * Aligné sur le q85 du script, mesuré le 17/09 sur une image réelle du
 * catalogue : l'écart aux zones sombres y est de 1,80 sur 255, sous le seuil
 * de visibilité (~3). Le catalogue étant très majoritairement noir, c'est le
 * cas défavorable qui a servi de référence.
 */
const JPEG_QUALITY = 0.85;

/** Les seuls formats redimensionnés. Voir l'avertissement ci-dessus. */
const RESIZABLE_TYPES = new Set(['image/png', 'image/jpeg']);

/**
 * Lit les dimensions d'une image sans la décoder en mémoire.
 *
 * Une balise `<img>` expose `naturalWidth`/`naturalHeight` dès l'en-tête lu,
 * là où `createImageBitmap()` matérialise l'image entière en RGBA — soit
 * `largeur × hauteur × 4` octets. Sur le panoramique 13110 × 3072 du
 * catalogue, cela fait 161 Mo alloués juste pour apprendre sa taille.
 *
 * Les navigateurs appliquent l'orientation EXIF à ces deux propriétés, donc
 * les dimensions rapportées sont bien celles de l'image telle qu'on la voit.
 */
function probeSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Réduit une image à `MAX_UPLOAD_WIDTH` si elle dépasse, en conservant son
 * format et ses proportions.
 *
 * Renvoie le fichier d'origine — jamais une erreur — quand :
 *  - le format n'est ni PNG ni JPEG ;
 *  - l'image est déjà à la bonne largeur ou plus petite ;
 *  - elle est trop grande pour être décodée sans risque ;
 *  - le résultat ne serait pas plus léger que l'original ;
 *  - quoi que ce soit échoue.
 *
 * @param file Le fichier choisi par l'administrateur.
 * @returns Le fichier à envoyer — redimensionné, ou l'original inchangé.
 */
export async function prepareMediaForUpload(file: File): Promise<File> {
  if (!RESIZABLE_TYPES.has(file.type)) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // Dimensions d'abord, décodage ensuite — et seulement si c'est utile.
    const size = await probeSize(file);
    if (!size || size.width <= MAX_UPLOAD_WIDTH) return file;

    const height = Math.round((size.height * MAX_UPLOAD_WIDTH) / size.width);

    // `resizeWidth`/`resizeHeight` font décoder l'image DIRECTEMENT à la
    // taille voulue : le plein format n'est jamais matérialisé. C'est ce qui
    // permet de traiter le panoramique 13110 × 3072 du catalogue — 161 Mo en
    // RGBA — sans risquer l'onglet.
    //
    // `imageOrientation: 'from-image'` applique l'orientation EXIF au
    // décodage. SANS lui, une photo prise à l'horizontale et redressée par
    // son seul en-tête ressortirait COUCHÉE : le canvas ne recopie aucune
    // métadonnée, la correction serait perdue en silence.
    bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
      resizeWidth: MAX_UPLOAD_WIDTH,
      resizeHeight: height,
      resizeQuality: 'high',
    });

    const canvas = document.createElement('canvas');
    canvas.width = MAX_UPLOAD_WIDTH;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Par défaut le canvas est TRANSPARENT, ce qui préserve l'alpha des PNG —
    // les découpes produit du catalogue en dépendent. Ne jamais y peindre un
    // fond : elles se retrouveraient sur du blanc ou du noir.
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, MAX_UPLOAD_WIDTH, height);

    // Le type de sortie est celui de l'entrée : le format ne change JAMAIS.
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type, file.type === 'image/jpeg' ? JPEG_QUALITY : undefined);
    });

    // Un PNG déjà bien optimisé peut ressortir plus lourd de l'encodeur du
    // navigateur, moins bon que celui du script. Dans ce cas l'original gagne.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    // Volontairement silencieux : l'envoi doit aboutir quoi qu'il arrive.
    return file;
  } finally {
    bitmap?.close();
  }
}

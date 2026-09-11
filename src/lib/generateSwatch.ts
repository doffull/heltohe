import { supabase } from '@/integrations/supabase/client';
import type { ColorOption, Product } from '@/types';
import { edgeErrorMessage } from '@/lib/edgeFunctionError';

export interface SwatchResult {
  hex: string;
  hex2?: string | null;
  label: string;
  observations?: string[];
}

/**
 * Demande à l'IA la couleur dominante du vêtement à partir de ses photos.
 * Retourne null si aucune photo exploitable ou si la couleur n'est pas identifiable.
 */
export async function generateSwatchFromImages(input: {
  image?: string;
  galleryImages?: string[];
  name?: string;
  category?: string;
}): Promise<SwatchResult> {
  const imageUrls = [input.image, ...(input.galleryImages || [])]
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u))
    .slice(0, 4);

  if (imageUrls.length === 0) {
    throw new Error('Ajoutez au moins une photo produit avant de générer la pastille.');
  }

  const { data, error } = await supabase.functions.invoke('product-ai-helpers', {
    body: {
      action: 'swatch',
      name: input.name,
      category: input.category,
      imageUrl: imageUrls[0],
      imageUrls,
    },
  });

  if (error) throw new Error(await edgeErrorMessage(error));
  const res = data as any;
  if (res?.error) throw new Error(res.error);
  if (!res?.hex) throw new Error("Couleur non identifiable sur les photos.");

  return {
    hex: res.hex,
    hex2: res.hex2 || null,
    label: res.label,
    observations: Array.isArray(res.observations) ? res.observations : undefined,
  };
}

/** Construit l'option couleur à partir du résultat IA. `filterOnly` par défaut si mono-coloris. */
export function swatchToColorOption(res: SwatchResult, opts?: { filterOnly?: boolean; image?: string }): ColorOption {
  return {
    color: res.hex,
    color2: res.hex2 || null,
    label: res.label,
    swatchImage: null,
    filterOnly: opts?.filterOnly ?? true,
    ...(opts?.image ? { image: opts.image, images: [opts.image] } : {}),
  };
}

/** Génère la pastille d'un produit existant (utilisé pour la génération en masse). */
export async function generateSwatchForProduct(product: Product): Promise<ColorOption> {
  const res = await generateSwatchFromImages({
    image: product.image,
    galleryImages: product.galleryImages,
    name: product.name,
    category: product.category,
  });
  return swatchToColorOption(res, { filterOnly: true });
}

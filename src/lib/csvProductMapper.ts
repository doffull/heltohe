// Maps a WooCommerce CSV export row to a Supabase products row.
// Handles the French headers from the official WP "Export Products" tool.

export interface MappedCsvProduct {
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  image: string;
  images: string[];
  category: string;
  stock: number;
  description: string | null;
  is_active: boolean;
  sizes: string[];
  colors: string[];
  tags: string[];
  type: string;
}

const stripHtml = (s: string) =>
  s ? s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() : '';

const toNumber = (v: any): number => {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const splitList = (v: any, sep = ','): string[] => {
  if (!v) return [];
  return String(v)
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);
};

// Look up a column by case-insensitive partial match on header keywords
function pick(row: Record<string, any>, keywords: string[]): any {
  const keys = Object.keys(row);
  for (const kw of keywords) {
    const k = keys.find((h) => h.toLowerCase().includes(kw.toLowerCase()));
    if (k && row[k] !== '' && row[k] !== null && row[k] !== undefined) return row[k];
  }
  return '';
}

// Find size/color values from "Nom de l'attribut N" + "Valeur(s) de l'attribut N" pairs
function extractAttributeValues(row: Record<string, any>, target: 'size' | 'color'): string[] {
  const sizeKw = ['taille', 'size', 'pointure'];
  const colorKw = ['couleur', 'color', 'coloris'];
  const matchKw = target === 'size' ? sizeKw : colorKw;
  const out: string[] = [];
  const keys = Object.keys(row);
  // Look for attribute pairs (1..10)
  for (let i = 1; i <= 10; i++) {
    const nameKey = keys.find(
      (k) => k.toLowerCase().includes(`attribut ${i}`) && k.toLowerCase().includes('nom')
    );
    const valueKey = keys.find(
      (k) => k.toLowerCase().includes(`attribut ${i}`) && k.toLowerCase().includes('valeur')
    );
    if (!nameKey || !valueKey) continue;
    const attrName = String(row[nameKey] || '').toLowerCase();
    if (matchKw.some((kw) => attrName.includes(kw))) {
      out.push(...splitList(row[valueKey], '|'), ...splitList(row[valueKey], ','));
    }
  }
  return Array.from(new Set(out.filter(Boolean)));
}

export function mapCsvRowToProduct(row: Record<string, any>): MappedCsvProduct {
  const id = pick(row, ['id']);
  const type = String(pick(row, ['type'])).toLowerCase() || 'simple';
  const name = String(pick(row, ['nom', 'name'])).trim() || 'Sans titre';
  const skuRaw = String(pick(row, ['ugs', 'sku'])).trim();
  const sku = skuRaw || (id ? `wc-${id}` : `wc-${name.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`);

  const price = toNumber(pick(row, ['tarif régulier', 'regular price', 'prix régulier']));
  const sale = toNumber(pick(row, ['tarif promo', 'sale price', 'prix promo']));
  const stock = Math.round(toNumber(pick(row, ['stock'])));

  const categoriesRaw = String(pick(row, ['catégories', 'categories'])); // "A, B > C"
  const category =
    splitList(categoriesRaw)[0]?.split('>').pop()?.trim() || 'Divers';

  const images = splitList(pick(row, ['images']));
  const description = stripHtml(String(pick(row, ['description']))) || null;
  const published = String(pick(row, ['publié', 'published']));
  const is_active = published === '' ? true : published === '1' || published.toLowerCase() === 'true';

  const tags = splitList(pick(row, ['étiquettes', 'tags']));

  return {
    name,
    sku,
    price: price || sale || 0,
    sale_price: sale > 0 && sale < price ? sale : null,
    image: images[0] || '/placeholder.svg',
    images,
    category,
    stock,
    description,
    is_active,
    sizes: extractAttributeValues(row, 'size'),
    colors: extractAttributeValues(row, 'color'),
    tags,
    type,
  };
}

// Filter out variation rows; keep simple/variable parents
export function isImportableRow(row: Record<string, any>): boolean {
  const type = String(pick(row, ['type'])).toLowerCase();
  if (!type) return true;
  return type !== 'variation';
}

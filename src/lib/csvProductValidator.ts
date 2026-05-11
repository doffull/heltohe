import type { MappedCsvProduct } from './csvProductMapper';

export type RowIssues = {
  errors: string[];
  warnings: string[];
};

export type ValidatedRow = MappedCsvProduct & RowIssues & {
  status: 'ok' | 'warning' | 'error';
};

const URL_RE = /^https?:\/\/[^\s]+$/i;

export function validateHeaders(headers: string[]): { missing: string[]; ok: boolean } {
  const lower = headers.map(h => h.toLowerCase());
  const has = (kws: string[]) => kws.some(kw => lower.some(h => h.includes(kw)));
  const missing: string[] = [];
  if (!has(['nom', 'name'])) missing.push('Nom / Name');
  if (!has(['ugs', 'sku', 'id'])) missing.push('UGS / SKU / ID');
  if (!has(['tarif', 'price', 'prix'])) missing.push('Tarif régulier / Price');
  return { missing, ok: missing.length === 0 };
}

export function validateMappedRows(
  rows: MappedCsvProduct[],
  existingSkus: Set<string>
): ValidatedRow[] {
  const skuCounts = new Map<string, number>();
  rows.forEach(r => {
    const k = r.sku.trim().toLowerCase();
    skuCounts.set(k, (skuCounts.get(k) || 0) + 1);
  });

  return rows.map((row): ValidatedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.name || row.name.trim() === '' || row.name === 'Sans titre') {
      errors.push('Nom manquant');
    }
    if (!row.sku || row.sku.trim() === '') {
      errors.push('SKU manquant');
    } else if ((skuCounts.get(row.sku.trim().toLowerCase()) || 0) > 1) {
      errors.push('SKU dupliqué dans le fichier');
    } else if (existingSkus.has(row.sku)) {
      warnings.push('SKU déjà existant en base');
    }

    if (!Number.isFinite(row.price) || row.price <= 0) {
      errors.push('Prix invalide (≤ 0)');
    }
    if (row.sale_price !== null) {
      if (row.sale_price < 0) {
        errors.push('Prix promo négatif');
      } else if (row.sale_price >= row.price) {
        warnings.push('Prix promo ≥ prix régulier');
      }
    }

    if (!Number.isFinite(row.stock) || row.stock < 0) {
      errors.push('Stock invalide');
    }

    if (!row.image || row.image === '/placeholder.svg') {
      warnings.push('Image manquante');
    } else if (!URL_RE.test(row.image)) {
      warnings.push('URL image invalide');
    }

    if (!row.category || row.category === 'Divers') {
      warnings.push('Catégorie manquante');
    }

    const status: ValidatedRow['status'] =
      errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok';

    return { ...row, errors, warnings, status };
  });
}

export function buildErrorReportCsv(rows: ValidatedRow[]): string {
  const header = 'SKU,Nom,Statut,Erreurs,Avertissements\n';
  const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
  const lines = rows.map(r =>
    [
      escape(r.sku),
      escape(r.name),
      r.status,
      escape(r.errors.join(' | ')),
      escape(r.warnings.join(' | ')),
    ].join(',')
  );
  return header + lines.join('\n');
}

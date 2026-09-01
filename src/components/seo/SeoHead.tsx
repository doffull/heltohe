import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { useReviewStats } from '@/hooks/useProductReviews';
import { SITE_URL, absoluteUrl } from '@/lib/site';

interface SeoHeadProps {
  forceNoIndex?: boolean;
  /** Titre spécifique à la page (produit, catégorie…) */
  title?: string;
  /** Description spécifique à la page */
  description?: string;
  /** Image de partage spécifique à la page */
  image?: string;
  /** og:type — "product" sur les fiches produit */
  type?: string;
}

/**
 * Métadonnées SEO par route + interrupteur global de visibilité Google.
 * Piloté depuis /admin/seo (colonnes seo_* de design_settings).
 * Les pages peuvent surcharger titre / description / image / og:type.
 */
export function SeoHead({ forceNoIndex = false, title, description, image, type }: SeoHeadProps) {
  const { pathname } = useLocation();
  const { data: settings } = useDesignSettings();
  const s = (settings as any) || {};

  const indexable = s.seoIndexable !== false && !forceNoIndex && s.maintenanceEnabled !== true;
  const robotsParts: string[] = indexable ? ['index', 'follow'] : ['noindex', 'nofollow'];
  if (indexable && s.seoNoImageIndex) robotsParts.push('noimageindex');

  const siteName = (s.seoDefaultTitle || s.siteName || 'HELVETICA MOUNTAIN PIONEERS').trim();
  const finalTitle = (title || siteName).trim();
  const finalDescription = (description || s.seoDefaultDescription || s.siteTagline || '').trim();
  const canonical = absoluteUrl(pathname);
  const ogImage = image || s.seoOgImage || '';

  return (
    <Helmet>
      <title>{finalTitle}</title>
      {finalDescription && <meta name="description" content={finalDescription} />}
      <meta name="robots" content={robotsParts.join(', ')} />
      <meta name="googlebot" content={robotsParts.join(', ')} />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={finalTitle} />
      {finalDescription && <meta property="og:description" content={finalDescription} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type || 'website'} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:title" content={finalTitle} />
      {finalDescription && <meta name="twitter:description" content={finalDescription} />}
    </Helmet>
  );
}

/** JSON-LD Organization + WebSite — posé une seule fois sur l'accueil. */
export function OrganizationJsonLd() {
  const { data: settings } = useDesignSettings();
  const s = (settings as any) || {};
  const name = s.siteName || 'Helvetica Mountain Pioneers';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name,
        url: SITE_URL,
        ...(s.hudLogo ? { logo: s.hudLogo } : {}),
        ...(s.contactEmail ? { email: s.contactEmail } : {}),
        ...(Array.isArray(s.socialLinks) && s.socialLinks.length
          ? { sameAs: s.socialLinks.map((l: any) => l?.url).filter(Boolean) }
          : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name,
        url: SITE_URL,
        inLanguage: 'fr-FR',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/boutique?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

function plainText(html?: string, max = 155): string {
  const txt = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return txt.length > max ? `${txt.slice(0, max - 1).trimEnd()}…` : txt;
}

/**
 * Métadonnées + JSON-LD Product d'une fiche produit :
 * titre/description/og uniques et rich snippets Google (prix, dispo, avis).
 */
export function ProductSeo({ product }: { product: any }) {
  const { pathname } = useLocation();
  const { data: settings } = useDesignSettings();
  const { data: stats } = useReviewStats(product?.id);
  const s = (settings as any) || {};
  if (!product) return null;

  const brand = s.siteName || 'HELVETICA MOUNTAIN PIONEERS';
  const name = product.name || '';
  const description =
    plainText(product.description) ||
    `${name} — pièce technique ${brand}. Livraison et retours simplifiés.`;
  const title = `${name} — ${brand}`;
  const canonical = absoluteUrl(pathname);
  const images = [product.image, ...(Array.isArray(product.galleryImages) ? product.galleryImages : [])]
    .filter(Boolean)
    .slice(0, 6);

  const inStock = product.inStock !== false && product.status !== 'draft' && !product.deletedAt;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { '@type': 'Brand', name: brand },
    ...(product.category ? { category: product.category } : {}),
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'EUR',
      price: Number(product.price) || 0,
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...(s.siteName ? { seller: { '@type': 'Organization', name: s.siteName } } : {}),
    },
  };

  if (stats && stats.count > 0 && stats.average > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(stats.average.toFixed(1)),
      reviewCount: stats.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
      <SeoHead title={title} description={description} image={images[0]} type="product" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
    </>
  );
}

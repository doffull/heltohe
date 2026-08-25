import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useDesignSettings } from '@/hooks/useDesignSettings';

const SITE_URL = 'https://helvetica-mp.net';

/**
 * Métadonnées SEO par route + interrupteur global de visibilité Google.
 * Piloté depuis /admin/seo (colonnes seo_* de design_settings).
 */
export function SeoHead({ forceNoIndex = false }: { forceNoIndex?: boolean }) {
  const { pathname } = useLocation();
  const { data: settings } = useDesignSettings();
  const s = (settings as any) || {};

  const indexable = s.seoIndexable !== false && !forceNoIndex && s.maintenanceEnabled !== true;
  const robotsParts: string[] = indexable ? ['index', 'follow'] : ['noindex', 'nofollow'];
  if (indexable && s.seoNoImageIndex) robotsParts.push('noimageindex');

  const title = (s.seoDefaultTitle || s.siteName || 'HELVETICA MOUNTAIN PIONEERS').trim();
  const description = (s.seoDefaultDescription || s.siteTagline || '').trim();
  const canonical = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
  const ogImage = s.seoOgImage || '';

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={robotsParts.join(', ')} />
      <meta name="googlebot" content={robotsParts.join(', ')} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}

/** JSON-LD Organization — posé une seule fois sur l'accueil. */
export function OrganizationJsonLd() {
  const { data: settings } = useDesignSettings();
  const s = (settings as any) || {};
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s.siteName || 'Helvetica Mountain Pioneers',
    url: SITE_URL,
    ...(s.hudLogo ? { logo: s.hudLogo } : {}),
    ...(s.contactEmail ? { email: s.contactEmail } : {}),
    ...(Array.isArray(s.socialLinks) && s.socialLinks.length
      ? { sameAs: s.socialLinks.map((l: any) => l?.url).filter(Boolean) }
      : {}),
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

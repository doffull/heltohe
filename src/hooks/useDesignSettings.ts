import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DesignSettings } from '@/types';
import { INITIAL_DESIGN_SETTINGS } from '@/data/initialData';
import { Json } from '@/integrations/supabase/types';

// Map DB row → DesignSettings
function dbToSettings(db: Record<string, unknown>): DesignSettings {
  const base = { ...INITIAL_DESIGN_SETTINGS };
  return {
    ...base,
    // Text fields
    sidebarBg: (db.sidebar_bg as string) || base.sidebarBg,
    accentColor: (db.accent_color as string) || base.accentColor,
    hudLogo: (db.hud_logo as string) || base.hudLogo,
    unitIdLabel: (db.unit_id_label as string) || base.unitIdLabel,
    customUnitID: (db.custom_unit_id as string) || base.customUnitID,
    statsLabel: (db.stats_label as string) || base.statsLabel,
    statsSubLabel: (db.stats_sub_label as string) || base.statsSubLabel,
    backgroundWatermark: (db.background_watermark as string) ?? base.backgroundWatermark,
    sidebarImage: (db.sidebar_image as string) || undefined,
    headerPreset: (db.header_preset as string) || base.headerPreset,
    headerBgColor: (db.header_bg_color as string) ?? base.headerBgColor,
    headerTextColor: (db.header_text_color as string) ?? base.headerTextColor,
    socialDisplayMode: ((db.social_display_mode as string) || base.socialDisplayMode) as 'icons' | 'text' | 'both',
    siteName: (db.site_name as string) ?? base.siteName,
    siteTagline: (db.site_tagline as string) ?? base.siteTagline,
    contactEmail: (db.contact_email as string) ?? base.contactEmail,
    contactPhone: (db.contact_phone as string) ?? base.contactPhone,
    // Logo customization
    logoSize: (db.logo_size as number) ?? 40,
    logoBackgroundShape: ((db.logo_background_shape as string) || 'none') as any,
    logoBackgroundColor: (db.logo_background_color as string) ?? '',
    logoBackgroundPadding: (db.logo_background_padding as number) ?? 8,
    footerLogo: (db.footer_logo as string) ?? '',
    faviconUrl: (db.favicon_url as string) ?? '',
    footerConfig: ((db.footer_config as any) ?? {}) as any,

    // adminNotificationEmail and Colissimo sender fields moved to admin_config table

    // Sidebar HUD text fields
    sidebarBrandName: (db.sidebar_brand_name as string) ?? base.sidebarBrandName,
    sidebarBrandSubtitle: (db.sidebar_brand_subtitle as string) ?? base.sidebarBrandSubtitle,
    sidebarInfoText: (db.sidebar_info_text as string) ?? base.sidebarInfoText,
    sidebarProductTitle: (db.sidebar_product_title as string) ?? base.sidebarProductTitle,
    sidebarProductDescription: (db.sidebar_product_description as string) ?? base.sidebarProductDescription,
    mobileSidebarImage: (db.mobile_sidebar_image as string) || undefined,
    mobileSidebarMediaType: ((db.mobile_sidebar_media_type as string) || 'image') as 'image' | 'video',

    // Sidebar show/hide booleans (DB columns now exist)
    showSidebarProductCard: db.show_sidebar_product_card !== null ? (db.show_sidebar_product_card as boolean) : true,
    showSidebarSizes: db.show_sidebar_sizes !== null ? (db.show_sidebar_sizes as boolean) : true,
    showSidebarStats: db.show_sidebar_stats !== null ? (db.show_sidebar_stats as boolean) : true,
    showSidebarGallery: db.show_sidebar_gallery !== null ? (db.show_sidebar_gallery as boolean) : true,
    showSidebarProductNumber: db.show_sidebar_product_number !== null ? (db.show_sidebar_product_number as boolean) : true,

    // Sidebar slider
    sidebarSliderEnabled: db.sidebar_slider_enabled !== null ? (db.sidebar_slider_enabled as boolean) : true,
    sidebarSliderSpeed: (db.sidebar_slider_speed as number) ?? 6000,
    sidebarSliderMaxProducts: (db.sidebar_slider_max_products as number) ?? 5,

    // Sidebar image opacity + sizes
    sidebarImageOpacity: (db.sidebar_image_opacity as number) ?? 1,
    sidebarSizes: (db.sidebar_sizes as string[]) || base.sidebarSizes,
    globalProductSizes: (db.global_product_sizes as string[]) || base.globalProductSizes || ['XS','S','M','L','XL','XXL','XXXL'],

    // Stat bar colors
    statBarFilledColor: (db.stat_bar_filled_color as string) ?? '#ffffff',
    statBarEmptyColor: (db.stat_bar_empty_color as string) ?? '#333333',
    
    // Booleans
    showLogo: db.show_logo !== null ? (db.show_logo as boolean) : base.showLogo,
    showStats: db.show_stats !== null ? (db.show_stats as boolean) : base.showStats,
    showUnitID: db.show_unit_id !== null ? (db.show_unit_id as boolean) : base.showUnitID,
    showOverlays: db.show_overlays !== null ? (db.show_overlays as boolean) : base.showOverlays,
    sidebarGradient: db.sidebar_gradient !== null ? (db.sidebar_gradient as boolean) : base.sidebarGradient,
    headerFixed: db.header_fixed !== null ? (db.header_fixed as boolean) : base.headerFixed,
    isSlideshowActive: db.is_slideshow_active !== null ? (db.is_slideshow_active as boolean) : base.isSlideshowActive,
    sliderAutoPlay: db.slider_auto_play !== null ? (db.slider_auto_play as boolean) : base.sliderAutoPlay,
    showSliderOverlay: db.show_slider_overlay !== null ? (db.show_slider_overlay as boolean) : base.showSliderOverlay,
    sliderGrayscale: db.slider_grayscale !== null ? (db.slider_grayscale as boolean) : base.sliderGrayscale,
    
    // Numbers
    gradientIntensity: (db.gradient_intensity as number) ?? base.gradientIntensity,
    glitchDuration: (db.glitch_duration as number) ?? base.glitchDuration,
    glitchIntensity: (db.glitch_intensity as number) ?? base.glitchIntensity,
    clickScale: (db.click_scale as number) ?? base.clickScale,
    slideshowSpeed: (db.slideshow_speed as number) ?? base.slideshowSpeed,
    sliderSpeed: (db.slider_speed as number) ?? base.sliderSpeed,
    categoryColumns: (db.category_columns as number) ?? base.categoryColumns,
    sidebarReappearDelay: (db.sidebar_reappear_delay as number) ?? base.sidebarReappearDelay,

    // Extra text/string fields
    sliderHeight: (db.slider_height as string) ?? base.sliderHeight,
    siteSpacing: (db.site_spacing as string) ?? base.siteSpacing,

    // Extra JSONB
    categoryLayout: (db.category_layout as typeof base.categoryLayout) || base.categoryLayout,
    
    // JSONB fields
    stats: (db.stats as typeof base.stats) || base.stats,
    hudButtons: (db.hud_buttons as typeof base.hudButtons) || base.hudButtons,
    logoStyle: (db.logo_style as typeof base.logoStyle) || base.logoStyle,
    statsStyle: (db.stats_style as typeof base.statsStyle) || base.statsStyle,
    unitIdStyle: (db.unit_id_style as typeof base.unitIdStyle) || base.unitIdStyle,
    socialStyle: (db.social_style as typeof base.socialStyle) || base.socialStyle,
    backgroundMedia: (db.background_media as typeof base.backgroundMedia) || base.backgroundMedia,
    heroSlides: (db.hero_slides as typeof base.heroSlides) || base.heroSlides,
    techwearHero: (db.techwear_hero as typeof base.techwearHero) || base.techwearHero,
    socialLinks: (db.social_links as typeof base.socialLinks) || base.socialLinks,
    homeSections: (db.home_sections as typeof base.homeSections) || base.homeSections,
    homeCustomSections: ((db.home_custom_sections as any) ?? []) as any,
    homePageBlocks: ((db.home_page_blocks as any) ?? []) as any,
    homeTexts: ((db.home_texts as any) ?? {}) as any,
    legalPages: (((db as any).legal_pages as any) ?? {}) as any,
    presets: (db.presets as typeof base.presets) || base.presets,
    schedules: (db.schedules as typeof base.schedules) || base.schedules,
    pages: (db.pages as typeof base.pages) || base.pages,
    // Real columns previously not mapped
    headerNavItems: ((db.header_nav_items as any) ?? []) as any,
    topBanner: ((db.top_banner as any) ?? null) as any,
    adminSectionColors: ((db.admin_section_colors as any) ?? {}) as any,
    // Mannequin hotspots — persist & restore from DB
    mannequinHotspots: (db.mannequin_hotspots as typeof base.mannequinHotspots) ?? [],
    // Sidebar brand position
    sidebarBrandPosition: (((db as any).sidebar_brand_position as string) || 'top') as 'top' | 'center' | 'bottom',
    // Legal / company info
    legalCompanyName: (db.legal_company_name as string) ?? '',
    legalCompanyForm: (db.legal_company_form as string) ?? '',
    legalCapital: (db.legal_capital as string) ?? '',
    legalAddress: (db.legal_address as string) ?? '',
    legalZip: (db.legal_zip as string) ?? '',
    legalCity: (db.legal_city as string) ?? '',
    legalSiret: (db.legal_siret as string) ?? '',
    legalRcs: (db.legal_rcs as string) ?? '',
    legalVat: (db.legal_vat as string) ?? '',
    legalDirector: (db.legal_director as string) ?? '',
    legalRgpdEmail: (db.legal_rgpd_email as string) ?? '',
    legalReturnEmail: (db.legal_return_email as string) ?? '',
    // Sidebar newsletter widget + voice command
    showSidebarNewsletter: db.show_sidebar_newsletter !== null && db.show_sidebar_newsletter !== undefined ? (db.show_sidebar_newsletter as boolean) : true,
    sidebarNewsletterTitle: (db.sidebar_newsletter_title as string) ?? 'Newsletter',
    sidebarNewsletterCta: (db.sidebar_newsletter_cta as string) ?? "Je m'inscris",
    voiceCommandEnabled: db.voice_command_enabled !== null && db.voice_command_enabled !== undefined ? (db.voice_command_enabled as boolean) : true,
    voiceOnboardingHint: db.voice_onboarding_hint !== null && db.voice_onboarding_hint !== undefined ? (db.voice_onboarding_hint as boolean) : true,
    colorDisplayMode: ((db.color_display_mode as string) || base.colorDisplayMode || 'swatches') as 'swatches' | 'images',
    // SEO / visibilité Google
    seoIndexable: db.seo_indexable !== null && db.seo_indexable !== undefined ? (db.seo_indexable as boolean) : true,
    seoNoImageIndex: db.seo_noimageindex === true,
    seoDefaultTitle: (db.seo_default_title as string) ?? '',
    seoDefaultDescription: (db.seo_default_description as string) ?? '',
    seoOgImage: (db.seo_og_image as string) ?? '',
    // Mode maintenance
    maintenanceEnabled: db.maintenance_enabled === true,
    maintenanceTitle: (db.maintenance_title as string) ?? '',
    maintenanceMessage: (db.maintenance_message as string) ?? '',
    maintenanceUntil: (db.maintenance_until as string) ?? '',
    maintenanceImage: (db.maintenance_image as string) ?? '',
    maintenanceBg: (db.maintenance_bg as string) ?? '',
    maintenanceAdminBypass: db.maintenance_admin_bypass !== null && db.maintenance_admin_bypass !== undefined ? (db.maintenance_admin_bypass as boolean) : true,
    // Piggyback fields on settings_json
    securityOverlay: ((db.settings_json as any)?.securityOverlay) ?? {
      enabled: true, text: '', showEmail: true, opacity: 0.05, angle: -30, density: 60,
      color: 'currentColor', blockPrintScreen: true, disableRightClick: true,
    },
    productGridLayout: ((db.settings_json as any)?.productGridLayout) ?? 'classic',
    trustpilot: ((db.settings_json as any)?.trustpilot) ?? {
      enabled: false,
      businessUnitId: '',
      domain: '',
      locale: 'fr-FR',
      showInFooter: true,
    },
    reviewsSettings: ((db.settings_json as any)?.reviewsSettings) ?? {
      autoApprove: false,
      requireVerifiedPurchase: true,
      showOnProductCards: true,
    },
    productDefaults: ((db.settings_json as any)?.productDefaults) ?? {
      material: '100% polyester, rembourrage synthétique, doublure polyester.',
      careInstructions: 'Lavage 30°C, séchage à plat, ne pas repasser.',
      childSizes: ['2A', '4A', '6A', '8A', '10A', '12A', '14A'],
    },
    productTrustBadges: ((db.settings_json as any)?.productTrustBadges) ?? base.productTrustBadges,
    // Piggyback fields on settings_json (no dedicated DB column)
    megaMenuLinks: ((db.settings_json as any)?.megaMenuLinks) ?? [],
    sidebarNavLinks: ((db.settings_json as any)?.sidebarNavLinks) ?? [],
    unifiedFab: ((db.settings_json as any)?.unifiedFab) ?? null,
    promoParallax: ((db.settings_json as any)?.promoParallax) ?? null,
    pageTransition: ((db.settings_json as any)?.pageTransition) ?? 'fade',
    fontHeading: ((db.settings_json as any)?.fonts?.heading) ?? '',
    fontBody: ((db.settings_json as any)?.fonts?.body) ?? '',
    sliderImageOpacity: ((db.settings_json as any)?.sliderImageOpacity) ?? 1,
    homeSectionProducts: ((db.settings_json as any)?.homeSectionProducts) ?? {},
    homeFeedSections: ((db.settings_json as any)?.homeFeedSections) ?? [],
    gifPresets: ((db.settings_json as any)?.gifPresets) ?? [],
    pageOverrides: ((db.settings_json as any)?.pageOverrides) ?? {},
    showProductStatusBadges: ((db.settings_json as any)?.showProductStatusBadges) ?? false,
    soldOutBadgeDefault: ((db.settings_json as any)?.soldOutBadgeDefault) ?? true,
    soldOutBadgeLabel: ((db.settings_json as any)?.soldOutBadgeLabel) ?? 'Coming soon',
    socialDisplay: ((db.settings_json as any)?.socialDisplay) ?? {
      showInHeader: false,
      showInMobileMenu: true,
      showOnContact: true,
      showOnMaintenance: true,
      newTab: true,
      iconSize: 18,
      shape: 'square',
      color: '',
    },

  } as DesignSettings;
}

// Map DesignSettings → DB row (only columns that exist in the table)
function settingsToDb(s: DesignSettings) {
  return {
    settings_key: 'main',
    sidebar_bg: s.sidebarBg,
    accent_color: s.accentColor,
    hud_logo: s.hudLogo,
    unit_id_label: s.unitIdLabel,
    custom_unit_id: s.customUnitID,
    stats_label: s.statsLabel,
    stats_sub_label: s.statsSubLabel,
    background_watermark: s.backgroundWatermark,
    sidebar_image: s.sidebarImage || null,
    header_preset: s.headerPreset,
    header_bg_color: s.headerBgColor,
    header_text_color: s.headerTextColor,
    header_fixed: s.headerFixed,
    social_display_mode: s.socialDisplayMode,
    site_name: s.siteName ?? '',
    site_tagline: s.siteTagline ?? '',
    contact_email: s.contactEmail ?? '',
    contact_phone: s.contactPhone ?? '',
    // Logo customization
    logo_size: s.logoSize ?? 40,
    logo_background_shape: s.logoBackgroundShape ?? 'none',
    logo_background_color: s.logoBackgroundColor ?? '',
    logo_background_padding: s.logoBackgroundPadding ?? 8,
    footer_logo: s.footerLogo ?? '',
    favicon_url: s.faviconUrl ?? '',
    footer_config: ((s as any).footerConfig ?? {}) as unknown as Json,

    // adminNotificationEmail and Colissimo sender fields moved to admin_config table
    // Core show/hide booleans
    show_logo: s.showLogo,
    show_stats: s.showStats,
    show_unit_id: s.showUnitID,
    show_overlays: s.showOverlays,
    // Sidebar show/hide booleans (NOW persisted to DB)
    show_sidebar_product_card: s.showSidebarProductCard,
    show_sidebar_sizes: s.showSidebarSizes,
    show_sidebar_stats: s.showSidebarStats,
    show_sidebar_gallery: s.showSidebarGallery,
    show_sidebar_product_number: s.showSidebarProductNumber,
    // Sidebar slider
    sidebar_slider_enabled: s.sidebarSliderEnabled ?? true,
    sidebar_slider_speed: s.sidebarSliderSpeed ?? 6000,
    sidebar_slider_max_products: s.sidebarSliderMaxProducts ?? 5,
    // Sidebar text/identity
    sidebar_brand_name: s.sidebarBrandName ?? '',
    sidebar_brand_subtitle: s.sidebarBrandSubtitle ?? '',
    sidebar_info_text: s.sidebarInfoText ?? '',
    sidebar_product_title: s.sidebarProductTitle ?? '',
    sidebar_product_description: s.sidebarProductDescription ?? '',
    mobile_sidebar_image: s.mobileSidebarImage || null,
    mobile_sidebar_media_type: s.mobileSidebarMediaType ?? 'image',
    // Sidebar image opacity + sizes
    sidebar_image_opacity: s.sidebarImageOpacity ?? 1,
    sidebar_sizes: s.sidebarSizes as unknown as Json,
    global_product_sizes: (s.globalProductSizes ?? ['XS','S','M','L','XL','XXL','XXXL']) as unknown as Json,
    // Stat bar colors
    stat_bar_filled_color: s.statBarFilledColor ?? '#ffffff',
    stat_bar_empty_color: s.statBarEmptyColor ?? '#333333',
    // Other toggles
    sidebar_gradient: s.sidebarGradient,
    gradient_intensity: s.gradientIntensity,
    is_slideshow_active: s.isSlideshowActive,
    slideshow_speed: s.slideshowSpeed,
    slider_auto_play: s.sliderAutoPlay,
    slider_speed: s.sliderSpeed,
    show_slider_overlay: s.showSliderOverlay,
    slider_grayscale: s.sliderGrayscale,
    glitch_duration: s.glitchDuration,
    glitch_intensity: s.glitchIntensity,
    click_scale: s.clickScale,
    category_columns: s.categoryColumns,
    sidebar_reappear_delay: s.sidebarReappearDelay ?? 10000,
    slider_height: s.sliderHeight ?? '100vh',
    site_spacing: s.siteSpacing ?? 'compact',
    category_layout: s.categoryLayout as unknown as Json,
    stats: s.stats as unknown as Json,
    hud_buttons: s.hudButtons as unknown as Json,
    logo_style: s.logoStyle as unknown as Json,
    stats_style: s.statsStyle as unknown as Json,
    unit_id_style: s.unitIdStyle as unknown as Json,
    social_style: s.socialStyle as unknown as Json,
    background_media: s.backgroundMedia as unknown as Json,
    hero_slides: s.heroSlides as unknown as Json,
    techwear_hero: s.techwearHero as unknown as Json,
    social_links: s.socialLinks as unknown as Json,
    home_sections: s.homeSections as unknown as Json,
    home_custom_sections: ((s as any).homeCustomSections ?? []) as unknown as Json,
    home_page_blocks: ((s as any).homePageBlocks ?? []) as unknown as Json,
    home_texts: ((s as any).homeTexts ?? {}) as unknown as Json,
    legal_pages: ((s as any).legalPages ?? {}) as unknown as Json,
    presets: s.presets as unknown as Json,
    schedules: s.schedules as unknown as Json,
    pages: s.pages as unknown as Json,
    // Mannequin hotspots
    mannequin_hotspots: s.mannequinHotspots as unknown as Json,
    // Sidebar brand position
    sidebar_brand_position: (s as any).sidebarBrandPosition ?? 'top',
    // Legal / company info
    legal_company_name: s.legalCompanyName ?? '',
    legal_company_form: s.legalCompanyForm ?? '',
    legal_capital: s.legalCapital ?? '',
    legal_address: s.legalAddress ?? '',
    legal_zip: s.legalZip ?? '',
    legal_city: s.legalCity ?? '',
    legal_siret: s.legalSiret ?? '',
    legal_rcs: s.legalRcs ?? '',
    legal_vat: s.legalVat ?? '',
    legal_director: s.legalDirector ?? '',
    legal_rgpd_email: s.legalRgpdEmail ?? '',
    legal_return_email: s.legalReturnEmail ?? '',
    show_sidebar_newsletter: (s as any).showSidebarNewsletter ?? true,
    sidebar_newsletter_title: (s as any).sidebarNewsletterTitle ?? 'Newsletter',
    sidebar_newsletter_cta: (s as any).sidebarNewsletterCta ?? "Je m'inscris",
    voice_command_enabled: (s as any).voiceCommandEnabled ?? true,
    voice_onboarding_hint: (s as any).voiceOnboardingHint ?? true,
    color_display_mode: s.colorDisplayMode ?? 'swatches',
    // SEO / visibilité Google
    seo_indexable: (s as any).seoIndexable ?? true,
    seo_noimageindex: (s as any).seoNoImageIndex ?? false,
    seo_default_title: (s as any).seoDefaultTitle ?? '',
    seo_default_description: (s as any).seoDefaultDescription ?? '',
    seo_og_image: (s as any).seoOgImage ?? '',
    // Mode maintenance
    maintenance_enabled: (s as any).maintenanceEnabled ?? false,
    maintenance_title: (s as any).maintenanceTitle ?? '',
    maintenance_message: (s as any).maintenanceMessage ?? '',
    maintenance_until: (s as any).maintenanceUntil ? (s as any).maintenanceUntil : null,
    maintenance_image: (s as any).maintenanceImage ?? '',
    maintenance_bg: (s as any).maintenanceBg ?? '',
    maintenance_admin_bypass: (s as any).maintenanceAdminBypass ?? true,
    // Real columns
    header_nav_items: ((s as any).headerNavItems ?? []) as unknown as Json,
    top_banner: ((s as any).topBanner ?? null) as unknown as Json,
    admin_section_colors: ((s as any).adminSectionColors ?? {}) as unknown as Json,
    settings_json: {
      securityOverlay: (s as any).securityOverlay ?? null,
      productGridLayout: (s as any).productGridLayout ?? 'classic',
      trustpilot: (s as any).trustpilot ?? null,
      reviewsSettings: (s as any).reviewsSettings ?? null,
      productDefaults: (s as any).productDefaults ?? null,
      productTrustBadges: (s as any).productTrustBadges ?? null,
      // Piggyback fields (no dedicated columns)
      megaMenuLinks: (s as any).megaMenuLinks ?? [],
      sidebarNavLinks: (s as any).sidebarNavLinks ?? [],
      unifiedFab: (s as any).unifiedFab ?? null,
      promoParallax: (s as any).promoParallax ?? null,
      pageTransition: (s as any).pageTransition ?? 'fade',
      fonts: {
        heading: (s as any).fontHeading ?? '',
        body: (s as any).fontBody ?? '',
      },
      sliderImageOpacity: (s as any).sliderImageOpacity ?? 1,
      homeSectionProducts: (s as any).homeSectionProducts ?? {},
      homeFeedSections: (s as any).homeFeedSections ?? [],
      gifPresets: (s as any).gifPresets ?? [],
      pageOverrides: (s as any).pageOverrides ?? {},
      showProductStatusBadges: (s as any).showProductStatusBadges === true,
      soldOutBadgeDefault: (s as any).soldOutBadgeDefault !== false,
      soldOutBadgeLabel: ((s as any).soldOutBadgeLabel || '').trim() || 'Coming soon',


    } as unknown as Json,
  };
}

const LS_DESIGN_CACHE = 'lvtk-design-cache-v2';
const LEGACY_LS_DESIGN_CACHE = 'lvtk-design-cache-v1';

type CachedDesignSettings = { settings: DesignSettings; savedAt: number };

function readDesignCache(): DesignSettings | null {
  try {
    const raw = localStorage.getItem(LS_DESIGN_CACHE);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedDesignSettings | DesignSettings;
      return 'settings' in parsed ? parsed.settings : parsed;
    }
    const legacy = localStorage.getItem(LEGACY_LS_DESIGN_CACHE);
    if (!legacy) return null;
    return JSON.parse(legacy) as DesignSettings;
  } catch { return null; }
}

function writeDesignCache(s: DesignSettings) {
  try { localStorage.setItem(LS_DESIGN_CACHE, JSON.stringify({ settings: s, savedAt: Date.now() })); } catch { /* ignore quota */ }
}

export function useDesignSettings() {
  return useQuery({
    queryKey: ['design_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('design_settings_public')
        .select('*')
        .eq('settings_key', 'main')
        .maybeSingle();
      if (error) throw error;
      if (!data) return readDesignCache();
      const mapped = dbToSettings(data as Record<string, unknown>);
      writeDesignCache(mapped);
      return mapped;
    },
    // Serve last-known settings instantly, but always re-check the backend.
    // The public site must not keep an old mobile/admin snapshot for minutes.
    initialData: () => readDesignCache() ?? undefined,
    initialDataUpdatedAt: 0,
    staleTime: 0,
    gcTime: 30 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: 15_000,
    retry: 2,
  });
}

export function useSaveDesignSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: DesignSettings) => {
      const payload = settingsToDb(settings);
      // Strip any temporary browser-only URLs (blob:/data:/file:) that would
      // otherwise silently break the site after publish.
      const stripped = JSON.parse(
        JSON.stringify(payload, (_k, v) =>
          typeof v === 'string' && /^(blob:|data:|file:)/i.test(v) ? null : v,
        ),
      );
      stripped.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('design_settings')
        .upsert(stripped, { onConflict: 'settings_key' });
      if (error) throw error;
      // Update local cache immediately so any other tab/device picks up
      // the latest state on next mount without a stale flash.
      writeDesignCache(settings);
    },
    onSuccess: (_data, settings) => {
      queryClient.setQueryData(['design_settings'], settings);
      queryClient.invalidateQueries({ queryKey: ['design_settings'] });
    },
  });
}

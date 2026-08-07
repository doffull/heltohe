// Types for HELVETICA-MP E-commerce Platform

export type ViewType = 'Home' | 'Shop' | 'About' | 'ProductDetail' | 'Dashboard';
export type Language = 'FR' | 'EN';

export interface ColorOption {
  color: string;
  label: string;
  /** Legacy single image — kept in sync with images[0] for backward compat. */
  image?: string;
  /** All images for this variant (main = first). */
  images?: string[];
  /** Optional second color → rendered as a diagonal bicolor split. */
  color2?: string | null;
  /** Optional swatch image / texture (PNG/JPG). Takes priority over color(s) when rendering the chip. */
  swatchImage?: string | null;
  /** True → pastille utilisée uniquement dans les filtres boutique, masquée sur la page produit. */
  filterOnly?: boolean;
}

export interface ProductDefaults {
  material?: string;
  careInstructions?: string;
  childSizes?: string[];
}

export interface Product {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  stock: number;
  sku: string;
  description?: string;
  material?: string;
  careInstructions?: string;
  sizes?: string[];
  colors?: string[];
  colorOptions?: ColorOption[];
  attributes?: Record<string, string>;
  videoUrl?: string;
  tags?: string[];
  promoEndsAt?: string;
  modelHeight?: string;
  modelSizeWorn?: string;
  modelName?: string;
  galleryImages?: string[];
  /** Image affichée au survol de la vignette (effet swap). */
  hoverImage?: string;
  /** Logo affiché à côté du titre du produit (vignette + fiche produit). */
  titleLogo?: string;
  /** Mode d'essai proposé sur la fiche produit. */
  tryonMode?: 'none' | 'photo' | 'mannequin' | 'both';

  templateId?: string | null;
  isActive?: boolean;
  /** Affiche le badge « LIMITED EDITION » sur la vignette et la fiche produit. */
  limitedEdition?: boolean;
  /** Texte personnalisé du badge (défaut : « Limited Edition »). */
  limitedEditionLabel?: string;
  /** Couleur de fond du badge (CSS color). Vide = style par défaut. */
  limitedEditionColor?: string;
  /** Couleur du texte / bordure du badge (CSS color). */
  limitedEditionTextColor?: string;
  /** Position du badge sur l'image. */
  limitedEditionPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
}

export interface Customer {
  name: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  zip: string;
  country: string;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customer: Customer;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  notes?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}

export type AnimationType = 'glitch' | 'pulse' | 'fade' | 'none';

export interface HUDPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface HUDStyle {
  bg: string;
  text: string;
  scale: number;
  animation: AnimationType;
  pos: HUDPosition;
  fontSize?: number;
}

export interface HUDButton {
  id: string;
  label: string;
  url: string;
  style: HUDStyle;
}

export interface HUDStat {
  label: string;
  value: number;
}

export interface BackgroundMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  isCover?: boolean;
}

export interface TechwearColorOption {
  name: string;
  hex: string;
  image: string;          // desktop (default fallback)
  imageTablet?: string;
  imageMobile?: string;
  mediaType?: 'image' | 'video';
  mediaTypeTablet?: 'image' | 'video';
  mediaTypeMobile?: 'image' | 'video';
  videoLoop?: boolean;
  videoMuted?: boolean;
  videoAutoplay?: boolean;
}

export interface TechwearBackground {
  type: 'gradient' | 'color' | 'image' | 'video';
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  overlayOpacity?: number; // 0-1
}

export interface TechwearStat {
  label: string;
  value: number;
}

export interface TechwearHeroSlideData {
  id: string;
  name?: string;
  productId: string | null;
  modelBadge: { line1: string; line2: string };
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  stats: TechwearStat[];
  visibleSizes: string[];
  defaultSize: string;
  colorOptions: TechwearColorOption[];
  defaultColor: number;
  imageFit: 'cover' | 'contain' | 'fill' | 'none';
  imagePosition: string;
  showStats: boolean;
  showColors: boolean;
  showSizes: boolean;
  showModelBadge: boolean;
  background?: TechwearBackground;
  cardSize?: 'sm' | 'md' | 'lg' | 'xl';
  imageOverflow?: boolean;
  ctaStyle?: TechwearCtaStyle;
  // Free positioning (admin draggable). When omitted → defaults from CSS.
  modelBadgePos?: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
  sidePanelPos?: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
}

export type TechwearCtaVariant = 'glossy' | 'glass' | 'neon' | 'metal' | 'outline' | 'minimal';
export type TechwearCtaSize = 'sm' | 'md' | 'lg' | 'xl';
export type TechwearCtaRadius = 'none' | 'sm' | 'md' | 'pill';

export interface TechwearCtaPositionPart {
  x: number; // 0-100 % of image area
  y: number; // 0-100
  layout: 'row' | 'column';
}

export interface TechwearCtaStyle {
  enabled: boolean;        // when false → fallback inline classic rendering
  variant: TechwearCtaVariant;
  size: TechwearCtaSize;
  radius: TechwearCtaRadius;
  gap: number; // px
  position: {
    desktop: TechwearCtaPositionPart;
    mobile: TechwearCtaPositionPart;
  };
  primaryBg?: string;
  primaryFg?: string;
  secondaryBg?: string;
  secondaryFg?: string;
}

export interface HomeFabButton {
  id: string;
  label: string;
  icon: string;
  action_type: 'route' | 'external' | 'roulette' | 'voice' | 'chat' | 'newsletter';
  action_value: string;
  variant: TechwearCtaVariant;
  position_desktop: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
  position_mobile: { corner: 'tl' | 'tr' | 'bl' | 'br'; x: number; y: number };
  visible_desktop: boolean;
  visible_mobile: boolean;
  sort_order: number;
  is_active: boolean;
  badge?: string | null;
}

export interface TechwearHeroConfig extends Omit<TechwearHeroSlideData, 'id' | 'name'> {
  enabled: boolean;
  // New multi-slides system (optional, back-compatible)
  slides?: TechwearHeroSlideData[];
  autoplay?: boolean;
  intervalMs?: number;
  transition?: 'fade' | 'slide';
  showArrows?: boolean;
  showDots?: boolean;
}

export interface HeroSlide {
  id: string;
  media: string;
  mediaType: 'image' | 'video';
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  accentColor?: string;
  backgroundMedia?: string;
  midgroundMedia?: string;
  foregroundMedia?: string;
  mobileImage?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  objectPosition?: string;
  /** Cadrage spécifique mobile (prioritaire sur objectFit sur petit écran) */
  mobileObjectFit?: 'cover' | 'contain' | 'fill' | 'none';
  mobileObjectPosition?: string;
  mobileMediaType?: 'image' | 'video';
}

export interface SocialLink {
  label: string;
  url: string;
  icon?: string;
}

export interface Category {
  id: string;
  title: string;
  image: string;
}

export interface HomeSection {
  id: string;
  title: string;
  isVisible: boolean;
}

export interface DesignPreset {
  id: string;
  name: string;
  settings: Partial<DesignSettings>;
}

export interface DesignSchedule {
  id: string;
  presetId: string;
  startTime: string;
  endTime: string;
  days: number[];
}

export interface PageSettings {
  heroSlides?: HeroSlide[];
}

export interface ProductTrustBadge {
  id: string;
  icon: string; // lucide icon name (Truck, Shield, RotateCcw, Sparkles, Leaf, Award, Package, Headphones, CreditCard, MapPin)
  label: string;
  enabled: boolean;
}

export interface ProductTrustBadgesConfig {
  enabled: boolean;
  default: ProductTrustBadge[];
  byCategory?: Record<string, ProductTrustBadge[]>;
}


export interface DesignSettings {
  // SEO / visibilité Google
  seoIndexable?: boolean;
  seoNoImageIndex?: boolean;
  seoDefaultTitle?: string;
  seoDefaultDescription?: string;
  seoOgImage?: string;
  // Mode maintenance
  maintenanceEnabled?: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  maintenanceUntil?: string;
  maintenanceImage?: string;
  maintenanceBg?: string;
  maintenanceAdminBypass?: boolean;
  // Newsletter widget + voice command
  showSidebarNewsletter?: boolean;
  sidebarNewsletterTitle?: string;
  sidebarNewsletterCta?: string;
  voiceCommandEnabled?: boolean;
  voiceOnboardingHint?: boolean;
  unifiedFab?: {
    enabled?: boolean;
    mode?: 'socle' | 'free' | 'grouped' | 'cluster' | 'dock';
    groupSide?: 'left' | 'right';
    groupOffsetY?: number;
    position_desktop?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    position_mobile?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    accentColor?: string;
    clusterDir?: 'row' | 'col';
    clusterPos_desktop?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    clusterPos_mobile?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    freeCustomIds?: string[];
    // Dock (glass pill) config
    dockPos_desktop?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    dockPos_mobile?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    dockDir?: 'row' | 'col';
    dockSize?: number;
    dockBlur?: number;
    dockShowVoice?: boolean;
    dockShowChat?: boolean;
    dockShowVisualEditor?: boolean;
    dockExcludeRoulette?: boolean;
    // Roulette trigger customization
    rouletteFab?: {
      variant?: 'glossy'|'glass'|'neon'|'metal'|'outline'|'minimal';
      accentColor?: string;
      size?: 'sm'|'md'|'lg'|'xl';
      shape?: 'round'|'pill'|'rect-bevel';
      icon?: string;
      pulse?: boolean;
      label?: string;
      position_desktop?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
      position_mobile?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    };
    items?: Array<{
      id: 'voice'|'chat'|'roulette';
      label: string;
      icon: string;
      visible: boolean;
      order: number;
      groupedIn?: 'group' | 'free';
      clusterFree?: boolean;
      position_desktop?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
      position_mobile?: { corner: 'br'|'bl'|'tr'|'tl'|'cc'|'bc'|'tc'; x: number; y: number };
    }>;
  };
  // Sidebar settings
  sidebarBg: string;
  accentColor: string;
  sidebarGradient: boolean;
  gradientIntensity: number;
  sidebarImage?: string;
  
  // Sidebar Product Card HUD
  sidebarBrandName: string;
  sidebarBrandSubtitle: string;
  showSidebarProductNumber: boolean;
  showSidebarSizes: boolean;
  showSidebarGallery: boolean;
  showSidebarProductCard: boolean;
  showSidebarStats: boolean;
  sidebarInfoText: string;
  
  // HUD visibility
  showLogo: boolean;
  showStats: boolean;
  showUnitID: boolean;
  showOverlays: boolean;
  
  // HUD content
  hudLogo: string;
  unitIdLabel: string;
  customUnitID: string;
  statsLabel: string;
  statsSubLabel: string;
  backgroundWatermark: string;
  stats: HUDStat[];
  
  // HUD styling
  hudButtons: HUDButton[];
  glitchDuration: number;
  glitchIntensity: number;
  clickScale: number;
  logoStyle: HUDStyle;
  statsStyle: HUDStyle;
  unitIdStyle: HUDStyle;
  socialStyle: HUDStyle;
  
  // Background settings
  backgroundMedia: BackgroundMedia[];
  isSlideshowActive: boolean;
  slideshowSpeed: number;
  
  // Techwear hero (dynamic, product-linked)
  techwearHero: TechwearHeroConfig;

  // Hero slider
  heroSlides: HeroSlide[];
  sliderAutoPlay: boolean;
  sliderSpeed: number;
  showSliderOverlay: boolean;
  sliderGrayscale: boolean;
  
  // Social links
  socialLinks: SocialLink[];
  socialDisplayMode: 'icons' | 'text' | 'both';
  
  // Categories and sections
  categories: Category[];
  homeSections: HomeSection[];
  /** Curated ordered product ids per homepage section id (e.g. { top: [...], new: [...] }) */
  homeSectionProducts?: Record<string, string[]>;
  /** Configurable product feed sections (Tendance, Cagoule, Veste…) */
  homeFeedSections?: import('@/config/homeFeedSections').FeedSectionConfig[];
  /** Saved GIF builder presets (shared across admins). */
  gifPresets?: import('@/lib/gifBuilder').GifPreset[];

  homeCustomSections?: any[];
  homePageBlocks?: Array<{ id: string; visible: boolean; label?: string; settings?: Record<string, any> }>;
  homeTexts?: Record<string, string>;
  
  // Presets and scheduling
  presets: DesignPreset[];
  schedules: DesignSchedule[];
  
  // Page-specific settings
  pages: Record<string, PageSettings>;
  
  // Catalog display
  colorDisplayMode: 'swatches' | 'images';
  
  // Hero image opacity
  sliderImageOpacity: number;
  
  // Sidebar image opacity
  sidebarImageOpacity: number;
  
  // Mobile sidebar image
  mobileSidebarImage?: string;
  mobileSidebarMediaType?: 'image' | 'video';
  
  // Configurable sizes for sidebar
  sidebarSizes: string[];
  // Global product size catalogue (admin-managed, used everywhere)
  globalProductSizes?: string[];
  // Global product defaults auto-applied on new product creation
  productDefaults?: ProductDefaults;
  // Product page trust badges (delivery, warranty, returns...) with per-category overrides
  productTrustBadges?: ProductTrustBadgesConfig;

  
  // Stat bar colors
  statBarFilledColor: string;
  statBarEmptyColor: string;
  
  // Custom product card text
  sidebarProductTitle: string;
  sidebarProductDescription: string;

  // Sidebar brand block position
  sidebarBrandPosition?: 'top' | 'center' | 'bottom';

  // Sidebar multi-product slider
  sidebarSliderEnabled?: boolean;
  sidebarSliderSpeed?: number; // ms between slides
  sidebarSliderMaxProducts?: number;

  // Mannequin hotspots
  mannequinHotspots: MannequinHotspotConfig[];

  // Category grid columns
  categoryColumns?: number;

  // Configurable navigation links
  sidebarNavLinks?: Array<{ id: string; label: string; labelEN: string; icon: string; view?: ViewType; href?: string; enabled: boolean }>;
  megaMenuLinks?: Array<{ id: string; label: string; href: string; enabled: boolean }>;

  // Category layout preset
  categoryLayout?: {
    preset: string;
    columns: number;
    aspectRatio: string;
    gap: string;
  };

  // Header preset
  headerPreset?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerFixed?: boolean;

  // Logo customization
  logoSize?: number;
  logoBackgroundShape?: 'none' | 'circle' | 'square' | 'triangle' | 'hexagon' | 'diamond' | 'blob';
  logoBackgroundColor?: string;
  logoBackgroundPadding?: number;
  footerLogo?: string;
  faviconUrl?: string;

  // Sidebar delay (ms) - legacy
  sidebarDelay?: number;

  // Sidebar reappearance delay (ms) - 0 = OFF
  sidebarReappearDelay?: number;

  // Hero slider height
  sliderHeight?: string;

  // Global site spacing
  siteSpacing?: string; // 'compact' | 'normal' | 'spacious'

  // Brand identity
  siteName?: string;
  siteTagline?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Admin notification
  adminNotificationEmail?: string;

  // Colissimo sender fields
  colissimo_sender_name?: string;
  colissimo_sender_address?: string;
  colissimo_sender_zip?: string;
  colissimo_sender_city?: string;

  // Global color overrides (hex) — applied as CSS variable overrides on :root
  globalBgColor?: string;
  globalTextColor?: string;
  globalCardColor?: string;
  globalMutedColor?: string;
  footerBgColor?: string;
  footerTextColor?: string;

  // Legal / company info (shown on legal pages, configurable in Admin > Paramètres > Légal)
  legalCompanyName?: string;
  legalCompanyForm?: string;
  legalCapital?: string;
  legalAddress?: string;
  legalZip?: string;
  legalCity?: string;
  legalSiret?: string;
  legalRcs?: string;
  legalVat?: string;
  legalDirector?: string;
  legalRgpdEmail?: string;
  legalReturnEmail?: string;
}

export type MarkerType = 'dot' | 'cross' | 'diamond' | 'square' | 'ring';

export interface MannequinHotspotConfig {
  id: string;
  x: string;
  y: string;
  label: string;
  details: string;
  icon: string;
  media?: string;
  mediaType?: 'image' | 'video';
  enabled?: boolean;
  markerType?: MarkerType;
  contentMode?: 'manual' | 'product';
  productId?: string;
  productName?: string;
  productPrice?: number;
  productSalePrice?: number;
  productSizes?: string[];
}

export interface TranslationStrings {
  shop: string;
  about: string;
  dashboard: string;
  lowStock: string;
  acquire: string;
  recalibrating: string;
  loading: string;
  home: string;
  newArrivals: string;
  collections: string;
  contact: string;
  explore: string;
  viewCollection: string;
  addToCart: string;
  outOfStock: string;
  onSale: string;
  systemId: string;
  dataFlux: string;
  waterproofing: string;
  thermal: string;
  armor: string;
}

export const translations: Record<Language, TranslationStrings> = {
  FR: {
    shop: 'Boutique',
    about: 'À Propos',
    dashboard: 'Tableau de Bord',
    lowStock: 'Stock Faible',
    acquire: 'Acquérir Unité',
    recalibrating: 'RE-CALIBRAGE LANGUE...',
    loading: 'CHARGEMENT...',
    home: 'Accueil',
    newArrivals: 'Nouveautés',
    collections: 'Collections',
    contact: 'Contact',
    explore: 'Explorer',
    viewCollection: 'Voir la Collection',
    addToCart: 'Ajouter au Panier',
    outOfStock: 'Rupture de Stock',
    onSale: 'En Solde',
    systemId: 'IDENTIFIANT SYSTÈME',
    dataFlux: 'FLUX DE DONNÉES //',
    waterproofing: 'ÉTANCHÉITÉ',
    thermal: 'THERMIQUE',
    armor: 'ARMURE',
  },
  EN: {
    shop: 'Shop',
    about: 'About',
    dashboard: 'Dashboard',
    lowStock: 'Low Stock',
    acquire: 'Acquire Unit',
    recalibrating: 'RE-CALIBRATING LANGUAGE...',
    loading: 'LOADING...',
    home: 'Home',
    newArrivals: 'New Arrivals',
    collections: 'Collections',
    contact: 'Contact',
    explore: 'Explore',
    viewCollection: 'View Collection',
    addToCart: 'Add to Cart',
    outOfStock: 'Out of Stock',
    onSale: 'On Sale',
    systemId: 'SYSTEM ID',
    dataFlux: 'DATA FLUX //',
    waterproofing: 'WATERPROOFING',
    thermal: 'THERMAL',
    armor: 'ARMOR',
  },
};

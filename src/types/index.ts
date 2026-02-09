// Types for LVTK6 E-commerce Platform

export type ViewType = 'Home' | 'Shop' | 'About' | 'ProductDetail' | 'Dashboard';
export type Language = 'FR' | 'EN';

export interface ColorOption {
  color: string;
  label: string;
  image?: string;
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

export interface DesignSettings {
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
  
  // Configurable sizes for sidebar
  sidebarSizes: string[];
  
  // Stat bar colors
  statBarFilledColor: string;
  statBarEmptyColor: string;
  
  // Custom product card text
  sidebarProductTitle: string;
  sidebarProductDescription: string;

  // Mannequin hotspots
  mannequinHotspots: MannequinHotspotConfig[];

  // Category grid columns
  categoryColumns?: number;

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
}

export interface MannequinHotspotConfig {
  id: string;
  x: string;
  y: string;
  label: string;
  details: string;
  icon: string;
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

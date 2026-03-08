import { DesignSettings, Product, Order } from '@/types';

const DEFAULT_HUD_BG = '#2c3e50';
const DEFAULT_HUD_TEXT = '#ffffff';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Parka Glacier Ops',
    subtitle: 'PROTECTION THERMIQUE EXTRÊME',
    price: 450,
    image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=800',
    category: 'Homme',
    stock: 12,
    sku: 'GLC-OPS-001',
    description: 'Conçue pour les environnements sub-zéro, cette parka utilise une isolation thermique multicouche et une membrane imperméable Gore-Tex Pro.',
    material: 'Gore-Tex Pro 3L',
    careInstructions: 'Lavage délicat 30°C, ne pas repasser.',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#FFFFFF'],
    colorOptions: [
      { color: '#000000', label: 'Noir Obsidian', image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=800' },
      { color: '#FFFFFF', label: 'Blanc Arctique', image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800' }
    ],
    attributes: { 'Imperméabilité': 'Niveau 5', 'Thermique': 'Extrême' }
  },
  {
    id: 'p2',
    name: 'Doudoune Valkyrie',
    subtitle: 'AÉRODYNAMISME URBAIN',
    price: 320,
    image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800',
    category: 'Femme',
    stock: 8,
    sku: 'VLK-DWN-002',
    description: 'Une silhouette futuriste alliée à un duvet d\'oie premium pour un ratio chaleur/poids inégalé en milieu urbain.',
    material: 'Ripstop Nylon / Duvet 800-fill',
    sizes: ['XS', 'S', 'M'],
    colors: ['#FFFFFF', '#808080'],
    colorOptions: [
      { color: '#FFFFFF', label: 'Neige Pure', image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800' },
      { color: '#808080', label: 'Gris Urbain', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800' }
    ],
    attributes: { 'Coupe-vent': 'Oui', 'Poids': 'Ultraléger' }
  },
  {
    id: 'p3',
    name: 'Gilet Tactique Utility',
    subtitle: 'SYSTÈME DE STOCKAGE MODULAIRE',
    price: 180,
    salePrice: 145,
    image: 'https://images.unsplash.com/photo-1596706915222-77777174955b?auto=format&fit=crop&q=80&w=800',
    category: 'Homme',
    stock: 15,
    sku: 'TAC-UTL-003',
    description: 'Gilet tactique multi-poches avec système MOLLE intégré pour une personnalisation totale de votre équipement.',
    material: 'Cordura 1000D',
    sizes: ['M', 'L', 'XL'],
    colors: ['#2f3542'],
    attributes: { 'Stockage': '8 Poches', 'Durabilité': 'Impact Élevé' }
  },
  {
    id: 'p4',
    name: 'Bomber Shadow Ops',
    subtitle: 'INFILTRATION URBAINE',
    price: 280,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800',
    category: 'Homme',
    stock: 3,
    sku: 'SHD-BOM-004',
    description: 'Bomber technique avec doublure thermique amovible et finition water-resistant.',
    material: 'Nylon technique / Polaire amovible',
    sizes: ['S', 'M', 'L'],
    colors: ['#000000', '#1a1a2e'],
    attributes: { 'Imperméabilité': 'Niveau 3', 'Modularité': 'Haute' }
  },
  {
    id: 'p5',
    name: 'Cargo Recon Elite',
    subtitle: 'MOBILITÉ TACTIQUE',
    price: 160,
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800',
    category: 'Homme',
    stock: 20,
    sku: 'RCN-CRG-005',
    description: 'Pantalon cargo avec genouillères intégrées et tissu ripstop renforcé.',
    material: 'Ripstop renforcé',
    sizes: ['28', '30', '32', '34', '36'],
    colors: ['#2f3542', '#000000'],
    attributes: { 'Flexibilité': 'Stretch 4-way', 'Poches': '10' }
  },
  {
    id: 'p6',
    name: 'Veste Aurora Tech',
    subtitle: 'PROTECTION CLIMATIQUE AVANCÉE',
    price: 390,
    salePrice: 312,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800',
    category: 'Femme',
    stock: 6,
    sku: 'AUR-TCH-006',
    description: 'Veste technique 3-en-1 avec membrane respirante et couche isolante amovible.',
    material: 'Gore-Tex / PrimaLoft',
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['#ffffff', '#c7d5e0'],
    attributes: { 'Respirabilité': 'Niveau 4', 'Imperméabilité': 'Niveau 5' }
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'CMD-8839-X',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    customer: {
      name: 'Alex Chen',
      email: 'alex.chen@example.com',
      phone: '+33 6 12 34 56 78',
      address: '142 Rue de Rivoli',
      city: 'Paris',
      zip: '75001',
      country: 'France'
    },
    items: [
      { 
        id: 'i1', 
        productId: 'p1', 
        name: 'Parka Glacier Ops', 
        price: 450, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=800', 
        size: 'L', 
        color: 'Noir' 
      }
    ],
    subtotal: 450,
    tax: 90,
    shippingCost: 15,
    total: 555,
    status: 'Processing',
    paymentStatus: 'Paid',
    paymentMethod: 'Credit Card',
    notes: 'Client VIP.'
  },
  {
    id: 'ord-1002',
    orderNumber: 'CMD-9012-Y',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    customer: {
      name: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      address: '28 Avenue des Champs-Élysées',
      city: 'Paris',
      zip: '75008',
      country: 'France'
    },
    items: [
      { 
        id: 'i2', 
        productId: 'p2', 
        name: 'Doudoune Valkyrie', 
        price: 320, 
        quantity: 1, 
        image: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&q=80&w=800', 
        size: 'S', 
        color: 'Blanc' 
      },
      { 
        id: 'i3', 
        productId: 'p3', 
        name: 'Gilet Tactique Utility', 
        price: 145, 
        quantity: 2, 
        image: 'https://images.unsplash.com/photo-1596706915222-77777174955b?auto=format&fit=crop&q=80&w=800', 
        size: 'M' 
      }
    ],
    subtotal: 610,
    tax: 122,
    shippingCost: 0,
    total: 732,
    status: 'Shipped',
    paymentStatus: 'Paid',
    paymentMethod: 'PayPal'
  }
];

export const INITIAL_DESIGN_SETTINGS: DesignSettings = {
  sidebarBg: '#0a0a0a',
  accentColor: '#3498db',
  showLogo: true,
  showStats: true,
  showUnitID: true,
  showOverlays: true,
  sidebarGradient: true,
  gradientIntensity: 40,
  hudLogo: 'https://pkxusmhvzcqfozzykjzy.supabase.co/storage/v1/object/sign/LOGO/logo%20runningrtg.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hZTA1ZTc0OC0yOWIwLTQ2OWQtYTEyNy0yZThlZDYzNDAyZTEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJMT0dPL2xvZ28gcnVubmluZ3J0Zy5wbmciLCJpYXQiOjE3Njk3ODY5MjAsImV4cCI6MTgwMTMyMjkyMH0.oBKyGYVRKMOpBCuZrlGH0EpzyZjGiMZ6pkjQ-tsHUYs',
  
  // Sidebar Product Card HUD
  sidebarBrandName: 'LVTK6',
  sidebarBrandSubtitle: 'NEW EDITION',
  showSidebarProductNumber: true,
  showSidebarSizes: true,
  showSidebarGallery: true,
  showSidebarProductCard: true,
  showSidebarStats: true,
  sidebarInfoText: '',
  
  backgroundMedia: [
    { id: '1', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1200', type: 'image', isCover: true }
  ],
  isSlideshowActive: true,
  slideshowSpeed: 5000,

  unitIdLabel: 'IDENTIFIANT SYSTÈME',
  customUnitID: 'UNITÉ_ALPHA_01',
  statsLabel: 'FLUX DE DONNÉES //',
  statsSubLabel: 'STATS_SECTEUR',
  backgroundWatermark: 'HELVETICA_TECH',

  stats: [
    { label: 'ÉTANCHÉITÉ', value: 95 },
    { label: 'THERMIQUE', value: 82 },
    { label: 'ARMURE', value: 64 }
  ],
  hudButtons: [
    {
      id: 'btn-explore',
      label: 'EXPLORER',
      url: '/shop',
      style: {
        bg: DEFAULT_HUD_BG,
        text: DEFAULT_HUD_TEXT,
        scale: 1,
        animation: 'glitch',
        pos: { bottom: 10, right: 10 },
        fontSize: 12
      }
    }
  ],
  glitchDuration: 0.12,
  glitchIntensity: 1,
  clickScale: 0.95,
  logoStyle: {
    bg: DEFAULT_HUD_BG,
    text: DEFAULT_HUD_TEXT,
    scale: 1,
    animation: 'glitch',
    pos: { top: 10, left: 10 }
  },
  statsStyle: {
    bg: DEFAULT_HUD_BG,
    text: DEFAULT_HUD_TEXT,
    scale: 1,
    animation: 'pulse',
    pos: { top: 35, left: 45 }
  },
  unitIdStyle: {
    bg: DEFAULT_HUD_BG,
    text: DEFAULT_HUD_TEXT,
    scale: 1,
    animation: 'fade',
    pos: { bottom: 10, left: 10 }
  },
  socialStyle: {
    bg: 'rgba(0,0,0,0.3)',
    text: '#ffffff',
    scale: 1,
    animation: 'fade',
    pos: { top: 50, right: 5 },
    fontSize: 10
  },
  heroSlides: [
    { 
      id: 'slide-1', 
      media: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=2000', 
      mediaType: 'image',
      title: 'PRÊT POUR LE FUTUR', 
      subtitle: 'ÉQUIPEMENT TACTIQUE AVANCÉ', 
      ctaText: 'VOIR LA COLLECTION',
      ctaUrl: '/shop',
      accentColor: '#3b82f6'
    },
    { 
      id: 'slide-2', 
      media: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&q=80&w=2000', 
      mediaType: 'image',
      title: 'COQUES ADAPTATIVES', 
      subtitle: 'COUCHES RÉSISTANTES AUX INTEMPÉRIES', 
      ctaText: 'VOIR LES VESTES',
      ctaUrl: '/shop',
      accentColor: '#10b981'
    }
  ],
  socialLinks: [
    { label: 'INSTAGRAM', url: '#' },
    { label: 'TWITTER', url: '#' },
    { label: 'YOUTUBE', url: '#' }
  ],
  socialDisplayMode: 'both',
  sliderAutoPlay: true,
  sliderSpeed: 8000,
  showSliderOverlay: false,
  sliderGrayscale: false,
  presets: [],
  schedules: [], 
  
  categories: [
    { id: 'cat-men', title: 'Homme', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=800' },
    { id: 'cat-women', title: 'Femme', image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?auto=format&fit=crop&q=80&w=800' },
    { id: 'cat-children', title: 'Enfant', image: 'https://images.unsplash.com/photo-1519238263496-6362d74c1123?auto=format&fit=crop&q=80&w=800' },
    { id: 'cat-accessories', title: 'Accessoires', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&q=80&w=800' }
  ],
  homeSections: [
    { id: 'top', title: 'Meilleures Ventes de la Semaine', isVisible: true },
    { id: 'trending', title: 'Tendances Actuelles', isVisible: true },
    { id: 'style', title: 'Focus Style // Urban Ops', isVisible: true },
    { id: 'promo', title: 'Promotions du Mois', isVisible: true }
  ],
  
  pages: {
    'home': {
      heroSlides: [
        { 
          id: 'slide-1', 
          media: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&q=80&w=2000', 
          mediaType: 'image',
          title: 'PRÊT POUR LE FUTUR', 
          subtitle: 'ÉQUIPEMENT TACTIQUE AVANCÉ', 
          ctaText: 'VOIR LA COLLECTION',
          ctaUrl: '/shop',
          accentColor: '#3b82f6'
        }
      ]
    }
  },
  colorDisplayMode: 'swatches',
  sliderImageOpacity: 1,
  sidebarImageOpacity: 1,
  mobileSidebarImage: '',
  sidebarSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  statBarFilledColor: '#000000',
  statBarEmptyColor: '#e5e5e5',
  sidebarProductTitle: '',
  sidebarProductDescription: '',
  sidebarSliderEnabled: true,
  sidebarSliderSpeed: 6000,
  sidebarSliderMaxProducts: 5,
  mannequinHotspots: [
    { id: 'collar', x: '50%', y: '15%', label: 'COL TECHNIQUE', details: 'Protection coupe-vent intégrée', icon: 'Shield', enabled: true, markerType: 'dot', contentMode: 'manual' },
    { id: 'pocket', x: '30%', y: '45%', label: 'POCHE TACTIQUE', details: 'Accès rapide sécurisé', icon: 'Package', enabled: true, markerType: 'dot', contentMode: 'manual' },
    { id: 'fabric', x: '70%', y: '60%', label: 'TISSU TECHNIQUE', details: 'Gore-Tex Pro imperméabilité', icon: 'Layers', enabled: true, markerType: 'dot', contentMode: 'manual' },
    { id: 'hem', x: '50%', y: '85%', label: 'OURLET AJUSTABLE', details: 'Cordon élastique intégré', icon: 'Move', enabled: true, markerType: 'dot', contentMode: 'manual' },
  ],
  siteName: 'Mon Site',
  siteTagline: '',
  contactEmail: '',
  contactPhone: '',
  sidebarReappearDelay: 10000,
  sliderHeight: '100vh',
  siteSpacing: 'compact',
  categoryLayout: {
    preset: 'portrait',
    columns: 4,
    aspectRatio: '3/4',
    gap: 'md',
  },
};

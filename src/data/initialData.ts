import { DesignSettings, Product, Order } from '@/types';

const DEFAULT_HUD_BG = '#2c3e50';
const DEFAULT_HUD_TEXT = '#ffffff';
const PLACEHOLDER = '/placeholder.svg';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Parka Glacier Ops',
    subtitle: 'PROTECTION THERMIQUE EXTRÊME',
    price: 450,
    image: PLACEHOLDER,
    category: 'Homme',
    stock: 12,
    sku: 'GLC-OPS-001',
    description: 'Conçue pour les environnements sub-zéro, cette parka utilise une isolation thermique multicouche et une membrane imperméable Gore-Tex Pro.',
    material: 'Gore-Tex Pro 3L',
    careInstructions: 'Lavage délicat 30°C, ne pas repasser.',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#FFFFFF'],
    colorOptions: [
      { color: '#000000', label: 'Noir Obsidian', image: PLACEHOLDER },
      { color: '#FFFFFF', label: 'Blanc Arctique', image: PLACEHOLDER }
    ],
    attributes: { 'Imperméabilité': 'Niveau 5', 'Thermique': 'Extrême' }
  },
  {
    id: 'p2',
    name: 'Doudoune Valkyrie',
    subtitle: 'AÉRODYNAMISME URBAIN',
    price: 320,
    image: PLACEHOLDER,
    category: 'Femme',
    stock: 8,
    sku: 'VLK-DWN-002',
    description: 'Une silhouette futuriste alliée à un duvet d\'oie premium pour un ratio chaleur/poids inégalé en milieu urbain.',
    material: 'Ripstop Nylon / Duvet 800-fill',
    sizes: ['XS', 'S', 'M'],
    colors: ['#FFFFFF', '#808080'],
    colorOptions: [
      { color: '#FFFFFF', label: 'Neige Pure', image: PLACEHOLDER },
      { color: '#808080', label: 'Gris Urbain', image: PLACEHOLDER }
    ],
    attributes: { 'Coupe-vent': 'Oui', 'Poids': 'Ultraléger' }
  },
  {
    id: 'p3',
    name: 'Gilet Tactique Utility',
    subtitle: 'SYSTÈME DE STOCKAGE MODULAIRE',
    price: 180,
    salePrice: 145,
    image: PLACEHOLDER,
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
    image: PLACEHOLDER,
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
    image: PLACEHOLDER,
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
    image: PLACEHOLDER,
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
        image: PLACEHOLDER, 
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
        image: PLACEHOLDER, 
        size: 'S', 
        color: 'Blanc' 
      },
      { 
        id: 'i3', 
        productId: 'p3', 
        name: 'Gilet Tactique Utility', 
        price: 145, 
        quantity: 2, 
        image: PLACEHOLDER, 
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
  hudLogo: '',
  
  // Sidebar Product Card HUD
  sidebarBrandName: '',
  sidebarBrandSubtitle: '',
  showSidebarProductNumber: true,
  showSidebarSizes: true,
  showSidebarGallery: true,
  showSidebarProductCard: true,
  showSidebarStats: true,
  sidebarInfoText: '',
  
  backgroundMedia: [],
  isSlideshowActive: false,
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
  heroSlides: [],
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
    { id: 'cat-men', title: 'Homme', image: PLACEHOLDER },
    { id: 'cat-women', title: 'Femme', image: PLACEHOLDER },
    { id: 'cat-children', title: 'Enfant', image: PLACEHOLDER },
    { id: 'cat-accessories', title: 'Accessoires', image: PLACEHOLDER }
  ],
  homeSections: [
    { id: 'top', title: 'Meilleures Ventes de la Semaine', isVisible: true },
    { id: 'trending', title: 'Tendances Actuelles', isVisible: true },
    { id: 'style', title: 'Focus Style // Urban Ops', isVisible: true },
    { id: 'promo', title: 'Promotions du Mois', isVisible: true }
  ],
  
  pages: {
    'home': {
      heroSlides: []
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
  // Legal info
  legalCompanyName: '',
  legalCompanyForm: '',
  legalCapital: '',
  legalAddress: '',
  legalZip: '',
  legalCity: '',
  legalSiret: '',
  legalRcs: '',
  legalVat: '',
  legalDirector: '',
  legalRgpdEmail: '',
  legalReturnEmail: '',
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

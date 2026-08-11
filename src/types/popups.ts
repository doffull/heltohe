export type PopupLayerKind =
  | 'text'
  | 'image'
  | 'video'
  | 'button'
  | 'email'
  | 'countdown'
  | 'promo';

export type PopupAnimation =
  | 'none'
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'typewriter'
  | 'glow';

export type PopupAction =
  | { type: 'none' }
  | { type: 'link'; href: string; newTab?: boolean }
  | { type: 'chatbot' }
  | { type: 'voice' }
  | { type: 'install-app' }
  | { type: 'newsletter' }
  | { type: 'close' };

export interface PopupLayer {
  id: string;
  kind: PopupLayerKind;
  /** Position/size in % of the popup canvas */
  x: number;
  y: number;
  w: number;
  h?: number;
  rotate?: number;
  opacity?: number;
  z?: number;
  animation?: PopupAnimation;
  delay?: number;
  duration?: number;
  // text / button
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  color?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  uppercase?: boolean;
  shadow?: boolean;
  action?: PopupAction;
  // media
  src?: string;
  fit?: 'cover' | 'contain' | 'fill';
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  radius?: number;
  // email / promo / countdown
  placeholder?: string;
  ctaLabel?: string;
  code?: string;
  endsAt?: string;
}

export interface PopupBackground {
  color?: string;
  gradient?: string;
  image?: string;
  video?: string;
  overlay?: number;
  blur?: number;
}

/** Actions du site pouvant déclencher une pop-up. */
export type PopupActionEvent =
  | 'lvtk:add-to-cart'
  | 'lvtk:product-view'
  | 'lvtk:wishlist-add'
  | 'lvtk:chat-open'
  | 'lvtk:open-voice'
  | 'hmp:install-available';

export const POPUP_ACTION_EVENTS: { value: PopupActionEvent; label: string }[] = [
  { value: 'lvtk:add-to-cart', label: 'Ajout au panier' },
  { value: 'lvtk:product-view', label: 'Consultation d’un produit' },
  { value: 'lvtk:wishlist-add', label: 'Ajout aux favoris' },
  { value: 'lvtk:chat-open', label: 'Ouverture du chat' },
  { value: 'lvtk:open-voice', label: 'Commande vocale lancée' },
  { value: 'hmp:install-available', label: 'App installable détectée' },
];

export interface PopupTargeting {
  pages?: string[]; // 'home' | 'shop' | 'product' | 'cart' | 'category' | 'all'
  devices?: ('mobile' | 'desktop')[];
  audience?: 'all' | 'logged-in' | 'guests';
  /** Action du site à écouter pour le déclencheur « après une action ». */
  actionEvent?: PopupActionEvent;
  /** Temps cumulé passé sur le site (en secondes) pour le déclencheur « temps passé ». */
  timeOnSiteSeconds?: number;
  /** Pop-up « Installer l’app » : n’afficher que si le navigateur propose l’installation native. */
  installOnlyIfInstallable?: boolean;
  /** Pop-up « Installer l’app » : afficher même quand l’app semble déjà installée. */
  showIfInstalled?: boolean;
}

export type PopupFormat = 'square' | 'portrait' | 'landscape' | 'fullscreen' | 'bar';

export type PopupTrigger =
  | 'on_load'
  | 'delay'
  | 'scroll'
  | 'exit_intent'
  | 'idle'
  | 'visit_count'
  | 'add_to_cart'
  | 'action'
  | 'time_on_site';

export type PopupType =
  | 'promo'
  | 'product'
  | 'newsletter'
  | 'voice'
  | 'chatbot'
  | 'install-app'
  | 'custom';

export interface PopupCampaign {
  id: string;
  name: string;
  type: PopupType;
  is_active: boolean;
  format: PopupFormat;
  layers: PopupLayer[];
  background: PopupBackground;
  display_trigger: PopupTrigger;
  delay_seconds: number;
  scroll_percent: number;
  idle_seconds: number;
  visit_count: number;
  frequency_days: number;
  max_views: number;
  priority: number;
  targeting: PopupTargeting;
  starts_at: string | null;
  ends_at: string | null;
}

export const POPUP_FORMATS: { value: PopupFormat; label: string; ratio: number }[] = [
  { value: 'square', label: 'Carré', ratio: 1 },
  { value: 'portrait', label: 'Portrait', ratio: 3 / 4 },
  { value: 'landscape', label: 'Paysage', ratio: 16 / 10 },
  { value: 'fullscreen', label: 'Plein écran', ratio: 9 / 16 },
  { value: 'bar', label: 'Barre basse', ratio: 5 },
];

export const POPUP_FONTS = [
  'Helvetica Neue, Helvetica, Arial, sans-serif',
  'Inter, sans-serif',
  'Space Grotesk, sans-serif',
  'Bebas Neue, sans-serif',
  'Archivo Black, sans-serif',
  'Playfair Display, serif',
  'JetBrains Mono, monospace',
];

export const POPUP_TRIGGERS: { value: PopupTrigger; label: string }[] = [
  { value: 'on_load', label: 'Au chargement' },
  { value: 'delay', label: 'Après un délai' },
  { value: 'scroll', label: 'Au scroll' },
  { value: 'exit_intent', label: 'Intention de sortie' },
  { value: 'idle', label: 'Après inactivité' },
  { value: 'visit_count', label: 'À la Nième visite' },
  { value: 'add_to_cart', label: 'Ajout au panier' },
];

export const POPUP_TYPES: { value: PopupType; label: string }[] = [
  { value: 'promo', label: 'Promotion' },
  { value: 'product', label: 'Nouveau produit' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'voice', label: 'Commande vocale' },
  { value: 'chatbot', label: 'Chatbot' },
  { value: 'install-app', label: 'Installer l’app' },
  { value: 'custom', label: 'Libre' },
];

const uid = () => Math.random().toString(36).slice(2, 9);

function textLayer(partial: Partial<PopupLayer>): PopupLayer {
  return {
    id: uid(),
    kind: 'text',
    x: 8,
    y: 40,
    w: 84,
    fontSize: 24,
    fontWeight: 700,
    color: '#ffffff',
    align: 'center',
    animation: 'fade',
    duration: 0.5,
    delay: 0,
    ...partial,
  };
}

export function newLayer(kind: PopupLayerKind): PopupLayer {
  const base: PopupLayer = {
    id: uid(),
    kind,
    x: 10,
    y: 40,
    w: 80,
    animation: 'fade',
    duration: 0.5,
    delay: 0,
    opacity: 1,
    z: 1,
  };
  switch (kind) {
    case 'text':
      return { ...base, text: 'Nouveau texte', fontSize: 22, fontWeight: 700, color: '#ffffff', align: 'center' };
    case 'image':
      return { ...base, h: 30, src: '', fit: 'cover' };
    case 'video':
      return { ...base, h: 35, src: '', fit: 'cover', autoplay: true, loop: true, muted: true };
    case 'button':
      return {
        ...base,
        w: 60,
        x: 20,
        text: 'Découvrir',
        color: '#000000',
        bgColor: '#ffffff',
        fontSize: 12,
        fontWeight: 700,
        uppercase: true,
        action: { type: 'link', href: '/shop' },
      };
    case 'email':
      return { ...base, w: 76, x: 12, placeholder: 'email@exemple.com', ctaLabel: "Je m'inscris", color: '#ffffff' };
    case 'countdown':
      return { ...base, fontSize: 22, color: '#ffffff', align: 'center', endsAt: '' };
    case 'promo':
      return { ...base, code: 'PROMO10', fontSize: 18, color: '#ffffff', bgColor: 'rgba(255,255,255,0.12)', align: 'center' };
    default:
      return base;
  }
}

export interface PopupTemplate {
  key: string;
  label: string;
  build: () => Partial<PopupCampaign>;
}

export const POPUP_TEMPLATES: PopupTemplate[] = [
  {
    key: 'promo',
    label: 'Promotion',
    build: () => ({
      type: 'promo',
      format: 'square',
      background: { color: '#0a0a0a', overlay: 0.2 },
      display_trigger: 'delay',
      delay_seconds: 6,
      layers: [
        textLayer({ text: '-20% ce week-end', y: 30, fontSize: 30, uppercase: true }),
        textLayer({ text: 'Sur toute la collection', y: 46, fontSize: 14, fontWeight: 400, animation: 'slide-up', delay: 0.15 }),
        {
          ...newLayer('promo'),
          y: 58,
          w: 60,
          x: 20,
          code: 'WEEKEND20',
        },
        { ...newLayer('button'), y: 74, text: 'J’en profite', action: { type: 'link', href: '/shop' } },
      ],
    }),
  },
  {
    key: 'product',
    label: 'Nouveau produit',
    build: () => ({
      type: 'product',
      format: 'portrait',
      background: { color: '#0a0a0a' },
      display_trigger: 'delay',
      delay_seconds: 8,
      layers: [
        { ...newLayer('image'), x: 0, y: 0, w: 100, h: 55, fit: 'cover' },
        textLayer({ text: 'Nouveauté', y: 62, fontSize: 12, fontWeight: 400, uppercase: true }),
        textLayer({ text: 'Nom du produit', y: 68, fontSize: 26, animation: 'slide-up', delay: 0.1 }),
        { ...newLayer('button'), y: 82, text: 'Voir le produit', action: { type: 'link', href: '/shop' } },
      ],
    }),
  },
  {
    key: 'newsletter',
    label: 'Newsletter',
    build: () => ({
      type: 'newsletter',
      format: 'square',
      background: { color: '#000000' },
      display_trigger: 'delay',
      delay_seconds: 10,
      layers: [
        textLayer({ text: 'Rejoignez-nous', y: 34, fontSize: 26, uppercase: true }),
        textLayer({ text: '-10% sur votre première commande', y: 48, fontSize: 13, fontWeight: 400 }),
        { ...newLayer('email'), y: 62 },
      ],
    }),
  },
  {
    key: 'voice',
    label: 'Commande vocale',
    build: () => ({
      type: 'voice',
      format: 'square',
      background: { color: '#0b0b0b' },
      display_trigger: 'idle',
      idle_seconds: 40,
      layers: [
        textLayer({ text: 'Commandez à la voix', y: 34, fontSize: 26, uppercase: true }),
        textLayer({ text: 'Dites simplement ce que vous cherchez', y: 50, fontSize: 13, fontWeight: 400 }),
        { ...newLayer('button'), y: 66, text: 'Activer la voix', action: { type: 'voice' } },
      ],
    }),
  },
  {
    key: 'chatbot',
    label: 'Chatbot',
    build: () => ({
      type: 'chatbot',
      format: 'square',
      background: { color: '#0b0b0b' },
      display_trigger: 'scroll',
      scroll_percent: 40,
      layers: [
        textLayer({ text: 'Une question ?', y: 34, fontSize: 26, uppercase: true }),
        textLayer({ text: 'Notre expert répond en direct', y: 50, fontSize: 13, fontWeight: 400 }),
        { ...newLayer('button'), y: 66, text: 'Ouvrir le chat', action: { type: 'chatbot' } },
      ],
    }),
  },
  {
    key: 'install-app',
    label: 'Installer l’app',
    build: () => ({
      type: 'install-app',
      format: 'square',
      background: { color: '#000000' },
      display_trigger: 'delay',
      delay_seconds: 12,
      layers: [
        textLayer({ text: 'Installez l’application', y: 34, fontSize: 24, uppercase: true }),
        textLayer({ text: 'Accès direct depuis votre écran d’accueil', y: 50, fontSize: 13, fontWeight: 400 }),
        { ...newLayer('button'), y: 66, text: 'Installer', action: { type: 'install-app' } },
      ],
    }),
  },
];

export function emptyCampaign(): Partial<PopupCampaign> {
  return {
    name: '',
    type: 'promo',
    is_active: false,
    format: 'square',
    layers: [],
    background: { color: '#000000' },
    display_trigger: 'delay',
    delay_seconds: 5,
    scroll_percent: 50,
    idle_seconds: 30,
    visit_count: 1,
    frequency_days: 7,
    max_views: 0,
    priority: 0,
    targeting: { pages: ['all'], devices: ['mobile', 'desktop'], audience: 'all' },
    starts_at: null,
    ends_at: null,
  };
}

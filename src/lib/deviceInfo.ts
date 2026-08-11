/**
 * Détection légère du device côté navigateur, utilisée pour segmenter
 * les statistiques (vues / clics) des pop-ups par appareil et plateforme.
 */
export type DeviceKind = 'mobile' | 'tablet' | 'desktop';
export type PlatformKind = 'ios' | 'android' | 'windows' | 'macos' | 'other';

export interface DeviceInfo {
  device: DeviceKind;
  platform: PlatformKind;
  browser: string;
  /** L'app est ouverte depuis l'écran d'accueil (PWA installée). */
  standalone: boolean;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return { device: 'desktop', platform: 'other', browser: 'unknown', standalone: false };
  }

  const ua = navigator.userAgent || '';
  const touchPoints = (navigator as any).maxTouchPoints || 0;

  // iPadOS 13+ se déclare « Macintosh » : on le rattrape via le tactile.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  let platform: PlatformKind = 'other';
  if (isIOS) platform = 'ios';
  else if (isAndroid) platform = 'android';
  else if (/Windows/i.test(ua)) platform = 'windows';
  else if (/Mac OS X/i.test(ua)) platform = 'macos';

  const isTablet = /iPad/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1) || (isAndroid && !/Mobile/i.test(ua));
  const isPhone = /iPhone|iPod/.test(ua) || (isAndroid && /Mobile/i.test(ua)) || /Windows Phone/i.test(ua);

  let device: DeviceKind = 'desktop';
  if (isPhone) device = 'mobile';
  else if (isTablet) device = 'tablet';
  else if (window.innerWidth < 768) device = 'mobile';

  let browser = 'other';
  if (/Edg\//i.test(ua)) browser = 'edge';
  else if (/OPR\//i.test(ua)) browser = 'opera';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'chrome';
  else if (/Firefox\//i.test(ua)) browser = 'firefox';
  else if (/Safari\//i.test(ua)) browser = 'safari';

  let standalone = false;
  try {
    standalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as any).standalone === true;
  } catch {
    /* ignore */
  }

  return { device, platform, browser, standalone };
}

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  mobile: 'Mobile',
  tablet: 'Tablette',
  desktop: 'Ordinateur',
};

export const PLATFORM_LABELS: Record<PlatformKind, string> = {
  ios: 'iOS / iPadOS',
  android: 'Android',
  windows: 'Windows',
  macos: 'macOS',
  other: 'Autre',
};

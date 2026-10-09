/** Signaux lus sur l'appareil, sans dépendre de `window` (tests et navigateur). */
export interface DeviceSignals {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

/**
 * Smartphone, tablette, ou iPad récent qui se présente comme un Mac.
 * Un ordinateur tactile ou une fenêtre rétrécie ne sont pas concernés.
 */
export function isUnsupportedMobileDevice(signals: DeviceSignals): boolean {
  const userAgent = signals.userAgent || '';
  const isMobileOrTabletUa = MOBILE_UA.test(userAgent);
  const isIPadOs = signals.platform === 'MacIntel' && signals.maxTouchPoints > 1;
  return isMobileOrTabletUa || isIPadOs;
}

export function readDeviceSignals(): DeviceSignals {
  if (typeof navigator === 'undefined') {
    return { userAgent: '', platform: '', maxTouchPoints: 0 };
  }
  return {
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };
}

/** Routes de l'atelier en direct. Les pages d'information restent accessibles. */
export function isSessionAppPath(url: string): boolean {
  const path = url.split('?')[0].split('#')[0];
  return /^\/(room|lobby|session|game)(\/|$)/.test(path);
}

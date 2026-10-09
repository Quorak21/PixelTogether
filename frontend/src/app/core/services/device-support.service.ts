import { Injectable, afterNextRender, signal } from '@angular/core';
import { isUnsupportedMobileDevice, readDeviceSignals } from '../utils/device-support';

@Injectable({ providedIn: 'root' })
export class DeviceSupportService {
  /** Reste faux pendant le pré-rendu, pour que l'hydratation corresponde au HTML servi. */
  readonly isUnsupportedDevice = signal(false);

  constructor() {
    // Le constructeur côté serveur ne voit pas l'appareil. Lire le navigateur
    // avant l'hydratation faisait diverger le @if racine : l'écran ordinateur
    // restait affiché sur téléphone.
    afterNextRender(() => {
      this.isUnsupportedDevice.set(isUnsupportedMobileDevice(readDeviceSignals()));
    });
  }
}

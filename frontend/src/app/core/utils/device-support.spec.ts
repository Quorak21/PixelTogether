import { describe, expect, it } from 'vitest';
import { isSessionAppPath, isUnsupportedMobileDevice } from './device-support';

describe('isUnsupportedMobileDevice', () => {
  it('reconnaît un smartphone ou une tablette', () => {
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
        platform: 'iPad',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('reconnaît un iPad qui se présente comme un Mac', () => {
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it('laisse passer un ordinateur, même tactile ou avec une petite fenêtre', () => {
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0',
        platform: 'Win32',
        maxTouchPoints: 10,
      }),
    ).toBe(false);
    expect(
      isUnsupportedMobileDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });
});

describe('isSessionAppPath', () => {
  it('cible les routes de session et pas les pages d’information', () => {
    expect(isSessionAppPath('/room/ABC123')).toBe(true);
    expect(isSessionAppPath('/lobby/EVT1')).toBe(true);
    expect(isSessionAppPath('/session/EVT1/GRP1')).toBe(true);
    expect(isSessionAppPath('/game/EVT1/GRP1')).toBe(true);
    expect(isSessionAppPath('/')).toBe(false);
    expect(isSessionAppPath('/documentation')).toBe(false);
    expect(isSessionAppPath('/entreprises')).toBe(false);
    expect(isSessionAppPath('/a-propos')).toBe(false);
    expect(isSessionAppPath('/mentions')).toBe(false);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UiStateService } from './ui-state.service';
import { GAME_MODE_COOP, GAME_MODE_COMPETITIVE } from '../config/session-config';

describe('UiStateService', () => {
  let service: UiStateService;

  beforeEach(() => {
    service = new UiStateService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct initial values', () => {
    expect(service.waitingMode()).toBe(false);
    expect(service.gameMode()).toBe(false);
    expect(service.gameTheme()).toBe('');
    expect(service.partyName()).toBe('');
    expect(service.currentRoomId()).toBeNull();
    expect(service.currentRole()).toBeNull();
    expect(service.isManager()).toBe(false);
    expect(service.inRoom()).toBe(false);
    expect(service.colors()).toEqual([]);
  });

  it('should handle joinWaitingRoom', () => {
    service.joinWaitingRoom('evt1');
    expect(service.currentEventId()).toBe('evt1');
    expect(service.currentRoomId()).toBe('evt1');
    expect(service.currentGroupCode()).toBeNull();
    expect(service.waitingMode()).toBe(true);
    expect(service.gameMode()).toBe(false);
    expect(service.inRoom()).toBe(true);
  });

  it('should handle joinGame', () => {
    service.joinGame('evt1', 'g1');
    expect(service.currentEventId()).toBe('evt1');
    expect(service.currentRoomId()).toBe('evt1/g1');
    expect(service.currentGroupCode()).toBe('g1');
    expect(service.waitingMode()).toBe(false);
    expect(service.gameMode()).toBe(true);
    expect(service.inRoom()).toBe(true);
  });

  it('should handle leaving canvas for waiting room', () => {
    service.joinGame('evt1', 'g1');
    service.setSelectedColor('#ff0000');
    service.setColorsFromGrid(['#ff0000', '#00ff00']);

    service.leaveCanvasForWaitingRoom('evt1');
    expect(service.waitingMode()).toBe(true);
    expect(service.gameMode()).toBe(false);
    expect(service.currentGroupCode()).toBeNull();
    expect(service.colors()).toEqual([]);
    expect(service.selectedColor()).toBe('#000000');
  });

  it('should update role and compute isManager correctly', () => {
    service.setRole('manager');
    expect(service.currentRole()).toBe('manager');
    expect(service.isManager()).toBe(true);

    service.setRole('player');
    expect(service.currentRole()).toBe('player');
    expect(service.isManager()).toBe(false);
  });

  it('should handle setColorsFromGrid', () => {
    service.setColorsFromGrid(['#ff0000', '#00ff00']);
    expect(service.colors()).toEqual(['#ff0000', '#00ff00']);
    expect(service.selectedColor()).toBe('#ff0000'); // defaults to first color

    // setting a different color from list should succeed
    service.setSelectedColor('#00ff00');
    expect(service.selectedColor()).toBe('#00ff00');

    // updating grid with a list that doesn't contain current selection should reset to first color
    service.setColorsFromGrid(['#0000ff', '#ffffff']);
    expect(service.selectedColor()).toBe('#0000ff');
  });

  it('should handle exitGame and reset all state', () => {
    service.joinGame('evt1', 'g1');
    service.setRole('player');
    service.setSelectedColor('#112233');

    service.exitGame();
    expect(service.currentRoomId()).toBeNull();
    expect(service.currentRole()).toBeNull();
    expect(service.waitingMode()).toBe(false);
    expect(service.gameMode()).toBe(false);
    expect(service.selectedColor()).toBe('#000000');
  });

  it('should countdown managerAbsentWarning', () => {
    service.showManagerAbsentWarning('Manager disconnected', 5000);
    
    expect(service.managerAbsentWarning()).toEqual({
      title: 'Manager absent',
      message: 'Manager disconnected',
      secondsLeft: 5,
    });

    // advance time by 1s
    vi.advanceTimersByTime(1000);
    expect(service.managerAbsentWarning()?.secondsLeft).toBe(4);

    // advance by 4s (should clear/be null after expiring)
    vi.advanceTimersByTime(4000);
    expect(service.managerAbsentWarning()).toBeNull();
  });
});

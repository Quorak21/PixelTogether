import test from 'node:test';
import assert from 'node:assert';
import {
  scheduleGroupPreviewUpdate,
  flushAllEventPreviews,
  pendingUpdates,
} from './preview.js';
import { activeEvents } from '../../store/eventStore.js';
import { PREVIEW_THROTTLE_MS } from '../../config/constants.js';

test('preview - scheduleGroupPreviewUpdate throttles calls', (context) => {
  const eventId = 'TESTPR';
  const groupCode = '2222';
  
  activeEvents[eventId] = {
    id: eventId,
    groups: {
      [groupCode]: {
        groupCode,
        groupIndex: 1,
        pixels: {},
        players: [],
        image: null,
      }
    }
  };

  let emitCount = 0;
  const mockIo = {
    to(room) {
      assert.strictEqual(room, eventId);
      return {
        emit(event, data) {
          assert.strictEqual(event, 'groupPreviewUpdated');
          emitCount++;
        }
      };
    }
  };

  context.mock.timers.enable();

  // 1. Premier appel : exécution immédiate (leading edge)
  scheduleGroupPreviewUpdate(mockIo, eventId, groupCode);
  assert.strictEqual(emitCount, 1, 'Devrait exécuter immédiatement au premier appel');
  assert.ok(activeEvents[eventId].groups[groupCode].image !== null);
  
  // Reset image
  activeEvents[eventId].groups[groupCode].image = null;

  // 2. Deuxième appel immédiatement après : devrait être throtté (planifié via setTimeout)
  scheduleGroupPreviewUpdate(mockIo, eventId, groupCode);
  assert.strictEqual(emitCount, 1, 'Ne devrait pas exécuter immédiatement le second appel');
  
  // Troisième appel : ne devrait pas créer un second timer
  scheduleGroupPreviewUpdate(mockIo, eventId, groupCode);
  assert.strictEqual(emitCount, 1, 'Ne devrait toujours pas exécuter le troisième appel');

  // Avancer le temps de la moitié du throttle
  context.mock.timers.tick(PREVIEW_THROTTLE_MS / 2);
  assert.strictEqual(emitCount, 1, 'Ne devrait pas exécuter à mi-chemin');

  // Avancer jusqu'au bout du throttle
  context.mock.timers.tick(PREVIEW_THROTTLE_MS / 2);
  assert.strictEqual(emitCount, 2, 'Devrait exécuter la mise à jour différée après PREVIEW_THROTTLE_MS');
  assert.ok(activeEvents[eventId].groups[groupCode].image !== null);

  // Nettoyage global
  delete activeEvents[eventId];
  delete pendingUpdates[`${eventId}:${groupCode}`];
});

test('preview - flushAllEventPreviews forces immediate update and clears timers', (context) => {
  const eventId = 'TESTFL';
  const groupCode = '3333';
  
  activeEvents[eventId] = {
    id: eventId,
    groups: {
      [groupCode]: {
        groupCode,
        groupIndex: 1,
        pixels: {},
        players: [],
        image: null,
      }
    }
  };

  const mockIo = {
    to() {
      return {
        emit() {}
      };
    }
  };

  context.mock.timers.enable();

  // Premier appel immédiat
  scheduleGroupPreviewUpdate(mockIo, eventId, groupCode);
  
  // Planifier le suivant (throttle actif)
  scheduleGroupPreviewUpdate(mockIo, eventId, groupCode);
  assert.ok(pendingUpdates[`${eventId}:${groupCode}`].timeoutId !== null, 'Devrait avoir un timeout actif');

  // Appeler flushAllEventPreviews
  flushAllEventPreviews(activeEvents[eventId]);

  assert.strictEqual(pendingUpdates[`${eventId}:${groupCode}`], undefined, 'Devrait avoir supprimé les pendingUpdates du groupe');
  assert.ok(activeEvents[eventId].groups[groupCode].image !== null, 'L\'image devrait être mise à jour');

  // Nettoyage global
  delete activeEvents[eventId];
});

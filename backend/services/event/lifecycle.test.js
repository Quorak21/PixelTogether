import test from 'node:test';
import assert from 'node:assert';
import { activeEvents } from '../../store/eventStore.js';
import { closeEvent } from './lifecycle.js';

test('closeEvent - roomClosed cible uniquement la room eventId', () => {
  const eventId = 'TEST77';
  const images = { '1111': 'data:image/png;base64,abc' };

  activeEvents[eventId] = {
    id: eventId,
    groups: {
      '1111': { image: images['1111'] },
    },
    sessionsByToken: {},
  };

  let roomClosedEmitted = false;
  let globalEmitCount = 0;
  const roomEmit = (event, data) => {
    if (event === 'roomClosed') {
      roomClosedEmitted = true;
      assert.strictEqual(data.roomId, eventId);
      assert.strictEqual(data.eventId, eventId);
      assert.deepStrictEqual(data.image, images);
    }
  };

  const mockIo = {
    emit(event) {
      globalEmitCount++;
      assert.notStrictEqual(event, 'roomClosed', 'roomClosed ne doit pas être émis globalement');
    },
    to(room) {
      assert.strictEqual(room, eventId);
      return { emit: roomEmit };
    },
  };

  closeEvent(mockIo, eventId);

  assert.ok(roomClosedEmitted, 'roomClosed doit être émis à la room eventId');
  assert.strictEqual(activeEvents[eventId], undefined, "L'event doit être supprimé du store");
  assert.strictEqual(globalEmitCount, 1, 'Seul serverCapacity doit être émis globalement');
});

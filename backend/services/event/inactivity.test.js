import test from 'node:test';
import assert from 'node:assert';
import { activeEvents } from '../../store/eventStore.js';
import { sweepInactiveEvents } from './lifecycle.js';

test('inactivity - sweepInactiveEvents purges only expired events', () => {
  const now = Date.now();
  const ttlMs = 2 * 60 * 60 * 1000; // 2 hours

  // 1. Initialiser le store avec des salons de test (codes valides de 6 caractères sans O/I)
  activeEvents['TEST99'] = {
    id: 'TEST99',
    lastActivityAt: now - 3 * 60 * 60 * 1000, // 3 heures (expiré)
    players: [],
    groups: {},
    sessionsByToken: {}
  };
  activeEvents['TEST88'] = {
    id: 'TEST88',
    lastActivityAt: now - 30 * 60 * 1000, // 30 minutes (actif)
    players: [],
    groups: {},
    sessionsByToken: {}
  };

  const mockIo = {
    emit(event, data) {},
    to() {
      return {
        emit() {}
      };
    }
  };

  // 2. Exécuter le sweep
  sweepInactiveEvents(mockIo, activeEvents, ttlMs);

  // 3. Asserts
  assert.strictEqual(activeEvents['TEST99'], undefined, 'Le salon TEST99 inactif depuis 3h aurait dû être supprimé.');
  assert.ok(activeEvents['TEST88'] !== undefined, 'Le salon TEST88 actif ne devrait pas être supprimé.');

  // 4. Cleanup
  delete activeEvents['TEST88'];
});

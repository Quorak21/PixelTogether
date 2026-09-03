import { guardAck } from '../socketGuards.js';
import { assertCanDownloadExport } from '../../../services/export/exportAccess.js';
import { getOrBuildExportZip } from '../../../services/export/sessionZip.js';

export function registerExportHandlers(socket, deps) {
  socket.on('requestExportZip', async (data, callback) => {
    if (!guardAck(callback)) return;

    const { store } = deps;
    const { normalizeEventId } = store;
    const eventId = normalizeEventId(data?.eventId ?? data?.roomId);
    const token = typeof data?.token === 'string' ? data.token.trim() : '';

    const access = assertCanDownloadExport({
      activeEvents: store.activeEvents,
      normalizeEventId,
      eventId,
      token,
    });

    if (access.error) {
      return callback({ error: access.error });
    }

    try {
      const exportZip = await getOrBuildExportZip(access.event);
      const downloadUrl = `/export/${access.event.id}?token=${encodeURIComponent(token)}`;
      callback({ downloadUrl, filename: exportZip.filename });
    } catch {
      callback({ error: 'Impossible de générer l\'export. Veuillez réessayer.' });
    }
  });
}

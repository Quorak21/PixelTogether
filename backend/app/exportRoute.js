import { assertCanDownloadExport } from '../services/export/exportAccess.js';
import { getOrBuildExportZip } from '../services/export/sessionZip.js';

/**
 * Route HTTP GET /export/:eventId?token=...
 * Sert le ZIP mis en cache pour les participants inscrits en phase finale.
 */
export function registerExportRoute(app, store) {
  const { activeEvents, normalizeEventId } = store;

  app.get('/export/:eventId', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

    const access = assertCanDownloadExport({
      activeEvents,
      normalizeEventId,
      eventId: req.params.eventId,
      token,
    });

    if (access.error) {
      return res.status(access.status).json({ error: access.error });
    }

    try {
      const exportZip = await getOrBuildExportZip(access.event);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${exportZip.filename}"`);
      res.send(exportZip.buffer);
    } catch {
      res.status(500).json({ error: 'Impossible de générer l\'export.' });
    }
  });
}

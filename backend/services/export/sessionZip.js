import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { buildGalleryGrids } from '../vote/voteLifecycle.js';
import { buildRecapData, renderRecapTxt, slugify } from './recap.js';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

/** Décode un data URL PNG en buffer binaire. */
function decodePngDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    return null;
  }
  try {
    return Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');
  } catch {
    return null;
  }
}

function buildZipFilename(event) {
  const slug = slugify(event.partyName ?? 'partie');
  return `pixeltogether-${slug}.zip`;
}

function appendZipToBuffer(archive) {
  return new Promise((resolve, reject) => {
    const passthrough = new PassThrough();
    const chunks = [];

    passthrough.on('data', (chunk) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    archive.on('error', reject);

    archive.pipe(passthrough);
    archive.finalize();
  });
}

/**
 * Génère ou retourne le ZIP mis en cache sur l'event.
 */
export async function getOrBuildExportZip(event) {
  if (event.exportZip?.buffer) {
    return event.exportZip;
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const recapText = renderRecapTxt(buildRecapData(event));
  archive.append(recapText, { name: 'recap.txt' });

  const grids = buildGalleryGrids(event);
  for (const grid of grids) {
    if (!grid.image) continue;

    const pngBuffer = decodePngDataUrl(grid.image);
    if (!pngBuffer) continue;

    const sessionPart = String(grid.sessionNumber).padStart(2, '0');
    const themeSlug = slugify(grid.theme);
    const groupSlug = slugify(grid.label);
    const filename = `grids/session-${sessionPart}-${themeSlug}-${groupSlug}.png`;
    archive.append(pngBuffer, { name: filename });
  }

  const buffer = await appendZipToBuffer(archive);
  const filename = buildZipFilename(event);

  event.exportZip = {
    buffer,
    filename,
    generatedAt: Date.now(),
  };

  return event.exportZip;
}

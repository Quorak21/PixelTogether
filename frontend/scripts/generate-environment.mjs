import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_URL = 'https://api.pixel.dokkcorp.ch';

const apiUrl = (
  process.env.VITE_API_URL ??
  process.env.API_URL ??
  DEFAULT_API_URL
).trim();

const targetPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/environments/environment.ts',
);

const content = `export const environment = {
  apiUrl: ${JSON.stringify(apiUrl)}
};
`;

writeFileSync(targetPath, content, 'utf8');
console.log(`[generate-environment] apiUrl=${apiUrl}`);

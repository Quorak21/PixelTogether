import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOCUMENTATION_MARKDOWN } from './documentation.content';

const markdownPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../public/documentation.md',
);

describe('documentation.content', () => {
  it('reprend public/documentation.md sans écart', () => {
    const source = readFileSync(markdownPath, 'utf8');
    expect(DOCUMENTATION_MARKDOWN).toBe(source);
  });
});

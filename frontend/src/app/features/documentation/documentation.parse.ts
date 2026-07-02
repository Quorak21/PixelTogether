import { Marked, type RendererThis, type Tokens } from 'marked';

export interface DocTocEntry {
  id: string;
  title: string;
  level: 1 | 2 | 3;
}

export interface ParsedDocumentation {
  html: string;
  toc: DocTocEntry[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function headingId(title: string, counts: Map<string, number>): string {
  const base = slugify(title);
  const count = counts.get(base) ?? 0;
  counts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function normalizeSource(source: string): string {
  const text = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trimStart();
}

function buildToc(body: string): DocTocEntry[] {
  const toc: DocTocEntry[] = [];
  const slugCounts = new Map<string, number>();

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (!heading) {
      continue;
    }

    const level = heading[1].length as 1 | 2 | 3;
    const title = heading[2].trim();
    toc.push({ id: headingId(title, slugCounts), title, level });
  }

  return toc;
}

function expandColorPixels(body: string): string {
  const pixel = (hex: string) =>
    `<span class="doc-pixel" style="background-color:${hex.toLowerCase()}" title="${hex}"></span>`;

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (/^(\{color:#[0-9a-fA-F]{6}\}\s*)+$/.test(trimmed)) {
        const pixels = trimmed.replace(/\{color:(#[0-9a-fA-F]{6})\}/gi, (_, hex: string) => pixel(hex));
        return `<div class="doc-palette">${pixels}</div>`;
      }

      return line.replace(/\{color:(#[0-9a-fA-F]{6})\}/gi, (_, hex: string) => pixel(hex));
    })
    .join('\n');
}

export function parseDocumentation(source: string): ParsedDocumentation {
  const body = expandColorPixels(normalizeSource(source));
  const toc = buildToc(body);
  const headingIds = toc.map((entry) => entry.id);
  let headingIndex = 0;

  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading(this: RendererThis, token: Tokens.Heading): string {
        const content = this.parser.parseInline(token.tokens);
        if (token.depth <= 3 && headingIndex < headingIds.length) {
          const id = headingIds[headingIndex++];
          return `<h${token.depth} id="${id}">${content}</h${token.depth}>\n`;
        }
        return `<h${token.depth}>${content}</h${token.depth}>\n`;
      },
    },
  });

  const html = md.parse(body) as string;

  return { html, toc };
}

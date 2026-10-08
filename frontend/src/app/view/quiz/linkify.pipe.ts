import { Pipe, PipeTransform } from '@angular/core';

export interface TextPart { text: string; href?: string; }

const URL_RE = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_RE = /[.,;:!?)\]}'"»]+$/u;

/**
 * Splits plain text into text and http(s) link parts so templates can render
 * links (e.g. Google Drive listening files) without binding HTML.
 */
export function linkParts(value: string | null | undefined): TextPart[] {
  if (!value) return [];
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of value.matchAll(URL_RE)) {
    let url = match[0];
    const trailing = TRAILING_RE.exec(url)?.[0] ?? '';
    // Keep a closing bracket that belongs to the URL itself, e.g. wiki/Foo_(bar).
    const keep = trailing.startsWith(')') && url.includes('(') ? 1 : 0;
    url = url.slice(0, url.length - trailing.length + keep);
    const start = match.index!;
    if (start > last) parts.push({ text: value.slice(last, start) });
    parts.push({ text: url, href: url });
    last = start + url.length;
  }
  if (last < value.length) parts.push({ text: value.slice(last) });
  return parts;
}

@Pipe({ name: 'linkify' })
export class LinkifyPipe implements PipeTransform {
  transform(value: string | null | undefined): TextPart[] { return linkParts(value); }
}

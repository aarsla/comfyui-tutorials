import { TERMS } from '../data/glossary';

// Words that link to the glossary, longest first so "CLIP Vision" wins over "CLIP".
// Aliases with capitals (VAE, CLIP, LoRA) match case-sensitively; lowercase ones match any case.
const ALIASES = TERMS.flatMap((t) => (t.match ?? []).map((a) => ({ a, id: t.id, exact: a !== a.toLowerCase() })))
  .sort((p, q) => q.a.length - p.a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Trailing punctuation is captured so it can stay on the same line as the linked word.
const RE = new RegExp(`(?<![\\w-])(${ALIASES.map((x) => esc(x.a)).join('|')})(?![\\w-])([.,;:!?)]*)`, 'gi');
const SKIP = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'button']);

/** Wraps the first mention of each glossary term in `html` in a popover trigger. */
export function linkTerms(html: string): string {
  const used = new Set<string>();
  const stack: string[] = [];
  return html.split(/(<[^>]+>)/).map((part) => {
    if (part.startsWith('<')) {
      const m = part.match(/^<(\/?)([a-z0-9]+)/i);
      if (m && SKIP.has(m[2].toLowerCase()) && !part.endsWith('/>')) {
        if (m[1]) stack.pop(); else stack.push(m[2]);
      }
      return part;
    }
    if (stack.length) return part;
    return part.replace(RE, (all, word: string, punct: string) => {
      const hit = ALIASES.find((x) => (x.exact ? x.a === word : x.a.toLowerCase() === word.toLowerCase()));
      if (!hit || used.has(hit.id)) return all;
      used.add(hit.id);
      const btn = `<button type="button" class="term" data-term="${hit.id}">${word}</button>`;
      return punct ? `<span class="term-wrap">${btn}${punct}</span>` : btn;
    });
  }).join('');
}

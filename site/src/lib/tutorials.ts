import { marked } from 'marked';
import raw from '../data/tutorials.json';
import { LESSONS, MODULES, type LessonMeta } from '../data/meta';
import type { ApiGraph } from './graph';

marked.setOptions({ breaks: true, gfm: true });

interface RawTutorial {
  file: string;
  prompt: ApiGraph;
  notes: [string, string, string][];
  layout?: string;
  unwire?: boolean;
  hints?: Record<string, string>;
}

export interface Note { anchor: string; title: string; html: string }
export interface Tutorial extends LessonMeta {
  n: string;
  slug: string;
  file: string;
  graph: ApiGraph;
  intro: Note | null;
  nodeNotes: Note[];
  hints: Record<string, string>;
  exercise: boolean;
  models: string[];
  images: string[];
  index: number;
}

// Every intro ends with the same "How to use every tutorial" block about the ComfyUI canvas.
// The site shows it once on the setup page instead.
const HOWTO_START = '### How to use every tutorial';
export const HOWTO_MD = (raw as RawTutorial[])[0].notes[0][2].split(HOWTO_START)[1] ?? '';

const md = (s: string) => marked.parse(s, { async: false }) as string;

const slugify = (file: string) =>
  file.replace(/\.json$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const TUTORIALS: Tutorial[] = (raw as RawTutorial[]).map((t, index) => {
  const n = t.file.slice(0, 2);
  const meta = LESSONS[n];
  const introRaw = t.notes.find((x) => x[0] === 'intro');
  const values = Object.values(t.prompt).flatMap((node) => Object.values(node.inputs));
  const strings = values.filter((v): v is string => typeof v === 'string');
  return {
    ...meta,
    n,
    slug: slugify(t.file),
    file: t.file,
    graph: t.prompt,
    intro: introRaw ? { anchor: 'intro', title: introRaw[1], html: md(introRaw[2].split(HOWTO_START)[0]) } : null,
    nodeNotes: t.notes.filter((x) => x[0] !== 'intro').map(([anchor, title, body]) => ({ anchor, title, html: md(body) })),
    hints: Object.fromEntries(Object.entries(t.hints ?? {}).map(([k, v]) => [k, md(v)])),
    exercise: t.layout === 'exercise',
    models: [...new Set(strings.filter((s) => /\.(safetensors|pth|pt|bin)$/.test(s)))],
    images: [...new Set(strings.filter((s) => /\.(png|jpe?g|webp)$/i.test(s)))],
    index,
  };
});

export const byModule = () =>
  MODULES.map((m) => ({ ...m, lessons: TUTORIALS.filter((t) => t.module === m.id) }));

export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
export const lessonUrl = (t: Tutorial) => url(`lessons/${t.slug}/`);

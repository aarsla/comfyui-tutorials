// Lays out a ComfyUI API graph for the web page. Same rules as layout/build_layout.js:
// stage-contiguous layered columns, long links get a reserved row in every column they
// cross, wires turn only in the gaps between columns, each vertical segment in its own lane.
import { OUTPUTS, STAGE_OF, TYPE_COLOR } from '../data/meta';

type ApiNode = { class_type: string; inputs: Record<string, unknown>; _meta?: { title?: string } };
export type ApiGraph = Record<string, ApiNode>;

export interface Port { name: string; type: string; y: number }
export interface GNode {
  id: string; cls: string; title: string; stage: number;
  x: number; y: number; w: number; h: number;
  ins: Port[]; outs: Port[]; widgets: [string, string][];
}
export interface Wire { id: string; src: string; sslot: number; dst: string; dslot: number; type: string; color: string; points: [number, number][]; label: string }
export interface Frame { stage: number; x: number; w: number }
export interface Layout { nodes: GNode[]; wires: Wire[]; frames: Frame[]; width: number; height: number }

const NODE_W = 210, TITLE_H = 30, ROW = 20, WIDGET_ROW = 16, MAX_WIDGETS = 3;
const PAD = 24, TOP = 56, GAP_Y = 36, DUMMY_H = 20, DUMMY_GAP = 10;
const LANE_SP = 12, LANE_MARGIN = 18, STAGE_GAP = 28;
const PREVIEWS = new Set(['PreviewImage', 'MaskPreview']);

const isLink = (v: unknown): v is [string, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'string' && typeof v[1] === 'number';

const short = (v: unknown) => {
  let s = typeof v === 'string' ? v : JSON.stringify(v);
  s = s.replace(/\.(safetensors|pth|pt|bin)$/, '');
  return s.length > 24 ? s.slice(0, 23) + '…' : s;
};

interface Edge { id: string; src: GNode; sslot: number; dst: GNode; dslot: number; type: string; dummies: Item[]; ys?: number[] }
interface Item { kind: 'node' | 'dummy'; n?: GNode; e?: Edge; y: number; h: number }

export function layoutGraph(g: ApiGraph): Layout {
  const nodes: GNode[] = Object.entries(g).map(([id, n]) => {
    const outs = (OUTPUTS[n.class_type] ?? []).map(([name, type], i) => ({ name, type, y: TITLE_H + i * ROW + ROW / 2 }));
    const ins: Port[] = [];
    const widgets: [string, string][] = [];
    for (const [k, v] of Object.entries(n.inputs)) {
      if (isLink(v)) ins.push({ name: k, type: '', y: TITLE_H + ins.length * ROW + ROW / 2 });
      else if (widgets.length < MAX_WIDGETS) widgets.push([k, short(v)]);
    }
    const rows = Math.max(ins.length, outs.length, 1);
    const h = TITLE_H + rows * ROW + (widgets.length ? 6 + widgets.length * WIDGET_ROW : 0) + 10;
    return { id, cls: n.class_type, title: n._meta?.title || n.class_type, stage: 0, x: 0, y: 0, w: NODE_W, h, ins, outs, widgets };
  });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const edges: Edge[] = [];
  for (const [id, n] of Object.entries(g)) {
    let slot = 0;
    for (const [k, v] of Object.entries(n.inputs)) {
      if (!isLink(v)) continue;
      const src = byId[v[0]], dst = byId[id];
      const type = src.outs[v[1]]?.type ?? 'ANY';
      dst.ins[slot].type = type;
      edges.push({ id: `${v[0]}:${v[1]}>${id}:${k}`, src, sslot: v[1], dst, dslot: slot, type, dummies: [] });
      slot++;
    }
  }
  const srcsOf = (n: GNode) => edges.filter((e) => e.dst === n).map((e) => e.src);

  // stages
  for (const n of nodes) if (!PREVIEWS.has(n.cls)) n.stage = STAGE_OF[n.cls] ?? 3;
  for (const n of nodes) if (PREVIEWS.has(n.cls)) n.stage = srcsOf(n)[0]?.stage ?? 4;

  // layers: longest path inside each stage, stages placed one after another
  const layer: Record<string, number> = {};
  const stageLayers: Record<number, [number, number]> = {};
  let start = 0;
  for (let s = 0; s < 5; s++) {
    const sn = nodes.filter((n) => n.stage === s);
    if (!sn.length) continue;
    const depth: Record<string, number> = {};
    const f = (n: GNode, seen = new Set<string>()): number => {
      if (depth[n.id] !== undefined) return depth[n.id];
      if (seen.has(n.id)) return 0;
      seen.add(n.id);
      let d = 0;
      for (const q of srcsOf(n)) if (q.stage === s) d = Math.max(d, f(q, seen) + 1);
      return (depth[n.id] = d);
    };
    sn.forEach((n) => f(n));
    const maxd = Math.max(...sn.map((n) => depth[n.id]));
    sn.forEach((n) => (layer[n.id] = start + depth[n.id]));
    stageLayers[s] = [start, start + maxd];
    start += maxd + 1;
  }
  const NL = start;

  // columns with dummy rows for links that skip columns
  const cols: Item[][] = Array.from({ length: NL }, () => []);
  const itemOf: Record<string, Item> = {};
  for (const n of nodes) cols[layer[n.id]].push((itemOf[n.id] = { kind: 'node', n, y: 0, h: n.h }));
  for (const e of edges) {
    for (let L = layer[e.src.id] + 1; L < layer[e.dst.id]; L++) {
      const d: Item = { kind: 'dummy', e, y: 0, h: DUMMY_H };
      e.dummies.push(d);
      cols[L].push(d);
    }
  }
  const portOut = (e: Edge) => e.src.outs[e.sslot]?.y ?? TITLE_H + ROW / 2;
  const portIn = (e: Edge) => e.dst.ins[e.dslot].y;
  // y of the wire where it leaves an item towards the next column
  const exitY = (it: Item, e: Edge) => (it.kind === 'node' ? it.y + portOut(e) : it.y + DUMMY_H / 2);
  const preds = (it: Item): [Item, Edge][] => {
    if (it.kind === 'dummy') {
      const e = it.e!, i = e.dummies.indexOf(it);
      return [[i === 0 ? itemOf[e.src.id] : e.dummies[i - 1], e]];
    }
    return edges.filter((e) => e.dst === it.n).map((e) => [e.dummies.length ? e.dummies[e.dummies.length - 1] : itemOf[e.src.id], e]);
  };
  const stack = (col: Item[]) => {
    let y = TOP;
    for (const it of col) { it.y = y; y += it.h + (it.kind === 'node' ? GAP_Y : DUMMY_GAP); }
  };
  const center = (it: Item) => it.y + it.h / 2;
  cols.forEach((c) => { c.sort((p, q) => (p.kind === q.kind ? 0 : p.kind === 'node' ? -1 : 1)); stack(c); });
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let L = 1; L < NL; L++) {
      const sc = new Map(cols[L].map((it) => {
        const ps = preds(it);
        return [it, ps.length ? ps.reduce((a, [p]) => a + center(p), 0) / ps.length : center(it)] as const;
      }));
      cols[L].sort((p, q) => sc.get(p)! - sc.get(q)!);
      stack(cols[L]);
    }
  }
  // push each item down (never up) so its first input lines up with the wire coming in
  for (let L = 1; L < NL; L++) {
    let minY = TOP;
    for (const it of cols[L]) {
      const ps = preds(it);
      let want = it.y;
      if (ps.length) {
        const [p, e] = ps[0];
        const py = exitY(p, e);
        want = it.kind === 'node' ? py - portIn(e) : py - DUMMY_H / 2;
      }
      it.y = Math.max(minY, want);
      minY = it.y + it.h + (it.kind === 'node' ? GAP_Y : DUMMY_GAP);
    }
  }
  for (const n of nodes) n.y = itemOf[n.id].y;

  // y of each edge at every column boundary: source port, dummy rows, target port
  const gapSegs: { e: Edge; k: number; y0: number; y1: number }[][] = Array.from({ length: NL }, () => []);
  for (const e of edges) {
    const a = layer[e.src.id];
    e.ys = [e.src.y + portOut(e), ...e.dummies.map((d) => d.y + DUMMY_H / 2), e.dst.y + portIn(e)];
    for (let k = 0; k < e.ys.length - 1; k++) {
      if (Math.abs(e.ys[k] - e.ys[k + 1]) < 1) continue;
      gapSegs[a + k].push({ e, k, y0: e.ys[k], y1: e.ys[k + 1] });
    }
  }

  // x: columns and lane gaps
  const stageOfLayer = (L: number) => Number(Object.entries(stageLayers).find(([, [a, b]]) => L >= a && L <= b)![0]);
  const colX: number[] = [];
  const laneX = new Map<string, number>();
  let x = PAD;
  for (let L = 0; L < NL; L++) {
    colX[L] = x;
    x += NODE_W;
    if (L === NL - 1) break;
    const boundary = stageOfLayer(L) !== stageOfLayer(L + 1);
    const segs = gapSegs[L];
    const down = segs.filter((s) => s.y1 > s.y0).sort((p, q) => q.y0 - p.y0);
    const up = segs.filter((s) => s.y1 < s.y0).sort((p, q) => p.y0 - q.y0);
    const ordered = [...down, ...up];
    const lanes = LANE_MARGIN * 2 + Math.max(0, ordered.length - 1) * LANE_SP;
    const extra = boundary ? STAGE_GAP : 0;
    ordered.forEach((s, i) => laneX.set(`${L}:${s.e.id}:${s.k}`, x + extra / 2 + LANE_MARGIN + i * LANE_SP));
    x += Math.max(lanes, 40) + extra;
  }
  const width = x + PAD;
  for (const n of nodes) n.x = colX[layer[n.id]];

  const wires: Wire[] = edges.map((e) => {
    const a = layer[e.src.id];
    const ys = e.ys!;
    const pts: [number, number][] = [[e.src.x + NODE_W, ys[0]]];
    for (let k = 0; k < ys.length - 1; k++) {
      const lx = laneX.get(`${a + k}:${e.id}:${k}`);
      if (lx !== undefined) { pts.push([lx, ys[k]], [lx, ys[k + 1]]); }
    }
    pts.push([e.dst.x, ys[ys.length - 1]]);
    return {
      id: e.id, src: e.src.id, sslot: e.sslot, dst: e.dst.id, dslot: e.dslot, type: e.type, color: TYPE_COLOR[e.type] ?? '#B0B0B0', points: pts,
      label: `${e.src.title} ${e.src.outs[e.sslot]?.name ?? ''} → ${e.dst.title} ${e.dst.ins[e.dslot].name}`,
    };
  });

  const frames: Frame[] = Object.entries(stageLayers).map(([s, [a, b]]) => ({
    stage: Number(s), x: colX[a] - 12, w: colX[b] + NODE_W - colX[a] + 24,
  }));
  const height = Math.max(...nodes.map((n) => n.y + n.h), ...edges.flatMap((e) => e.dummies.map((d) => d.y + DUMMY_H))) + PAD;
  return { nodes, wires, frames, width, height };
}

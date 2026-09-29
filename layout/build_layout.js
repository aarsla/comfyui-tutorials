// Orthogonal-routed tutorial layout: layered columns, stage frames, direct wires.
// Long wires get a reserved row in every column they cross; direction changes only
// happen in the gaps between columns, each wire in its own vertical lane (native reroutes).
// Runs as an async function body inside the ComfyUI page; returns a report.
const app = window.app || window.comfyAPI?.app?.app;
const LG = window.LiteGraph;
const tutorials = await fetch('/api/userdata/tmp_tutorials.json').then(r => r.json());
const ONLY = (await fetch('/api/userdata/tmp_only.json').then(r => r.ok ? r.json() : null).catch(() => null)) || null;

const FRAMES = [
  { title: '1 · MODELS', color: '#A88' },
  { title: '2 · INPUTS', color: '#b58b2a' },
  { title: '3 · PROMPTS & CONDITIONING', color: '#88A' },
  { title: '4 · GENERATE', color: '#8A8' },
  { title: '5 · OUTPUT', color: '#3f789e' },
];
const STAGE_OF = {
  CheckpointLoaderSimple: 0, UNETLoader: 0, CLIPLoader: 0, VAELoader: 0, IPAdapterModelLoader: 0, CLIPVisionLoader: 0,
  ControlNetLoader: 0, UpscaleModelLoader: 0, LoadBackgroundRemovalModel: 0,
  LoadImage: 1, LoadImageMask: 1, ImageScaleToTotalPixels: 1, GetImageSize: 1, Canny: 1, GrowMask: 1,
  PrimitiveStringMultiline: 1, EmptyImage: 1,
  StringConcatenate: 2, CLIPTextEncode: 2, ConditioningZeroOut: 2, ReferenceLatent: 2, ControlNetApplyAdvanced: 2,
  InpaintModelConditioning: 2, VAEEncode: 2, LoraLoaderModelOnly: 2, ModelSamplingAuraFlow: 2, IPAdapterAdvanced: 2,
  SetUnionControlNetType: 2,
  EmptyLatentImage: 3, EmptySD3LatentImage: 3, EmptyFlux2LatentImage: 3, KSampler: 3, SamplerCustomAdvanced: 3,
  CFGGuider: 3, RandomNoise: 3, KSamplerSelect: 3, Flux2Scheduler: 3, RemoveBackground: 3, ImageUpscaleWithModel: 3,
  VAEDecode: 4, SaveImage: 4, ImageCompositeMasked: 4, ImageScaleBy: 4, JoinImageWithAlpha: 4, InvertMask: 4,
};
const PREVIEWS = new Set(['PreviewImage', 'MaskPreview']);
const TITLE = LG.NODE_TITLE_HEIGHT || 30;
const GAP_Y = 46, ROW_H = 24, ROW_GAP = 14, PAD = 34, FRAME_TITLE = 64;
const LANE_SP = 18, LANE_MARGIN = 26, FRAME_GAP = 40, MIN_NOTE_W = 460;
const noteHeight = (md, w) => {
  const perLine = Math.floor((w - 30) / 7.2);
  let lines = 0;
  for (const l of md.split('\n')) lines += Math.max(1, Math.ceil(l.length / perLine));
  return Math.min(1600, 60 + lines * 19);
};
const canon = p => Object.fromEntries(Object.entries(p).map(([id, n]) => [id,
  { c: n.class_type, i: Object.fromEntries(Object.entries(n.inputs).map(([k, v]) => [k, JSON.stringify(v)])) }]));

const report = [];
for (const t of tutorials) {
  if (ONLY && !ONLY.some(p => t.file.startsWith(p))) continue;
  if (t.layout === 'exercise') continue;   // built by build_exercise.js
  await app.loadApiJson(t.prompt, t.file);
  const g = app.graph;
  const nodes = [...g._nodes];
  const byId = Object.fromEntries(nodes.map(n => [String(n.id), n]));
  const linkOf = id => g.links[id] ?? g.links.get?.(id);
  const allLinks = [];
  for (const n of nodes) (n.inputs || []).forEach((inp, i) => {
    if (inp.link == null) return;
    const l = linkOf(inp.link);
    allLinks.push({ link: l, src: g.getNodeById(l.origin_id), sslot: l.origin_slot, dst: n, dslot: i });
  });

  // ---- stages + layers (stage-contiguous longest path) ----
  const stage = {};
  const srcsOf = n => allLinks.filter(e => e.dst === n).map(e => e.src);
  for (const n of nodes) if (!PREVIEWS.has(n.type)) stage[n.id] = STAGE_OF[n.type] ?? 3;
  for (const n of nodes) if (PREVIEWS.has(n.type)) stage[n.id] = stage[srcsOf(n)[0]?.id] ?? 4;
  const layer = {};
  let start = 0;
  const stageLayers = {};
  for (let s = 0; s < 5; s++) {
    const sn = nodes.filter(n => stage[n.id] === s);
    if (!sn.length) continue;
    const ld = {};
    const f = (n, seen = new Set()) => {
      if (ld[n.id] !== undefined) return ld[n.id];
      if (seen.has(n.id)) return 0;
      seen.add(n.id);
      let d = 0;
      for (const q of srcsOf(n)) if (stage[q.id] === s) d = Math.max(d, f(q, seen) + 1);
      return (ld[n.id] = d);
    };
    sn.forEach(n => f(n));
    const maxd = Math.max(...sn.map(n => ld[n.id]));
    sn.forEach(n => (layer[n.id] = start + ld[n.id]));
    stageLayers[s] = [start, start + maxd];
    start += maxd + 1;
  }
  const NL = start;

  // ---- items per layer: real nodes + dummy rows for long links ----
  for (const n of nodes) {
    const sz = n.computeSize ? n.computeSize() : n.size;
    n.size = [Math.max(n.size[0], sz[0], 300), Math.max(n.size[1], sz[1])];
  }
  const cols = Array.from({ length: NL }, () => []);
  for (const n of nodes) cols[layer[n.id]].push({ kind: 'node', n, id: 'n' + n.id });
  for (const e of allLinks) {
    e.dummies = [];
    const a = layer[e.src.id], b = layer[e.dst.id];
    for (let L = a + 1; L < b; L++) {
      const d = { kind: 'dummy', e, L, id: `d${e.link.id}_${L}` };
      e.dummies.push(d);
      cols[L].push(d);
    }
  }
  // predecessor item + port offset helpers
  const itemOf = n => cols[layer[n.id]].find(it => it.kind === 'node' && it.n === n);
  const outPortDY = (n, slot) => n.getConnectionPos(false, slot)[1] - n.pos[1];
  const inPortDY = (n, slot) => n.getConnectionPos(true, slot)[1] - n.pos[1];
  const itemY = it => it.kind === 'node' ? it.n.pos[1] : it.y;          // top of body / row center
  const preds = it => {
    if (it.kind === 'dummy') {
      const i = it.e.dummies.indexOf(it);
      return i === 0 ? [[itemOf(it.e.src), outPortDY(it.e.src, it.e.sslot)]] : [[it.e.dummies[i - 1], 0]];
    }
    return allLinks.filter(e => e.dst === it.n).map(e => e.dummies.length
      ? [e.dummies[e.dummies.length - 1], 0] : [itemOf(e.src), outPortDY(e.src, e.sslot)]);
  };

  // ---- vertical placement: stack, barycenter sweeps, then align to predecessors ----
  const stack = col => {
    let y = FRAME_TITLE + PAD;
    for (const it of col) {
      if (it.kind === 'node') { it.n.pos = [0, y + TITLE]; y = it.n.pos[1] + it.n.size[1] + GAP_Y; }
      else { it.y = y + ROW_H / 2; y += ROW_H + ROW_GAP; }
    }
  };
  cols.forEach(c => { c.sort((p, q) => (p.kind === q.kind ? 0 : p.kind === 'node' ? -1 : 1)); stack(c); });
  const center = it => it.kind === 'node' ? it.n.pos[1] + it.n.size[1] / 2 : it.y;
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let L = 1; L < NL; L++) {
      const sc = new Map(cols[L].map(it => {
        const ps = preds(it);
        return [it, ps.length ? ps.reduce((a, [p]) => a + center(p), 0) / ps.length : center(it)];
      }));
      cols[L].sort((p, q) => sc.get(p) - sc.get(q));
      stack(cols[L]);
    }
  }
  // align: push each item down (never up) so its first input lines up with its predecessor's port
  for (let L = 1; L < NL; L++) {
    let minY = FRAME_TITLE + PAD;   // top of next free space (title included for nodes)
    for (const it of cols[L]) {
      const ps = preds(it);
      if (it.kind === 'node') {
        let want = it.n.pos[1];
        if (ps.length) {
          const [p, dy] = ps[0];
          const py = p.kind === 'node' ? p.n.pos[1] + dy : p.y;
          const firstLinked = (it.n.inputs || []).findIndex(i => i.link != null);
          want = py - inPortDY(it.n, Math.max(0, firstLinked));
        }
        it.n.pos = [0, Math.max(minY + TITLE, want)];
        minY = it.n.pos[1] + it.n.size[1] + GAP_Y;
      } else {
        const [p, dy] = ps[0];
        const py = p.kind === 'node' ? p.n.pos[1] + dy : p.y;
        it.y = Math.max(minY + ROW_H / 2, py);
        minY = it.y + ROW_H / 2 + ROW_GAP;
      }
    }
  }

  // ---- segments per gap (for lane counts) ----
  const portY = (e, end) => end === 'src' ? e.src.getConnectionPos(false, e.sslot)[1] : e.dst.getConnectionPos(true, e.dslot)[1];
  const gapSegs = Array.from({ length: NL }, () => []);   // gap L = between layer L and L+1
  // need x-independent y's: node positions have x=0 now, y final; getConnectionPos y is valid
  for (const e of allLinks) {
    const a = layer[e.src.id], b = layer[e.dst.id];
    if (b <= a) continue;
    const ys = [portY(e, 'src'), ...e.dummies.map(d => d.y), portY(e, 'dst')];
    for (let k = 0; k < ys.length - 1; k++) {
      if (Math.abs(ys[k] - ys[k + 1]) < 1) continue;
      gapSegs[a + k].push({ e, k, y0: ys[k], y1: ys[k + 1] });
    }
    e.ys = ys;
  }

  // ---- x placement: columns, lane gaps, frames ----
  const colW = cols.map(c => Math.max(90, ...c.filter(i => i.kind === 'node').map(i => i.n.size[0])));
  const stageOfLayer = L => Object.entries(stageLayers).find(([, [a, b]]) => L >= a && L <= b)?.[0];
  const colX = [];
  let x = PAD;
  const laneX = {};   // `${gap}:${linkId}:${k}` -> x
  const stagesWithNotes = new Set(t.notes.filter(n => n[0] !== 'intro').map(n => String(stage[byId[n[0]].id])));
  for (let L = 0; L < NL; L++) {
    colX[L] = x;
    x += colW[L];
    // last column of a stage with notes: widen it so the frame fits the notes without covering wire lanes
    const st = stageOfLayer(L);
    if (stagesWithNotes.has(st) && stageLayers[st][1] === L) {
      const deficit = MIN_NOTE_W - (x - colX[stageLayers[st][0]]);
      if (deficit > 0) { colW[L] += deficit; x += deficit; }
    }
    if (L === NL - 1) break;
    const boundary = stageOfLayer(L) !== stageOfLayer(L + 1);
    const segs = gapSegs[L];
    // lane order: downward segments first (sorted by start y desc), then upward (start y asc)
    const down = segs.filter(s => s.y1 > s.y0).sort((p, q) => q.y0 - p.y0);
    const up = segs.filter(s => s.y1 < s.y0).sort((p, q) => p.y0 - q.y0);
    const ordered = [...down, ...up];
    const laneBlock = LANE_MARGIN * 2 + Math.max(0, ordered.length - 1) * LANE_SP;
    const gapStart = x + (boundary ? PAD + FRAME_GAP / 2 : 0);
    ordered.forEach((s, i) => (laneX[`${L}:${s.e.link.id}:${s.k}`] = gapStart + LANE_MARGIN + i * LANE_SP));
    x += boundary ? PAD * 2 + FRAME_GAP + laneBlock : Math.max(70, laneBlock);
  }
  // uniform widths + x for nodes
  for (let L = 0; L < NL; L++) for (const it of cols[L]) if (it.kind === 'node') { it.n.size[0] = colW[L]; it.n.pos[0] = colX[L]; }

  // ---- routing: build native reroute chains (created target-side first) ----
  let reroutes = 0;
  if (!t.unwire) for (const e of allLinks) {
    const a = layer[e.src.id], b = layer[e.dst.id];
    if (b <= a || !e.ys) continue;
    const pts = [];
    for (let k = 0; k < e.ys.length - 1; k++) {
      const lx = laneX[`${a + k}:${e.link.id}:${k}`];
      if (lx === undefined) continue;
      pts.push([lx, e.ys[k]], [lx, e.ys[k + 1]]);
    }
    if (!pts.length) continue;
    let r = g.createReroute(pts[pts.length - 1], e.link);
    for (let i = pts.length - 2; i >= 0; i--) r = g.createReroute(pts[i], r);
    reroutes += pts.length;
  }
  if (t.unwire) for (const n of nodes) (n.inputs || []).forEach((inp, i) => { if (inp.link != null) n.disconnectInput(i); });

  // ---- frames + notes ----
  const notesByStage = {};
  for (const [anchor, title, md] of t.notes) if (anchor !== 'intro') (notesByStage[stage[byId[anchor].id]] ??= []).push([title, md]);
  const bottomOf = L => Math.max(FRAME_TITLE + PAD, ...cols[L].map(it => it.kind === 'node' ? it.n.pos[1] + it.n.size[1] : it.y + ROW_H));
  let extraShift = 0;
  const frames = [];
  for (const [s, [a, b]] of Object.entries(stageLayers).sort((p, q) => p[1][0] - q[1][0])) {
    const fx = colX[a] - PAD;
    let fw = colX[b] + colW[b] + PAD - fx;
    const notes = notesByStage[s] || [];
    if (notes.length && fw < MIN_NOTE_W + 2 * PAD) fw = MIN_NOTE_W + 2 * PAD;   // wider frame (notes only)
    let y = Math.max(...Array.from({ length: b - a + 1 }, (_, i) => bottomOf(a + i))) + 40;
    for (const [title, md] of notes) {
      const note = LG.createNode('MarkdownNote');
      note.title = title;
      note.widgets[0].value = `## ${title}\n\n${md}`;
      const w = fw - 2 * PAD, h = noteHeight(note.widgets[0].value, w);
      note.size = [w, h]; note.pos = [fx + PAD, y + TITLE];
      note.color = '#232'; note.bgcolor = '#353';
      g.add(note);
      y += h + TITLE + 30;
    }
    frames.push({ s, fx, fw, fh: y + PAD });
  }
  for (const f of frames) {
    const grp = new LG.LGraphGroup(FRAMES[f.s].title);
    grp.color = FRAMES[f.s].color;
    grp.font_size = 28;
    grp.pos = [f.fx, 0];
    grp.size = [f.fw, f.fh];
    g.add(grp);
  }
  const intro = t.notes.find(n => n[0] === 'intro');
  if (intro) {
    const note = LG.createNode('MarkdownNote');
    note.title = intro[1];
    note.widgets[0].value = `## ${intro[1]}\n\n${intro[2]}`;
    note.size = [560, noteHeight(note.widgets[0].value, 560)];
    note.pos = [-560 - 80, TITLE + 10];
    note.color = '#223'; note.bgcolor = '#335';
    g.add(note);
  }
  g.setDirtyCanvas(true, true);

  // ---- checks: overlaps between boxes; wire segments crossing nodes; prompt identical ----
  const boxes = g._nodes.map(n => ({ x: n.pos[0], y: n.pos[1] - TITLE, w: n.size[0], h: n.size[1] + TITLE, n }));
  let ov = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const p = boxes[i], q = boxes[j];
    if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) ov++;
  }
  let hits = 0;
  const nodeBoxes = boxes;   // nodes and notes: wires must avoid both
  if (!t.unwire) for (const e of allLinks) {
    const a = layer[e.src.id], b = layer[e.dst.id];
    if (b <= a || !e.ys) continue;
    // polyline: src port -> (lane corners) -> dst port
    const P = [e.src.getConnectionPos(false, e.sslot)];
    for (let k = 0; k < e.ys.length - 1; k++) {
      const lx = laneX[`${a + k}:${e.link.id}:${k}`];
      if (lx !== undefined) P.push([lx, e.ys[k]], [lx, e.ys[k + 1]]);
    }
    P.push(e.dst.getConnectionPos(true, e.dslot));
    for (let i = 0; i < P.length - 1; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[i + 1];
      for (const bx of nodeBoxes) {
        if (bx.n === e.src || bx.n === e.dst) continue;
        const inX = Math.max(x1, x2) > bx.x + 2 && Math.min(x1, x2) < bx.x + bx.w - 2;
        const inY = Math.max(y1, y2) > bx.y + 2 && Math.min(y1, y2) < bx.y + bx.h - 2;
        if (inX && inY) hits++;
      }
    }
  }
  let verdict = 'n/a (exercise)';
  if (!t.unwire) {
    const out = (await app.graphToPrompt()).output;
    const A = canon(t.prompt), B = canon(out), diffs = [];
    for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
      if (!A[id] || !B[id]) { diffs.push(`node ${id} missing`); continue; }
      for (const k of new Set([...Object.keys(A[id].i), ...Object.keys(B[id].i)]))
        if (A[id].i[k] !== B[id].i[k] && !(k === 'sampling' && A[id].i[k] === undefined)) diffs.push(`${id}.${k}`);
    }
    verdict = diffs.length ? 'MISMATCH ' + diffs.slice(0, 5).join(',') : 'identical';
  }
  const data = g.serialize();
  const r = await fetch('/api/userdata/' + encodeURIComponent('workflows/Tutorials/' + t.file) + '?overwrite=true',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  report.push(`${r.status} ${t.file}: layers=${NL} reroutes=${reroutes} overlaps=${ov} wire-through-node=${hits} prompt=${verdict}`);
}
return report.join('\n');

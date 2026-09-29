// Builds "wire it yourself" exercises (tutorials with layout: 'exercise'):
// classic left-to-right flow layout, all wires removed, a yellow hint box under every node.
// Runs as an async function body inside the ComfyUI page; returns a report.
const app = window.app || window.comfyAPI?.app?.app;
const LG = window.LiteGraph;
const tutorials = await fetch('/api/userdata/tmp_tutorials.json').then(r => r.json());
const ONLY = (await fetch('/api/userdata/tmp_only.json').then(r => r.ok ? r.json() : null).catch(() => null)) || null;
const T = LG.NODE_TITLE_HEIGHT || 30, HINT_H = 118, GAP = 40, COL_GAP = 110;
const report = [];

for (const t of tutorials) {
  if (t.layout !== 'exercise') continue;
  if (ONLY && !ONLY.some(p => t.file.startsWith(p))) continue;
  await app.loadApiJson(t.prompt, t.file);
  const g = app.graph;
  const byClass = c => g._nodes.filter(n => n.type === c);
  for (const n of g._nodes) { const s = n.computeSize(); n.size = [Math.max(n.size[0], s[0], 320), Math.max(n.size[1], s[1])]; }

  // classic SD layout: checkpoint | prompts + latent stacked | KSampler | VAE Decode | Save
  const ckpt = byClass('CheckpointLoaderSimple')[0];
  const [pos, neg] = byClass('CLIPTextEncode').sort((a, b) => a.id - b.id);
  const latent = byClass('EmptyLatentImage')[0], ks = byClass('KSampler')[0];
  const dec = byClass('VAEDecode')[0], save = byClass('SaveImage')[0];
  pos.size[1] = Math.max(pos.size[1], 150); neg.size[1] = Math.max(neg.size[1], 120);
  save.size = [Math.max(save.size[0], 380), Math.max(save.size[1], 380)];
  const place = (n, x, y) => { n.pos = [x, y + T]; return y + T + n.size[1] + 12 + HINT_H + GAP; };
  const colB = 460;
  const colC = colB + Math.max(pos.size[0], neg.size[0], latent.size[0]) + COL_GAP;
  const colD = colC + ks.size[0] + COL_GAP, colE = colD + dec.size[0] + COL_GAP;
  let y = place(pos, colB, 0); y = place(neg, colB, y); place(latent, colB, y);
  place(ckpt, 0, pos.size[1] + T + 40);
  place(ks, colC, 0); place(dec, colD, 0); place(save, colE, 0);

  for (const n of [...g._nodes]) (n.inputs || []).forEach((inp, i) => { if (inp.link != null) n.disconnectInput(i); });

  for (const [id, md] of Object.entries(t.hints || {})) {
    const n = g.getNodeById(Number(id));
    const note = LG.createNode('MarkdownNote');
    note.title = 'Hint: ' + (n.title || n.type);
    note.widgets[0].value = md;
    note.size = [n.size[0], HINT_H];
    note.pos = [n.pos[0], n.pos[1] + n.size[1] + 12 + T];
    note.color = '#432'; note.bgcolor = '#653';
    g.add(note);
  }
  const intro = t.notes.find(x => x[0] === 'intro');
  if (intro) {
    const note = LG.createNode('MarkdownNote');
    note.title = intro[1];
    note.widgets[0].value = `## ${intro[1]}\n\n**Layout tip:** nodes are placed in the order data flows - each node sits next to what feeds it, and the **yellow hint** under every node tells you exactly where its inputs come from.\n\n${intro[2]}`;
    note.size = [560, 1150];
    note.pos = [-640, T];
    note.color = '#223'; note.bgcolor = '#335';
    g.add(note);
  }
  g.setDirtyCanvas(true, true);
  const data = g.serialize();
  const r = await fetch('/api/userdata/' + encodeURIComponent('workflows/Tutorials/' + t.file) + '?overwrite=true',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const boxes = g._nodes.map(n => ({ x: n.pos[0], y: n.pos[1] - T, w: n.size[0], h: n.size[1] + T }));
  let ov = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov++;
  }
  report.push(`${r.status} ${t.file}: exercise layout, wires=${(data.links || []).length} overlaps=${ov}`);
}
return report.join('\n');

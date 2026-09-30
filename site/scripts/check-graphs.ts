// Checks every lesson graph: wires must not pass behind nodes, no back edges, known output types.
import T from '../src/data/tutorials.json';
import { layoutGraph, type ApiGraph } from '../src/lib/graph';

let bad = 0;
for (const t of T as { file: string; prompt: ApiGraph }[]) {
  const L = layoutGraph(t.prompt);
  let through = 0, back = 0, unknown = 0, overlaps = 0;
  for (const w of L.wires) {
    if (w.type === 'ANY') unknown++;
    const s = L.nodes.find((n) => n.id === w.src)!, d = L.nodes.find((n) => n.id === w.dst)!;
    if (d.x <= s.x) back++;
    for (let i = 0; i < w.points.length - 1; i++) {
      const [x0, y0] = w.points[i], [x1, y1] = w.points[i + 1];
      for (const n of L.nodes) {
        const hitX = Math.max(Math.min(x0, x1), n.x + 1) < Math.min(Math.max(x0, x1), n.x + n.w - 1);
        const hitY = Math.max(Math.min(y0, y1), n.y + 1) < Math.min(Math.max(y0, y1), n.y + n.h - 1);
        const onLineX = x0 === x1 && x0 > n.x && x0 < n.x + n.w;
        const onLineY = y0 === y1 && y0 > n.y && y0 < n.y + n.h;
        if ((onLineY && hitX) || (onLineX && hitY)) through++;
      }
    }
  }
  for (const a of L.nodes) for (const b of L.nodes) if (a.id < b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++;
  if (through || back || unknown || overlaps) bad++;
  console.log(`${t.file.slice(0, 40).padEnd(40)} ${L.width}x${L.height} nodes=${L.nodes.length} wire-through-node=${through} back=${back} unknown-type=${unknown} overlaps=${overlaps}`);
}
process.exit(bad ? 1 : 0);

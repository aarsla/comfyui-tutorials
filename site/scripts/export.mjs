// Export the repo's tutorial data into the site:
// - tutorials.py -> src/data/tutorials.json
// - models.json  -> src/data/models.json
// - one workflow file per tutorial -> public/workflows/. Uses the saved UI workflow from
//   ../workflows/Tutorials/ when present (layout, notes, model download links), else the API graph.
// - the input images the lessons load (../inputs/) -> public/inputs/
// - everything in public/workflows/comfyui-tutorials.zip, laid out like the ComfyUI folder
//   (user/default/workflows/Tutorials/, input/), so one unzip into that folder puts each file in place.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { readdirSync } from 'node:fs';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(site, '..');
const out = join(site, 'src/data/tutorials.json');
const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
execFileSync(py, [join(repo, 'tutorials.py'), out], { stdio: 'inherit' });
copyFileSync(join(repo, 'models.json'), join(site, 'src/data/models.json'));

const T = JSON.parse(readFileSync(out, 'utf8'));

// Benchmarks from ../bench.py: one JSON per machine -> src/data/bench.json.
const benchDir = join(repo, 'bench');
const bench = existsSync(benchDir)
  ? Object.fromEntries(readdirSync(benchDir).filter((f) => f.endsWith('.json'))
    .map((f) => { const b = JSON.parse(readFileSync(join(benchDir, f), 'utf8')); return [b.name, b]; }))
  : {};
writeFileSync(join(site, 'src/data/bench.json'), JSON.stringify(bench));
const dir = join(site, 'public/workflows');
mkdirSync(dir, { recursive: true });
let saved = 0;
const linked = {};   // file -> true when the served workflow carries model download links
for (const t of T) {
  const ui = join(repo, 'workflows/Tutorials', t.file);
  if (existsSync(ui)) {
    copyFileSync(ui, join(dir, t.file));
    saved++;
    const wf = JSON.parse(readFileSync(ui, 'utf8'));
    linked[t.file] = (wf.nodes ?? []).some((n) => Array.isArray(n.properties?.models));
  } else {
    writeFileSync(join(dir, t.file), JSON.stringify(t.prompt, null, 1));
    linked[t.file] = false;
  }
}
const images = [...new Set(T.flatMap((t) => Object.values(t.prompt)
  .filter((n) => n.class_type === 'LoadImage').map((n) => n.inputs.image)))];
const inDir = join(site, 'public/inputs');
mkdirSync(inDir, { recursive: true });
for (const f of images) copyFileSync(join(repo, 'inputs', f), join(inDir, f));
writeFileSync(join(dir, 'comfyui-tutorials.zip'), zip([
  ...T.map((t) => ['user/default/workflows/Tutorials/' + t.file, readFileSync(join(dir, t.file))]),
  ...images.map((f) => ['input/' + f, readFileSync(join(inDir, f))]),
]));
console.log(`${T.length} workflows written to public/workflows (${saved} saved UI workflows, ${T.length - saved} API graphs), ${images.length} input images`);
const unlinked = T.filter((t) => !linked[t.file]).length;
if (unlinked) {
  console.warn(`WARNING: ${unlinked} workflows carry no model download links, so the setup page's step 3 ` +
    `("ComfyUI offers to download missing models") is not true for them yet. ` +
    `Rebuild in ComfyUI and run \`python publish.py --fetch\` before deploying.`);
}

// Minimal zip writer: deflated entries, UTF-8 names, fixed timestamp so rebuilds give the same file.
function zip(entries) {
  const parts = [], central = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const body = deflateRawSync(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);            // version needed
    head.writeUInt16LE(0x0800, 6);        // UTF-8 names
    head.writeUInt16LE(8, 8);             // deflate
    head.writeUInt16LE(0, 10);            // time 00:00
    head.writeUInt16LE((46 << 9) | (1 << 5) | 1, 12);  // date 2026-01-01
    head.writeUInt32LE(crc32(data), 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    head.copy(cen, 6, 4, 28);             // version needed .. name length
    cen.writeUInt32LE(offset, 42);
    parts.push(head, nameBuf, body);
    central.push(cen, nameBuf);
    offset += head.length + nameBuf.length + body.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cenBuf, end]);
}

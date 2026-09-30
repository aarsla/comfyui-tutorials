// Export the repo's tutorial data into the site:
// - tutorials.py -> src/data/tutorials.json
// - models.json  -> src/data/models.json
// - one workflow file per tutorial -> public/workflows/. Uses the saved UI workflow from
//   ../workflows/Tutorials/ when present (layout, notes, model download links), else the API graph.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(site, '..');
const out = join(site, 'src/data/tutorials.json');
const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
execFileSync(py, [join(repo, 'tutorials.py'), out], { stdio: 'inherit' });
copyFileSync(join(repo, 'models.json'), join(site, 'src/data/models.json'));

const T = JSON.parse(readFileSync(out, 'utf8'));
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
console.log(`${T.length} workflows written to public/workflows (${saved} saved UI workflows, ${T.length - saved} API graphs)`);
const unlinked = T.filter((t) => !linked[t.file]).length;
if (unlinked) {
  console.warn(`WARNING: ${unlinked} workflows carry no model download links, so the setup page's step 3 ` +
    `("ComfyUI offers to download missing models") is not true for them yet. ` +
    `Rebuild in ComfyUI and run \`python publish.py --fetch\` before deploying.`);
}

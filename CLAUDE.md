# ComfyUI tutorial workflows (Meridian theme)

This project builds a graded series of **ComfyUI tutorial workflows** for learning ComfyUI. Each tutorial is a
tested workflow with Markdown info boxes, saved into ComfyUI's **Workflows → Tutorials** folder. All prompts use the
sci-fi look of the user's game **Meridian** (https://meridian-gules-eta.vercel.app/): a worn off-white survey ship with
red/orange hazard markings above storm clouds on the planet Veyra, Anchor Station hanging on cables in the clouds,
off-white + orange robots with cyan eyes, cream crew suits with orange bands, slow-burn horror mood.

## Environment

| What | Where |
|---|---|
| ComfyUI server | `http://127.0.0.1:8188` (also on LAN: `--listen 0.0.0.0`, see below) |
| Python for scripts | `D:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\.venv\Scripts\python.exe` (has Pillow) |
| Models | `D:\Comfy-Desktop\ComfyUI-Shared\models\` |
| Inputs / outputs | `D:\Comfy-Desktop\ComfyUI-Shared\input\` / `...\output\` (tutorial results in `output\tut\`) |
| Saved workflows | `D:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\user\default\workflows\Tutorials\` |
| Comfy Desktop settings | `%APPDATA%\Comfy Desktop\settings.json`, `installations.json` (launchArgs) |

**Local models** (only use these unless the user asks to download more):
- SDXL checkpoint `Juggernaut-XL_v9_RunDiffusionPhoto_v2` (+ `controlnet-union-sdxl-promax`, `ip-adapter-plus_sdxl_vit-h` + `CLIP-ViT-H-14-laion2B-s32B-b79K`)
- Z-Image Turbo: `z_image_turbo_bf16` + CLIP `qwen_3_4b` type **lumina2** + VAE `ae` + ModelSamplingAuraFlow shift 3; res_multistep/simple, 8 steps, CFG 1
- Krea-2 Turbo: `krea2_turbo_fp8_scaled` + CLIP `qwen3vl_4b_fp8_scaled` type **krea2** + VAE `qwen_image_vae`; euler/simple, 8 steps, CFG 1; LoRAs `krea2_*` (darkbrush, softwatercolor, retroanime, neondrip, kidsdrawing, dotmatrix, vintagetarot, rainywindow, sunsetblur)
- Flux.2 Klein 4B (distilled): `flux-2-klein-4b` + CLIP `qwen_3_4b` type **flux2** + VAE `flux2-vae`; SamplerCustomAdvanced, Flux2Scheduler 4 steps, CFG 1; image editing via ReferenceLatent
- Utilities: `4x-UltraSharp`, `RealESRGAN_x4plus.pth`, `birefnet` (background removal), MoGe
- Model + text encoder (+ its **type**) + VAE are a **matched set** - never swap one without the others.

**Meridian game art** already in the input folder (good tutorial inputs): `corridor_day.png`, `medbay_day.png`,
`stasis_bay_day.png`, `engineering_day.png`, `cockpit_day.png`, `landing_platform_day.png`, `fuel_depot_day.png`,
`station1_clouds.png`, crew suit `front.png` / `side.png`, robot model sheet `robot_sheet.png` (front, side, back).
`tut_medbay_masked.png` = medbay with a pre-painted inpaint mask (alpha 0 = masked).

## Project layout

```
tutorials.py              # THE source of truth: every tutorial = API prompt + notes (+ exercise hints)
comfy.py                  # run(prompt) -> queue an API prompt, wait, return output file paths
test_tutorials.py [NN..]  # run every (or selected) tutorial through the API; writes test_results.json
publish.py [NN..]         # stage tutorials + layout scripts into ComfyUI userdata (tmp_*); --cleanup removes them
layout/build_layout.js    # in-page builder: stage frames, column layout, orthogonal wire routing, notes, checks
layout/build_exercise.js  # in-page builder for layout:"exercise" tutorials (classic layout, no wires, hint boxes)
make_samples.py           # generate sample input images with Z-Image
get_loras.py              # download + sha256-verify the Krea-2 style LoRAs
workflows/                # other (non-tutorial) workflows
images/                   # tutorial_results_gallery.jpg (one result per tutorial), sampler shootout sheets
```

## How to add or change a tutorial

1. **Define it in `tutorials.py`**: append to `T` a dict
   `{"file": "NN - Title.json", "prompt": {API graph}, "notes": [(anchor, title, markdown), ...]}`.
   - Build API nodes with `N(class_type, title, **inputs)`; links are `["node_id", output_index]`.
   - Check exact input names/options first: `GET /api/object_info/<NodeClass>`. Copy model settings from the
     official template in `.venv\Lib\site-packages\comfyui_workflow_templates_json\templates\` when unsure.
   - Notes: one `("intro", ...)` box (goal + `{HOWTO}`), then boxes anchored to a node id explaining that stage:
     **inputs → outputs, what each widget does, and a "Try this" list**. Use Meridian prompts and game art.
2. **Test it**: `python test_tutorials.py NN`. Then **look at the output images** (make a contact sheet with Pillow)
   and fix anything that doesn't show the lesson clearly. Never claim a result in a note that you haven't seen.
3. **Stage it**: `python publish.py` (or `python publish.py NN` to rebuild only that one).
4. **Build it in the ComfyUI page** (built-in browser at `http://127.0.0.1:8188`, run with the JavaScript tool):
   ```js
   const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
   const out = [];
   for (const f of ['tmp_build.js', 'tmp_exercise.js']) {
     const code = await fetch('/api/userdata/' + f).then(r => r.text());
     out.push(await (new AsyncFunction(code))());
   }
   out.join('\n')
   ```
   Every line must report `overlaps=0 wire-through-node=0 prompt=identical`.
5. **Clean up**: `python publish.py --cleanup`, close the browser tab. Tell the user to press **Ctrl+R** in
   Comfy Desktop to see updated workflows.
6. **Visual check** (optional but recommended): load the saved workflow with `app.loadGraphData`, click the canvas,
   press `.` (fit view), screenshot. Note text only renders above ~60 % zoom.

## Layout rules (user preferences - keep them)

- **Direct, visible wires only.** The user tried KJNodes Set/Get nodes and found them hard to follow - don't use them.
- **Wires must never pass behind a node or note.** `build_layout.js` guarantees this: nodes in equal-width columns,
  long wires get a reserved row in every column they cross, direction changes only in the gaps between columns,
  each wire in its own lane (native reroutes created with `graph.createReroute`, built target-side first).
- **Stage frames left → right**: `1 · MODELS → 2 · INPUTS → 3 · PROMPTS & CONDITIONING → 4 · GENERATE → 5 · OUTPUT`.
  When a tutorial uses a node class not in `STAGE_OF` (in `build_layout.js`), **add it** there.
- Link render mode is set to **Straight** in ComfyUI settings.
- **Exercises** (`"unwire": True, "layout": "exercise"`) use the classic flow layout (each node next to what feeds it)
  with a yellow `hints` box under every node saying which output goes into each input.

## Lessons learned (avoid repeating these)

- `JoinImageWithAlpha` treats white as transparent → invert the subject mask first; `ImageCompositeMasked` doesn't.
- Z-Image barely restyles in img2img (stays photo); use **Krea-2** for style changes.
- Turbo/flow models collapse with the **karras** scheduler - keep `simple`.
- Klein edit instructions: don't name people/things you *don't* want changed (the model changes them); paste back
  only the edited area with a mask if the rest must stay pixel-identical.
- Negative prompts fix things the model keeps adding (ship over ocean/desert → negative `ground, desert, ocean`).
- The UI adds an optional `sampling: "flow"` input to ModelSamplingAuraFlow - a harmless default, ignored in the check.
- Screenshots of the browser pane sometimes time out; retry, or verify numerically (overlap/route checks).

## ComfyUI / machine setup notes

- D: was reformatted from exFAT to **NTFS** (Comfy Desktop's downloader needs hard links; exFAT left `.part` files).
- ComfyUI listens on the LAN (`--enable-manager --listen 0.0.0.0` in `installations.json`) at `http://192.168.0.15:8188`.
  With ComfyUI-Manager `network_mode = public`, Manager model downloads and custom-node installs are **blocked**;
  Comfy Desktop's own download dialog still works. `personal_cloud` would allow them (ask the user first).
- ReActor is installed but broken (needs insightface → C++ build tools); not used. KJNodes is installed but unused.
- Ask before downloading models, installing custom nodes, or changing ComfyUI / Comfy Desktop settings.

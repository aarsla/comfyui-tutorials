"""Definitions of the ComfyUI tutorial series (API graphs + info notes).

Each tutorial: file name, API-format prompt, notes anchored to node ids
("intro" goes to the left of the graph), optional unwire flag (exercise).
"""
import json, sys

JUGG = "Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors"


def N(cls, title, **inputs):
    return {"class_type": cls, "inputs": inputs, "_meta": {"title": title}}


TYPES_TABLE = """| Type | Colour | What it carries |
|---|---|---|
| **MODEL** | lavender | the diffusion model (the "painter") |
| **CLIP** | yellow | the text encoder (turns words into numbers) |
| **VAE** | red | converts between pixels and latents |
| **CONDITIONING** | orange | your encoded prompt |
| **LATENT** | pink | the compressed image the model works on |
| **IMAGE** | blue | normal pixels you can see/save |
| **MASK** | green | black/white area selection |
| INT / FLOAT / STRING | grey-ish | numbers and text |"""

HOWTO = """### How to use every tutorial
1. Read this box, then the boxes **below** the nodes (left → right).
2. Click **Run** (or **Ctrl+Enter**). The result appears in the Save/Preview node and the queue panel.
3. Do the **Try this** experiments and Run again - learning = changing one thing at a time.

**Reading the graph:** coloured frames run **left → right**: 1 MODELS → 2 INPUTS → 3 PROMPTS → 4 GENERATE → 5 OUTPUT. Wires only turn in the gaps between columns; the **dots** on wires are *reroutes* (drag one to re-route a wire). Follow a wire by its colour = its data type.

**Canvas tips:** drag empty space to pan · scroll to zoom · **.** fits everything · double-click empty canvas to **search & add a node** · click a node + **Ctrl+B** bypasses it · **Ctrl+Z** undo."""


def sdxl_basic(prompt, neg, seed=1234, steps=30, cfg=5.0, w=1024, h=1024, prefix="tut/00_first"):
    return {
        "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
        "2": N("CLIPTextEncode", "Positive Prompt", text=prompt, clip=["1", 1]),
        "3": N("CLIPTextEncode", "Negative Prompt", text=neg, clip=["1", 1]),
        "4": N("EmptyLatentImage", "Empty Latent Image", width=w, height=h, batch_size=1),
        "5": N("KSampler", "KSampler", model=["1", 0], positive=["2", 0], negative=["3", 0], latent_image=["4", 0],
               seed=seed, steps=steps, cfg=cfg, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0),
        "6": N("VAEDecode", "VAE Decode", samples=["5", 0], vae=["1", 2]),
        "7": N("SaveImage", "Save Image", images=["6", 0], filename_prefix=prefix),
    }


def zimage_loaders():
    return {
        "1": N("UNETLoader", "Load Diffusion Model", unet_name="z_image_turbo_bf16.safetensors", weight_dtype="default"),
        "2": N("CLIPLoader", "Load CLIP (text encoder)", clip_name="qwen_3_4b.safetensors", type="lumina2", device="default"),
        "3": N("VAELoader", "Load VAE", vae_name="ae.safetensors"),
        "4": N("ModelSamplingAuraFlow", "Model Sampling (shift)", model=["1", 0], shift=3.0),
    }


def krea_loaders():
    return {
        "1": N("UNETLoader", "Load Diffusion Model", unet_name="krea2_turbo_fp8_scaled.safetensors", weight_dtype="default"),
        "2": N("CLIPLoader", "Load CLIP (text encoder)", clip_name="qwen3vl_4b_fp8_scaled.safetensors", type="krea2", device="default"),
        "3": N("VAELoader", "Load VAE", vae_name="qwen_image_vae.safetensors"),
    }


T = []

# ---------------------------------------------------------------- 00
g = sdxl_basic("a weathered off-white semi rusted weathered survey spaceship with red-orange hazard stripes and exposed hull panels flying above a thick "
               "unbroken layer of white clouds that covers everything below like a floor, blue sky above, bright daylight, scratched metal, cinematic sci-fi "
               "concept art, highly detailed, camera angle from below",
               "ground, desert, landscape, mountains, ocean, sea, water, blurry, lowres, watermark, text")
T.append({"file": "00 - Start Here - Node Basics.json", "prompt": g, "notes": [
    ("intro", "00 · Start Here: Node Basics", f"""Welcome! This is the **smallest complete image-generation workflow**. Every other tutorial builds on it.

A **node** is one box that does one job. It has **inputs** (left side dots), **widgets** (the editable values inside) and **outputs** (right side dots). You connect an **output** to an **input of the same type** by dragging from dot to dot. Colours tell you the type:

{TYPES_TABLE}

A red outline after Run = a required input is missing or a value is invalid.

{HOWTO}"""),
    ("1", "① Load Checkpoint", """**Inputs:** none · **Widget:** ckpt_name
**Outputs:** MODEL · CLIP · VAE

A *checkpoint* is one file that bundles all three parts. Here: **Juggernaut XL** (an SDXL photo model).
Newer models (tutorials 03-06) ship as **separate files** loaded by three separate loader nodes."""),
    ("1", "Tidy graphs: frames + reroutes", """This graph follows the studio rule **left → right**: every **frame** (coloured box) is one stage, and data flows from frame to frame.

**Wires never pass behind a node:**
- Nodes sit in **columns**; wires only turn in the **gaps** between columns.
- A long wire (e.g. MODEL or VAE jumping to a later stage) runs along its **own empty row**.
- The **dots** are **reroutes** - bend points. Click the small dot in the middle of any wire → **Add Reroute**, then drag it to route the wire around nodes. Right-angle wires = easy to follow.

**Frames:** select nodes → **Ctrl+G** → rename and pick a colour. Leave space - a graph should be understandable in 10 seconds.

**Wire style:** Settings → *Link Render Mode* → **Straight** gives the clean right-angle wires you see here."""),
    ("2", "② CLIP Text Encode (×2)", """**Input:** CLIP · **Widget:** text · **Output:** CONDITIONING

Turns your words into CONDITIONING. The **positive** one says what you want, the **negative** one what to avoid. Both use the **same** CLIP output - one output can feed many inputs.

*Real example:* while building this tutorial the ship kept appearing over an **ocean**, then a **desert**. Adding `ground, desert, ocean, sea` to the **negative** prompt fixed it. Use the negative for things the model keeps adding that you don't want."""),
    ("4", "③ Empty Latent Image", """**Widgets:** width, height, batch_size · **Output:** LATENT

The blank "canvas" (pure noise). SDXL likes ~1 megapixel: 1024×1024, 832×1216, 1216×832.
**batch_size** = how many images per run."""),
    ("5", "④ KSampler - the heart", """**Inputs:** MODEL, positive, negative, LATENT · **Output:** LATENT

Removes noise step by step, steered by the prompts.
- **seed** - same seed + same settings = same image. *control after generate* decides if it changes each run.
- **steps** - more = more detail, slower (SDXL: 25-35).
- **cfg** - how strictly to follow the prompt (SDXL: 4-7).
- **sampler / scheduler** - the denoising algorithm.
- **denoise** - 1.0 = start from pure noise (lower values in tutorial 07)."""),
    ("5", "Samplers & schedulers explained", """The KSampler turns noise into an image in **steps**. Two settings control *how*:
- **sampler_name** = the **algorithm** that takes each step.
- **scheduler** = **how big each step is** (how the noise is spread over the steps).

### Samplers
| Sampler | What it's like |
|---|---|
| **euler** | Simplest and fast. Reliable default, especially for Turbo/Flux/Krea/Z-Image. |
| **euler_ancestral** | Euler + fresh random noise every step → more creative, softer, changes with every step count. |
| **dpmpp_2m** | Fast, sharp, "settles" on a final image. Best all-round choice for SDXL. |
| **dpmpp_2m_sde** | Like 2m but adds noise → more fine detail/texture (used here). |
| **dpmpp_3m_sde** | Even more detail, needs ≥30 steps. |
| **dpmpp_sde** / **heun** | 2 model runs per step → ~2× slower, high quality. |
| **uni_pc** | Converges quickly - good at low step counts (10-20). |
| **res_multistep** | Made for new flow models - Z-Image's template uses it. |
| **ddim** | The classic old one; mostly for compatibility. |
| **lcm** | Only for LCM models/LoRAs. |

**Name hints:** **_ancestral / _sde** = adds noise each step (varied, never fully "settles" - same seed + more steps = a *different* image). Without it = converges (more steps = the *same* image, refined). **_gpu** = same result, noise made on the GPU. **_cfg_pp** = needs a low CFG (~1-2).

### Schedulers
| Scheduler | Step spacing |
|---|---|
| **normal** | Even spacing. |
| **karras** | More small steps near the end → sharper detail. Great with dpmpp_*. |
| **exponential** | Similar to karras, pairs well with *_sde*. |
| **simple** | Default for new flow models (Z-Image, Krea-2, Flux). |
| **sgm_uniform** | For Turbo/LCM-style SDXL models. |
| **beta** | Newer, detailed start and end; works with many samplers. |
| **ddim_uniform** | Pair with ddim. |

### Good pairings
- **SDXL (Juggernaut):** dpmpp_2m + karras (25-30 steps) · dpmpp_2m_sde + karras (more texture) · euler_ancestral + normal (dreamier).
- **Z-Image / Krea-2 / Flux (turbo):** keep the template's pair (res_multistep or euler + simple) - they're tuned for few steps.

**Try this:** set *control after generate* to **fixed**, then change only the sampler/scheduler and Run - same seed, different "handwriting". Tutorial 02 shows settings side by side."""),
    ("6", "⑤ VAE Decode → ⑥ Save Image", """**VAE Decode:** LATENT + VAE → IMAGE (pixels).
**Save Image:** IMAGE → file in `ComfyUI-Shared\\output` (prefix = sub-folder/name). Use **Preview Image** instead if you don't want to keep it.

**Try this:** change the prompt · set batch_size to 4 · change width/height to 832×1216 (portrait)."""),
]})

# ---------------------------------------------------------------- 01
T.append({"file": "01 - Exercise - Wire It Yourself.json", "prompt": sdxl_basic(
    "a dented off-white maintenance robot with orange armor plates and glowing cyan eyes standing in a grimy spaceship corridor, emergency lights, sci-fi",
    "blurry, lowres", prefix="tut/01_wired"),
    "unwire": True, "test": True, "layout": "exercise",
    # yellow hint boxes placed under each node (node id -> markdown); built by layout/build_exercise.js
    "hints": {
        "1": "**Outputs (right side):**\n- **MODEL** (lavender) → KSampler *model*\n- **CLIP** (yellow) → *clip* on **both** prompts\n- **VAE** (red) → VAE Decode *vae*",
        "2": "**Input** *clip* ← Load Checkpoint **CLIP** (yellow)\n\n**Output** CONDITIONING (orange) → KSampler *positive*",
        "3": "**Input** *clip* ← Load Checkpoint **CLIP** (yellow)\n\n**Output** CONDITIONING (orange) → KSampler *negative*",
        "4": "**No inputs** - it just makes the blank canvas.\n\n**Output** LATENT (pink) → KSampler *latent_image*",
        "5": "**Inputs:** *model* ← MODEL · *positive* ← Positive Prompt · *negative* ← Negative Prompt · *latent_image* ← Empty Latent\n\n**Output** LATENT (pink) → VAE Decode *samples*",
        "6": "**Inputs:** *samples* ← KSampler **LATENT** · *vae* ← Load Checkpoint **VAE** (red)\n\n**Output** IMAGE (blue) → Save Image",
        "7": "**Input** *images* ← VAE Decode **IMAGE** (blue)",
    },
    "notes": [
    ("intro", "01 · Exercise: Wire It Yourself", """All the nodes from tutorial 00 are here, but **every connection was removed**. Rebuild them!

**Rules:** drag from an **output dot** (right side) to an **input dot** (left side). Only matching types/colours connect. Dragging onto an already-connected input replaces the old link.

**Connections to make (9):**
1. Load Checkpoint **MODEL** → KSampler *model*
2. Load Checkpoint **CLIP** → Positive Prompt *clip*
3. Load Checkpoint **CLIP** → Negative Prompt *clip*
4. Positive Prompt **CONDITIONING** → KSampler *positive*
5. Negative Prompt **CONDITIONING** → KSampler *negative*
6. Empty Latent Image **LATENT** → KSampler *latent_image*
7. KSampler **LATENT** → VAE Decode *samples*
8. Load Checkpoint **VAE** → VAE Decode *vae*
9. VAE Decode **IMAGE** → Save Image *images*

(9 wires for 7 nodes: the CLIP output feeds both prompts.)

**Tip:** drag from an output and release on **empty canvas** → a search box opens showing only nodes that accept that type.

Run it. If a node turns red, read the error - it names the missing input. Solution: tutorial 00."""),
]})

# ---------------------------------------------------------------- 02
g = {
    "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
    "2": N("CLIPTextEncode", "Positive Prompt", text="portrait of a weary spaceship engineer in a cream spacesuit with orange bands, helmet off, grease on the face, dim red emergency light, detailed skin", clip=["1", 1]),
    "3": N("CLIPTextEncode", "Negative Prompt", text="blurry, lowres, cartoon", clip=["1", 1]),
    "4": N("EmptyLatentImage", "Empty Latent Image", width=832, height=1216, batch_size=1),
}
for i, (steps, cfg, title) in enumerate([(4, 5.0, "A: 4 steps, cfg 5"), (30, 5.0, "B: 30 steps, cfg 5"), (30, 12.0, "C: 30 steps, cfg 12")]):
    k, d, s = str(10 + i * 3), str(11 + i * 3), str(12 + i * 3)
    g[k] = N("KSampler", f"KSampler {title}", model=["1", 0], positive=["2", 0], negative=["3", 0], latent_image=["4", 0],
             seed=777, steps=steps, cfg=cfg, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0)
    g[d] = N("VAEDecode", f"VAE Decode {title[0]}", samples=[k, 0], vae=["1", 2])
    g[s] = N("SaveImage", f"Result {title}", images=[d, 0], filename_prefix=f"tut/02_{title[0]}")
T.append({"file": "02 - Settings Lab - Seed Steps CFG.json", "prompt": g, "notes": [
    ("intro", "02 · Settings Lab: seed, steps, CFG", f"""Three KSamplers share the **same** model, prompts and latent - only their settings differ, so you can compare side by side.

This also shows **fan-out**: one output (e.g. MODEL) can connect to many inputs.

All three use **seed 777** with *control after generate = fixed*... set it to **fixed** yourself if it says randomize, otherwise every run changes.

{HOWTO}"""),
    ("10", "A vs B vs C", """- **A (4 steps):** unfinished, noisy/mushy - too few steps.
- **B (30 steps, cfg 5):** the sweet spot for SDXL.
- **C (cfg 12):** over-cooked - harsh contrast, burnt colours. High CFG ≠ better.

**Try this:**
1. Change the **seed** on all three to the same new number - new composition, same differences.
2. Change A's **sampler_name** to `euler` and steps to 30 - compare with B.
3. Change **scheduler** `karras` ↔ `normal`.
4. Set a KSampler's **denoise** to 0.5 - what happens with an *empty* latent? (Answer: noisy mess - denoise < 1 only makes sense with an input image, tutorial 07.)"""),
]})

# ---------------------------------------------------------------- 03
g = zimage_loaders()
g.update({
    "5": N("CLIPTextEncode", "Prompt", text="The abandoned command deck of a survey spaceship holding above a storm planet. Wide windows show bright cloud tops. Worn off-white consoles with red hazard markings, scattered papers and a sleeping bag on the floor, flickering monitors, dust in the light. Cinematic photo", clip=["2", 0]),
    "6": N("ConditioningZeroOut", "Empty Negative (ZeroOut)", conditioning=["5", 0]),
    "7": N("EmptySD3LatentImage", "Empty Latent (SD3 type)", width=1216, height=832, batch_size=1),
    "8": N("KSampler", "KSampler (8 steps, cfg 1)", model=["4", 0], positive=["5", 0], negative=["6", 0], latent_image=["7", 0],
           seed=42, steps=8, cfg=1.0, sampler_name="res_multistep", scheduler="simple", denoise=1.0),
    "9": N("VAEDecode", "VAE Decode", samples=["8", 0], vae=["3", 0]),
    "10": N("SaveImage", "Save Image", images=["9", 0], filename_prefix="tut/03_zimage"),
})
T.append({"file": "03 - Z-Image Turbo - Separate Loaders.json", "prompt": g, "notes": [
    ("intro", "03 · Z-Image Turbo: separate loaders", f"""A modern, very fast photo model. Same pipeline idea as tutorial 00, but the model comes as **three separate files**, so there are three loaders instead of one checkpoint.

**Turbo / distilled** models are trained to finish in few steps: **8 steps, CFG 1**. With CFG 1 the negative prompt is ignored, so it's replaced by **ConditioningZeroOut**.

Z-Image understands long, natural sentences - describe the scene like you'd tell a photographer.

{HOWTO}"""),
    ("1", "Three loaders", """- **Load Diffusion Model** (UNETLoader) → MODEL. Files in `models\\diffusion_models`.
- **Load CLIP** → CLIP. The **type** must match the model family (here `lumina2`). Files in `models\\text_encoders`.
- **Load VAE** → VAE. Files in `models\\vae`.

**ModelSamplingAuraFlow** sits between loader and sampler: MODEL in → MODEL out. It adjusts the noise schedule (*shift*). Nodes that take a MODEL and output a MODEL are **model patches** - LoRAs work the same way (tutorial 06)."""),
    ("5", "Prompt + ZeroOut", """**ConditioningZeroOut:** CONDITIONING in → "empty" CONDITIONING out. A clean way to give the sampler a negative input it needs but won't use."""),
    ("8", "Try this", """1. Increase steps to 12 - little gain. Decrease to 4 - softer.
2. Set cfg to 3 - often worse: turbo models want cfg ≈ 1.
3. Rewrite the prompt with more detail: lens, time of day, mood, materials.
4. **EmptySD3LatentImage** vs EmptyLatentImage: newer models use a different latent format - use the one the template uses."""),
]})

# ---------------------------------------------------------------- 04
g = {
    "1": N("UNETLoader", "Load Diffusion Model", unet_name="flux-2-klein-4b.safetensors", weight_dtype="default"),
    "2": N("CLIPLoader", "Load CLIP (text encoder)", clip_name="qwen_3_4b.safetensors", type="flux2", device="default"),
    "3": N("VAELoader", "Load VAE", vae_name="flux2-vae.safetensors"),
    "4": N("CLIPTextEncode", "Prompt", text="A small boxy maintenance robot with off-white and orange panels and one glowing cyan eye sits on a cargo crate in a dark spaceship pod bay, cables hanging from the ceiling, flash photography, candid moment", clip=["2", 0]),
    "5": N("ConditioningZeroOut", "Empty Negative", conditioning=["4", 0]),
    "6": N("CFGGuider", "CFG Guider", model=["1", 0], positive=["4", 0], negative=["5", 0], cfg=1.0),
    "7": N("RandomNoise", "Random Noise (seed)", noise_seed=5),
    "8": N("KSamplerSelect", "Sampler Select", sampler_name="euler"),
    "9": N("Flux2Scheduler", "Scheduler (steps)", steps=4, width=1024, height=1024),
    "10": N("EmptyFlux2LatentImage", "Empty Latent (Flux2)", width=1024, height=1024, batch_size=1),
    "11": N("SamplerCustomAdvanced", "Sampler Custom Advanced", noise=["7", 0], guider=["6", 0], sampler=["8", 0], sigmas=["9", 0], latent_image=["10", 0]),
    "12": N("VAEDecode", "VAE Decode", samples=["11", 0], vae=["3", 0]),
    "13": N("SaveImage", "Save Image", images=["12", 0], filename_prefix="tut/04_klein"),
}
T.append({"file": "04 - Flux.2 Klein - The Sampler Taken Apart.json", "prompt": g, "notes": [
    ("intro", "04 · Flux.2 Klein: the KSampler taken apart", f"""**KSampler** hides five decisions in one box. **SamplerCustomAdvanced** takes them as five separate inputs, each from its own node:

| Input | Node | Type |
|---|---|---|
| noise | Random Noise | NOISE (the seed) |
| guider | CFG Guider | GUIDER (model + prompts + cfg) |
| sampler | Sampler Select | SAMPLER (euler, …) |
| sigmas | Scheduler | SIGMAS (the step schedule) |
| latent_image | Empty Latent | LATENT |

Same idea, more control - many new models' templates use this style.
Flux.2 Klein 4B (distilled) needs only **4 steps**. It's also the image **editor** in tutorial 13.

{HOWTO}"""),
    ("9", "Try this", """1. Change **steps** in the Scheduler: 2 vs 4 vs 8.
2. Change the **seed** in Random Noise.
3. Width/height appear **twice** (Scheduler and Empty Latent) - keep them equal! *Advanced:* right-click a node → convert a widget to an input, then feed both from one **Int** primitive node."""),
]})

# ---------------------------------------------------------------- 05 Krea style lab
g = krea_loaders()
g["4"] = N("PrimitiveStringMultiline", "Subject (shared text)", value="a rusty sci-fi weather station hanging on long cables inside grey storm clouds, a small landing platform with a crashed escape pod")
styles = [("A", "as a detailed pencil sketch on paper, cross-hatching, monochrome"),
          ("B", "as a vibrant 1980s retro anime still, cel shading, bold outlines"),
          ("C", "as a soft watercolor painting with bleeding pastel colors on textured paper"),
          ("D", "as a cinematic photograph at golden hour, 35mm film grain")]
g["9"] = N("EmptyLatentImage", "Empty Latent Image", width=1024, height=1024, batch_size=1)
for i, (tag, style) in enumerate(styles):
    b = 10 + i * 10
    g[str(b)] = N("StringConcatenate", f"Style {tag}", string_a=["4", 0], string_b=style, delimiter=", ")
    g[str(b + 1)] = N("CLIPTextEncode", f"Encode {tag}", text=[str(b), 0], clip=["2", 0])
    g[str(b + 2)] = N("ConditioningZeroOut", f"Negative {tag}", conditioning=[str(b + 1), 0])
    g[str(b + 3)] = N("KSampler", f"KSampler {tag}", model=["1", 0], positive=[str(b + 1), 0], negative=[str(b + 2), 0], latent_image=["9", 0],
                      seed=2024, steps=8, cfg=1.0, sampler_name="euler", scheduler="simple", denoise=1.0)
    g[str(b + 4)] = N("VAEDecode", f"Decode {tag}", samples=[str(b + 3), 0], vae=["3", 0])
    g[str(b + 5)] = N("SaveImage", f"Result {tag}", images=[str(b + 4), 0], filename_prefix=f"tut/05_style_{tag}")
T.append({"file": "05 - Krea-2 Style Lab.json", "prompt": g, "notes": [
    ("intro", "05 · Krea-2 Style Lab", f"""**Krea-2 Turbo** is great at art styles. This lab renders **one subject in four styles** at once.

New node types:
- **String Multiline** (primitive) - holds text, outputs STRING. Edit the subject **once**, all four branches update.
- **String Concatenate** - STRING + STRING → STRING (joined with the delimiter). `string_a` is **connected** (it became an input), `string_b` is typed in.
- **CLIP Text Encode** here has its *text* widget turned into an **input**, fed by the concatenated string.

Same seed in all four → differences come only from the style words.

{HOWTO}"""),
    ("10", "Try this", """1. Change the **Subject** text (e.g. *the frozen stasis bay of a survey ship, five cryo berths, four standing open*).
2. Edit style **B** to your own: *pixel art 16-bit game*, *ukiyo-e woodblock print*, *claymation*, *stained glass*, *low-poly 3D render*, *comic book ink with halftone dots*…
3. Change the seed on one KSampler only - composition changes, style stays.
4. **Wiring practice:** add a 5th branch: select the 6 nodes of branch D (Ctrl+click), **Ctrl+C**, **Ctrl+Shift+V** (paste *with* input connections), then edit its style text."""),
]})

# ---------------------------------------------------------------- 06 Krea LoRA
g = krea_loaders()
g["4"] = N("CLIPTextEncode", "Prompt", text="a curious maintenance robot with orange armor plates and glowing cyan eyes floating in zero gravity through a spaceship corridor, loose cables and papers drifting around it", clip=["2", 0])
g["5"] = N("ConditioningZeroOut", "Empty Negative", conditioning=["4", 0])
g["6"] = N("EmptyLatentImage", "Empty Latent Image", width=1024, height=1024, batch_size=1)
for i, strength in enumerate([0.0, 0.5, 0.8, 1.2]):
    b = 10 + i * 10
    g[str(b)] = N("LoraLoaderModelOnly", f"LoRA strength {strength}", model=["1", 0], lora_name="krea2_darkbrush.safetensors", strength_model=strength)
    g[str(b + 1)] = N("KSampler", f"KSampler (LoRA {strength})", model=[str(b), 0], positive=["4", 0], negative=["5", 0], latent_image=["6", 0],
                      seed=99, steps=8, cfg=1.0, sampler_name="euler", scheduler="simple", denoise=1.0)
    g[str(b + 2)] = N("VAEDecode", f"Decode {strength}", samples=[str(b + 1), 0], vae=["3", 0])
    g[str(b + 3)] = N("SaveImage", f"Result LoRA {strength}", images=[str(b + 2), 0], filename_prefix=f"tut/06_lora_{i}")
T.append({"file": "06 - Krea-2 LoRAs - Strength and Stacking.json", "prompt": g, "notes": [
    ("intro", "06 · LoRAs: strength & stacking", f"""A **LoRA** is a small add-on file that teaches a model a style, character or concept, without replacing the model.

**LoraLoaderModelOnly:** MODEL in → MODEL out (a *model patch*, like tutorial 03's shift node). It goes **between the loader and the KSampler**.
- **lora_name** - file from `models\\loras`
- **strength_model** - 0 = off, ~0.6-1.0 normal, >1.2 often breaks the image

Here the same prompt runs at strength **0 · 0.5 · 0.8 · 1.2** with the *darkbrush* ink style LoRA.

{HOWTO}"""),
    ("10", "More free Krea-2 LoRAs", """Official ones on Hugging Face **Comfy-Org/Krea-2 → loras** (≈450 MB each):
`softwatercolor` · `retroanime` · `neondrip` · `kidsdrawing` · `dotmatrix` · `vintagetarot` · `rainywindow` · `sunsetblur` (+ `darkbrush`, which you have).

**Get one:** open the Model Library (**m**) and search, or download from the website into the `models/loras` folder, then press **R** in ComfyUI to refresh the lists.

**Stacking:** chain two LoRA nodes: Loader → LoRA A → LoRA B → KSampler. Lower each strength (e.g. 0.6 + 0.5) so they don't fight.

**Tip:** many LoRAs have **trigger words** - check their page and add them to the prompt."""),
]})

# ---------------------------------------------------------------- 07 img2img
g = krea_loaders()
g.update({
    "5": N("LoadImage", "Load Image (Meridian corridor)", image="corridor_day.png"),
    "6": N("ImageScaleToTotalPixels", "Scale to ~1 MP", image=["5", 0], upscale_method="lanczos", megapixels=1.0, resolution_steps=16),
    "7": N("VAEEncode", "VAE Encode (pixels → latent)", pixels=["6", 0], vae=["3", 0]),
    "8": N("CLIPTextEncode", "Prompt (what it should become)", text="the same spaceship corridor at night, lights dead, only red emergency lamps glowing, deep black shadows, thin fog on the floor, horror atmosphere", clip=["2", 0]),
    "9": N("ConditioningZeroOut", "Empty Negative", conditioning=["8", 0]),
})
for i, dn in enumerate([0.4, 0.6, 0.8]):
    b = 20 + i * 10
    g[str(b)] = N("KSampler", f"KSampler denoise {dn}", model=["1", 0], positive=["8", 0], negative=["9", 0], latent_image=["7", 0],
                  seed=3, steps=8, cfg=1.0, sampler_name="euler", scheduler="simple", denoise=dn)
    g[str(b + 1)] = N("VAEDecode", f"Decode {dn}", samples=[str(b), 0], vae=["3", 0])
    g[str(b + 2)] = N("SaveImage", f"Result denoise {dn}", images=[str(b + 1), 0], filename_prefix=f"tut/07_img2img_{int(dn*10)}")
T.append({"file": "07 - Image to Image - Denoise.json", "prompt": g, "notes": [
    ("intro", "07 · Image to Image (denoise)", f"""Instead of starting from an empty latent, start from **your image**:

**Load Image** → IMAGE (+ MASK) · **VAE Encode**: IMAGE + VAE → LATENT (the reverse of VAE Decode) → KSampler *latent_image*.

**denoise** now matters: how much of the image is re-imagined.
- **0.4** - same room, lighting/mood shifts a little
- **0.6** - clearly night-time, same layout
- **0.8** - loose resemblance only

Handy for Meridian: make **night versions** of day rooms, or quick **variations** of a room.

{HOWTO}"""),
    ("5", "Load Image & Scale", """**Load Image:** click *choose file to upload* or drag an image onto the node. Files live in `ComfyUI-Shared\\input`.
**Scale to ~1 MP:** big phone photos are slow and models prefer ~1 megapixel. IMAGE in → IMAGE out."""),
    ("20", "Try this", """1. Load another room: `medbay_day.png`, `engineering_day.png`, `stasis_bay_day.png`…
2. Change the prompt: *overgrown with dark fungus*, *frozen, covered in frost*, *flooded, water on the floor*, *as a pencil storyboard sketch*.
3. Find the denoise where doors and consoles **move** - just below it is the most useful value for consistent game art.
4. Swap the model: copy the Z-Image loaders from tutorial 03 - it stays much more *photo* even at high denoise. Remember: the **same VAE** must be used for encode **and** decode, and it must match the model."""),
]})

# ---------------------------------------------------------------- 08 inpaint
g = {
    "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
    "2": N("LoadImage", "Load Image (mask painted in)", image="tut_medbay_masked.png"),
    "3": N("GrowMask", "Grow Mask (+ soft edge)", mask=["2", 1], expand=12, tapered_corners=True),
    "4": N("CLIPTextEncode", "Prompt (what goes in the mask)", text="a broken off-white maintenance robot with orange armor plates slumped on the floor against the wall, one arm torn off, sparking wires, sci-fi medbay", clip=["1", 1]),
    "5": N("CLIPTextEncode", "Negative", text="blurry, deformed, lowres", clip=["1", 1]),
    "6": N("InpaintModelConditioning", "Inpaint Model Conditioning", positive=["4", 0], negative=["5", 0], vae=["1", 2], pixels=["2", 0], mask=["3", 0], noise_mask=True),
    "7": N("KSampler", "KSampler", model=["1", 0], positive=["6", 0], negative=["6", 1], latent_image=["6", 2],
           seed=8, steps=30, cfg=5.0, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0),
    "8": N("VAEDecode", "VAE Decode", samples=["7", 0], vae=["1", 2]),
    "9": N("ImageCompositeMasked", "Paste into original (only masked area)", destination=["2", 0], source=["8", 0], x=0, y=0, resize_source=False, mask=["3", 0]),
    "10": N("SaveImage", "Save Image", images=["9", 0], filename_prefix="tut/08_inpaint"),
    "11": N("MaskPreview", "Mask Preview", mask=["3", 0]),
}
T.append({"file": "08 - Inpainting - Masks.json", "prompt": g, "notes": [
    ("intro", "08 · Inpainting: change only part of an image", f"""Paint a **mask** (white = change this) and only that area is regenerated.

The sample (your Meridian **medbay**) already has a mask on the empty floor right of the bed. **To paint your own:** right-click the Load Image node → **Open in MaskEditor**, paint over the area, **Save**. (The mask is stored in the image's transparency.)

Load Image has **two outputs**: IMAGE and **MASK**.

{HOWTO}"""),
    ("3", "Mask nodes", """- **Grow Mask:** MASK → bigger MASK. A little extra room blends the edges.
- **Mask Preview:** shows the mask as black/white - great for debugging."""),
    ("6", "Inpaint Model Conditioning", """Takes positive, negative, VAE, the image and the mask → outputs **three** things: positive, negative **and** LATENT. All three go into the KSampler.
**noise_mask = true** keeps sampling inside the mask."""),
    ("9", "Composite + Try this", """**ImageCompositeMasked** pastes the new pixels back into the original **only inside the mask**, so the rest stays 100% untouched.

**Try this:** change the prompt to *a knocked-over medical cart with spilled vials* / *a pool of dried blood and a torn crew patch*. Then load `medbay_day.png`, mask the **bed**, and make it *an open cryo pod leaking frost* - a quick way to make story variants of a room."""),
]})

# ---------------------------------------------------------------- 09 upscale
g = {
    "1": N("LoadImage", "Load Image (crew suit)", image="front.png"),
    "2": N("UpscaleModelLoader", "Load Upscale Model", model_name="4x-UltraSharp.safetensors"),
    "3": N("ImageUpscaleWithModel", "Upscale Image (using Model) ×4", upscale_model=["2", 0], image=["1", 0]),
    "4": N("ImageScaleBy", "Scale By 0.5 (→ ×2 total)", image=["3", 0], upscale_method="lanczos", scale_by=0.5),
    "5": N("SaveImage", "Save ×2 (model)", images=["4", 0], filename_prefix="tut/09_upscale_model"),
    "6": N("ImageScaleBy", "Plain resize ×2 (for comparison)", image=["1", 0], upscale_method="bicubic", scale_by=2.0),
    "7": N("SaveImage", "Save ×2 (plain)", images=["6", 0], filename_prefix="tut/09_upscale_plain"),
}
T.append({"file": "09 - Upscaling.json", "prompt": g, "notes": [
    ("intro", "09 · Upscaling", f"""Make images bigger **and sharper**.

- **Load Upscale Model** → UPSCALE_MODEL (files in `models\\upscale_models`; you have *4x-UltraSharp* and *RealESRGAN x4*).
- **Upscale Image (using Model):** UPSCALE_MODEL + IMAGE → IMAGE, always ×4 for these models.
- **Scale By 0.5** brings ×4 down to ×2 - often the nicer final size.

The bottom branch is a **plain** bicubic ×2 resize for comparison: zoom in on both - the model invents crisp detail, the plain one is just blurry.

{HOWTO}"""),
    ("2", "Try this", """1. Switch the model to **RealESRGAN_x4plus** - compare the suit's panel lines and the helmet visor.
2. Load one of your generated images (they're in the output folder; drag a file from Explorer onto Load Image).
3. **Advanced (hires fix):** after upscaling, VAE Encode → KSampler with **denoise 0.3** → VAE Decode. The model re-adds real detail at the higher resolution."""),
]})

# ---------------------------------------------------------------- 10 remove bg
g = {
    "1": N("LoadImage", "Load Image (crew suit)", image="front.png"),
    "2": N("LoadBackgroundRemovalModel", "Load Background Removal Model", bg_removal_name="birefnet.safetensors"),
    "3": N("RemoveBackground", "Remove Background → MASK", bg_removal_model=["2", 0], image=["1", 0]),
    "4": N("MaskPreview", "Mask Preview", mask=["3", 0]),
    "15": N("InvertMask", "Invert Mask", mask=["3", 0]),
    "5": N("JoinImageWithAlpha", "Join Image with Alpha (cut-out)", image=["1", 0], alpha=["15", 0]),
    "6": N("SaveImage", "Save cut-out PNG", images=["5", 0], filename_prefix="tut/10_cutout"),
    "7": N("EmptyImage", "New background (solid colour)", width=1024, height=1024, batch_size=1, color=1714253),
    "8": N("ImageCompositeMasked", "Put character on new background", destination=["7", 0], source=["1", 0], x=0, y=0, resize_source=False, mask=["3", 0]),
    "9": N("SaveImage", "Save on new background", images=["8", 0], filename_prefix="tut/10_newbg"),
}
T.append({"file": "10 - Remove Background.json", "prompt": g, "notes": [
    ("intro", "10 · Remove background (no diffusion!)", f"""Not every workflow generates images. This one uses **BiRefNet** to find the subject and returns a **MASK**.

Notice there is **no KSampler, no prompt** - ComfyUI is a general image pipeline.

{HOWTO}"""),
    ("3", "Mask → cut-out", """- **Remove Background:** model + IMAGE → **MASK** (white = subject).
- **Invert Mask:** MASK → MASK (white ↔ black).
- **Join Image with Alpha:** IMAGE + MASK → IMAGE with transparency. Save as PNG = cut-out.
- ⚠ Nodes disagree on what a mask means! *Join Image with Alpha* treats white as **transparent**, so the subject mask is **inverted** first - bypass Invert Mask (Ctrl+B) and watch the character vanish instead of the background. *ImageCompositeMasked* (below) uses white = **paste here**, so it takes the mask directly."""),
    ("7", "New background + Try this", """**Empty Image** makes a solid-colour IMAGE (click the colour to change it). **ImageCompositeMasked** pastes the character (source) onto it (destination) through the mask.

**Try this:** cut out `side.png` or the robot model sheet · replace Empty Image with a **Load Image** of a room (e.g. `stasis_bay_day.png` scaled to 1024×1024 with *Scale*), or with the command deck from tutorial 03 (connect its VAE Decode IMAGE). Great for sprites and UI portraits."""),
]})

# ---------------------------------------------------------------- 11 controlnet
g = {
    "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
    "2": N("LoadImage", "Load Image (pose ref: crew suit)", image="front.png"),
    "3": N("Canny", "Canny (edge detector)", image=["2", 0], low_threshold=0.2, high_threshold=0.5),
    "4": N("PreviewImage", "Preview edges", images=["3", 0]),
    "5": N("ControlNetLoader", "Load ControlNet Model", control_net_name="controlnet-union-sdxl-promax.safetensors"),
    "6": N("SetUnionControlNetType", "Set Union ControlNet Type", control_net=["5", 0], type="canny/lineart/anime_lineart/mlsd"),
    "7": N("CLIPTextEncode", "Positive Prompt", text="a tall humanoid security android with worn off-white armor plates, orange joints and glowing cyan eyes, standing with arms spread, plain grey studio background, sci-fi character concept art", clip=["1", 1]),
    "8": N("CLIPTextEncode", "Negative Prompt", text="blurry, lowres, deformed", clip=["1", 1]),
    "9": N("ControlNetApplyAdvanced", "Apply ControlNet", positive=["7", 0], negative=["8", 0], control_net=["6", 0], image=["3", 0],
           strength=0.7, start_percent=0.0, end_percent=0.8, vae=["1", 2]),
    "10": N("EmptyLatentImage", "Empty Latent Image", width=1024, height=1024, batch_size=1),
    "11": N("KSampler", "KSampler", model=["1", 0], positive=["9", 0], negative=["9", 1], latent_image=["10", 0],
            seed=21, steps=30, cfg=5.0, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0),
    "12": N("VAEDecode", "VAE Decode", samples=["11", 0], vae=["1", 2]),
    "13": N("SaveImage", "Save Image", images=["12", 0], filename_prefix="tut/11_controlnet"),
}
T.append({"file": "11 - ControlNet - Copy a Pose.json", "prompt": g, "notes": [
    ("intro", "11 · ControlNet: keep the pose, change everything else", f"""**ControlNet** forces the new image to follow the **structure** of a reference (edges, depth, pose) while the prompt decides the content.

Pipeline: reference → **preprocessor** (Canny edges) → **Apply ControlNet** modifies the prompts' CONDITIONING → KSampler.

{HOWTO}"""),
    ("3", "Preprocessor", """**Canny:** IMAGE → IMAGE of white edges. Check it in *Preview edges*.
Thresholds: lower = more edges (more detail copied), higher = only strong outlines."""),
    ("6", "ControlNet model + type", """**Load ControlNet Model** → CONTROL_NET. Your file is a **Union** model (one file, many control types), so **Set Union ControlNet Type** tells it which: here *canny*."""),
    ("9", "Apply ControlNet + Try this", """Inputs: positive + negative CONDITIONING, CONTROL_NET, the control IMAGE (+ VAE). Outputs: **modified** positive + negative → KSampler.
- **strength** 0.4-0.9 · **end_percent** < 1 lets the model finish details freely.

**Try this:** strength 0.3 vs 1.0 · prompt *a hazmat-suited station worker* / *a crew member overgrown with dark fungus* · use `side.png` as reference, or a room like `corridor_day.png` (Empty Latent 1344×768) to keep a room's layout but redesign it. This is how you keep character poses consistent across game art."""),
]})

# ---------------------------------------------------------------- 12 IPAdapter style
g = {
    "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
    "2": N("LoadImage", "Style reference image (Meridian stasis bay)", image="stasis_bay_day.png"),
    "3": N("IPAdapterModelLoader", "Load IPAdapter Model", ipadapter_file="ip-adapter-plus_sdxl_vit-h.safetensors"),
    "4": N("CLIPVisionLoader", "Load CLIP Vision", clip_name="CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"),
    "5": N("IPAdapterAdvanced", "IPAdapter (style transfer)", model=["1", 0], ipadapter=["3", 0], image=["2", 0], weight=1.0,
           weight_type="style transfer", combine_embeds="concat", start_at=0.0, end_at=1.0, embeds_scaling="V only", clip_vision=["4", 0]),
    "6": N("CLIPTextEncode", "Positive Prompt (the content)", text="interior of a spaceship hydroponics garden room, rows of grow tanks with dead withered plants, a workbench, a hatch door", clip=["1", 1]),
    "7": N("CLIPTextEncode", "Negative Prompt", text="blurry, lowres, text, watermark", clip=["1", 1]),
    "8": N("EmptyLatentImage", "Empty Latent Image", width=1216, height=832, batch_size=1),
    "9": N("KSampler", "KSampler (with style)", model=["5", 0], positive=["6", 0], negative=["7", 0], latent_image=["8", 0],
           seed=64, steps=30, cfg=5.0, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0),
    "10": N("VAEDecode", "VAE Decode", samples=["9", 0], vae=["1", 2]),
    "11": N("SaveImage", "Save (styled)", images=["10", 0], filename_prefix="tut/12_style"),
    "12": N("KSampler", "KSampler (no style, for comparison)", model=["1", 0], positive=["6", 0], negative=["7", 0], latent_image=["8", 0],
            seed=64, steps=30, cfg=5.0, sampler_name="dpmpp_2m_sde", scheduler="karras", denoise=1.0),
    "13": N("VAEDecode", "VAE Decode (no style)", samples=["12", 0], vae=["1", 2]),
    "14": N("SaveImage", "Save (no style)", images=["13", 0], filename_prefix="tut/12_nostyle"),
}
T.append({"file": "12 - Style Transfer from a Reference Image.json", "prompt": g, "notes": [
    ("intro", "12 · Style transfer from a reference image (IPAdapter)", f"""Describe the **content** with words, show the **style** with a picture.

**IPAdapter** is a model patch (MODEL in → MODEL out) that also looks at an image: it "reads" the reference with **CLIP Vision** and injects that look into the model.

The lower branch uses the **un-patched** MODEL for a side-by-side comparison - same seed, same prompt.

{HOWTO}"""),
    ("3", "Loaders", """- **Load IPAdapter Model** → IPADAPTER (`models\\ipadapter`)
- **Load CLIP Vision** → CLIP_VISION (`models\\clip_vision`) - an *image* encoder, the picture equivalent of CLIP.
Both must match: *vit-h* IPAdapter ↔ *ViT-H* CLIP Vision."""),
    ("5", "IPAdapter settings + Try this", """- **weight** - style strength (0.6-1.2)
- **weight_type** - *style transfer* copies look only; *linear* copies content too; *composition* copies layout.

**Try this:**
1. weight 0.5 vs 1.2.
2. weight_type → *linear* - notice cryo berths (the reference's **content**) start appearing.
3. Invent the rooms Meridian doesn't have yet: *galley with a long steel table*, *cargo hold with strapped crates*, *observation dome*. Every result keeps the worn off-white + red-marking look.
4. Swap the reference to `landing_platform_day.png` or `fuel_depot_day.png` for the station's look."""),
]})

# ---------------------------------------------------------------- 13 Klein edit
g = {
    "1": N("UNETLoader", "Load Diffusion Model", unet_name="flux-2-klein-4b.safetensors", weight_dtype="default"),
    "2": N("CLIPLoader", "Load CLIP (text encoder)", clip_name="qwen_3_4b.safetensors", type="flux2", device="default"),
    "3": N("VAELoader", "Load VAE", vae_name="flux2-vae.safetensors"),
    "4": N("LoadImage", "Image 1 (to edit: corridor)", image="corridor_day.png"),
    "5": N("LoadImage", "Image 2 (reference: robot)", image="robot_sheet.png"),
    "6": N("ImageScaleToTotalPixels", "Scale image 1", image=["4", 0], upscale_method="lanczos", megapixels=1.0, resolution_steps=16),
    "7": N("ImageScaleToTotalPixels", "Scale image 2", image=["5", 0], upscale_method="lanczos", megapixels=1.0, resolution_steps=16),
    "8": N("GetImageSize", "Get Image Size (output = image 1 size)", image=["6", 0]),
    "9": N("CLIPTextEncode", "Edit Instruction", text="Place the orange and off-white robot from image 2 standing in the middle of the corridor in image 1, facing the camera, lit by the corridor's lights, casting a shadow on the floor. Keep the corridor exactly the same.", clip=["2", 0]),
    "10": N("ConditioningZeroOut", "Empty Negative", conditioning=["9", 0]),
    "11": N("VAEEncode", "Encode image 1", pixels=["6", 0], vae=["3", 0]),
    "12": N("VAEEncode", "Encode image 2", pixels=["7", 0], vae=["3", 0]),
    "13": N("ReferenceLatent", "Reference: image 1 → positive", conditioning=["9", 0], latent=["11", 0]),
    "14": N("ReferenceLatent", "Reference: image 2 → positive", conditioning=["13", 0], latent=["12", 0]),
    "15": N("ReferenceLatent", "Reference: image 1 → negative", conditioning=["10", 0], latent=["11", 0]),
    "16": N("ReferenceLatent", "Reference: image 2 → negative", conditioning=["15", 0], latent=["12", 0]),
    "17": N("CFGGuider", "CFG Guider", model=["1", 0], positive=["14", 0], negative=["16", 0], cfg=1.0),
    "18": N("RandomNoise", "Random Noise (seed)", noise_seed=11),
    "19": N("KSamplerSelect", "Sampler Select", sampler_name="euler"),
    "20": N("Flux2Scheduler", "Scheduler", steps=4, width=["8", 0], height=["8", 1]),
    "21": N("EmptyFlux2LatentImage", "Empty Latent", width=["8", 0], height=["8", 1], batch_size=1),
    "22": N("SamplerCustomAdvanced", "Sampler Custom Advanced", noise=["18", 0], guider=["17", 0], sampler=["19", 0], sigmas=["20", 0], latent_image=["21", 0]),
    "23": N("VAEDecode", "VAE Decode", samples=["22", 0], vae=["3", 0]),
    "24": N("SaveImage", "Save Image", images=["23", 0], filename_prefix="tut/13_edit"),
}
T.append({"file": "13 - Image Editing with Flux.2 Klein.json", "prompt": g, "notes": [
    ("intro", "13 · Image editing with words (Flux.2 Klein)", f"""The most modern approach: give the model **images + an instruction** - no masks, no ControlNet.

Here: place **your robot** (image 2, the model sheet) into **your Meridian corridor** (image 1).

Builds on tutorial 04 (the sampler taken apart) plus:
- **ReferenceLatent:** CONDITIONING + LATENT → CONDITIONING. Attaches an image to the prompt. **Chain** them to add several images (image 1, then image 2). Positive and negative both get the same references.
- **GetImageSize:** IMAGE → width, height (INT outputs!) - connected into the Scheduler and Empty Latent so the result has image 1's size. Numbers can be wires too.

{HOWTO}"""),
    ("9", "Writing instructions", """- Refer to inputs as **image 1**, **image 2**.
- Say what to change **and what to keep**.
- Don't name things you *don't* want changed in detail - the model may change them anyway.

**Try this:**
1. Single-image edit: delete the image-2 ReferenceLatent nodes (connect 13 → guider directly) and write *make it night, only red emergency lights*.
2. Image 2 = `front.png` (crew suit): *the crew member from image 2 lies unconscious on the corridor floor*.
3. Image 1 = `landing_platform_day.png`: *add a second crashed escape pod on the platform*.
4. *Cover the walls of image 1 with dark organic growth, like it spread from a floor duct.*"""),
]})

# ---------------------------------------------------------------- 14 / 15 sampler shootouts
SHOOT_PROMPT = ("close-up of a maintenance robot's head with scratched off-white and orange armor plates, one glowing cyan eye, "
                "exposed cables, standing in a dim spaceship workshop, sparks in the background, detailed sci-fi photo")

SDXL_COMBOS = [("A", "dpmpp_2m", "karras"), ("B", "dpmpp_2m_sde", "karras"), ("C", "euler", "normal"),
               ("D", "euler_ancestral", "normal"), ("E", "dpmpp_3m_sde", "exponential"), ("F", "uni_pc", "beta"),
               ("G", "lcm", "sgm_uniform")]
g = {
    "1": N("CheckpointLoaderSimple", "Load Checkpoint", ckpt_name=JUGG),
    "2": N("CLIPTextEncode", "Positive Prompt", text=SHOOT_PROMPT, clip=["1", 1]),
    "3": N("CLIPTextEncode", "Negative Prompt", text="blurry, lowres, watermark, text", clip=["1", 1]),
    "4": N("EmptyLatentImage", "Empty Latent Image", width=1024, height=1024, batch_size=1),
}
for i, (tag, s, sch) in enumerate(SDXL_COMBOS):
    b = 10 + i * 3
    g[str(b)] = N("KSampler", f"{tag}: {s} + {sch}", model=["1", 0], positive=["2", 0], negative=["3", 0], latent_image=["4", 0],
                  seed=4242, steps=30, cfg=5.0, sampler_name=s, scheduler=sch, denoise=1.0)
    g[str(b + 1)] = N("VAEDecode", f"Decode {tag}", samples=[str(b), 0], vae=["1", 2])
    g[str(b + 2)] = N("SaveImage", f"{tag}: {s} + {sch}", images=[str(b + 1), 0], filename_prefix=f"tut/14_{tag}_{s}_{sch}")
T.append({"file": "14 - Sampler Shootout - SDXL.json", "prompt": g, "notes": [
    ("intro", "14 · Sampler Shootout: SDXL (Juggernaut)", f"""**Same model, prompt, seed (4242), 30 steps, CFG 5** - only the **sampler + scheduler** change. Seven KSamplers A-G, stacked in one column; results in the Save nodes on the right (and in `output\\tut\\14_…`).

Pairs tested:
- **A** dpmpp_2m + karras - *the recommended default*
- **B** dpmpp_2m_sde + karras
- **C** euler + normal
- **D** euler_ancestral + normal
- **E** dpmpp_3m_sde + exponential
- **F** uni_pc + beta
- **G** lcm + sgm_uniform - *deliberately the wrong kind for this model*

Run once (≈1 min), then read the green box below.

{HOWTO}"""),
    ("10", "What the results show", """**1. A, C and F look almost identical.** These samplers *converge*: given enough steps they all reach the same image. Pick between them for speed/sharpness, not for a different picture.

**2. B, D and E each give a *different* robot.** *_sde* and *_ancestral* samplers inject fresh noise every step, so the same seed takes a different path:
- **B / E (sde):** crisper micro-detail and texture, new lighting ideas (orange eye glow).
- **D (euler_ancestral):** smoother, softer, more "painterly" variations.
Great for exploring ideas; less great when you need to reproduce an image exactly.

**3. G (lcm) doesn't explode - it quietly degrades.** The grime, scratches and workshop disappear; it becomes a clean plastic 3D render. LCM is meant for LCM-distilled models at ~4-8 steps. A wrong sampler often just looks *worse*, not *broken* - compare against the recommended pair to notice.

### How to choose for SDXL checkpoints
1. Start with the model page's recommendation (Juggernaut: **dpmpp_2m + karras**, 30-40 steps, CFG 3-7).
2. Want more texture → **dpmpp_2m_sde + karras**. Want variations → **euler_ancestral**.
3. Keep the one whose "look" you like and **stay with it** for a whole project - consistency matters more than the "best" sampler.

**Try this:** change the steps on all seven to **15** (half the time): each robot keeps its composition, only small details (eye glow, panel lines) change - SDXL is forgiving, so 15-20 steps is fine for quick drafts, 30+ for finals. Then change the seed and see whether you still prefer the same pair."""),
]})

KREA_COMBOS = [("A", "euler", "simple"), ("B", "res_multistep", "simple"), ("C", "euler_ancestral", "simple"),
               ("D", "dpmpp_2m", "karras"), ("E", "dpmpp_2m_sde", "karras")]
g = krea_loaders()
g["4"] = N("CLIPTextEncode", "Prompt", text=SHOOT_PROMPT, clip=["2", 0])
g["5"] = N("ConditioningZeroOut", "Empty Negative", conditioning=["4", 0])
g["6"] = N("EmptyLatentImage", "Empty Latent Image", width=1024, height=1024, batch_size=1)
for i, (tag, s, sch) in enumerate(KREA_COMBOS):
    b = 10 + i * 3
    g[str(b)] = N("KSampler", f"{tag}: {s} + {sch}", model=["1", 0], positive=["4", 0], negative=["5", 0], latent_image=["6", 0],
                  seed=4242, steps=8, cfg=1.0, sampler_name=s, scheduler=sch, denoise=1.0)
    g[str(b + 1)] = N("VAEDecode", f"Decode {tag}", samples=[str(b), 0], vae=["3", 0])
    g[str(b + 2)] = N("SaveImage", f"{tag}: {s} + {sch}", images=[str(b + 1), 0], filename_prefix=f"tut/15_{tag}_{s}_{sch}")
T.append({"file": "15 - Sampler Shootout - Krea-2 Turbo.json", "prompt": g, "notes": [
    ("intro", "15 · Sampler Shootout: Krea-2 Turbo", f"""Same robot prompt and seed as tutorial 14, but on a **turbo / flow model**: **8 steps, CFG 1**.

Pairs tested:
- **A** euler + simple - *the official template setting*
- **B** res_multistep + simple
- **C** euler_ancestral + simple
- **D** dpmpp_2m + karras
- **E** dpmpp_2m_sde + karras

Compare with tutorial 14: there, every pair worked. Here…

{HOWTO}"""),
    ("10", "What the results show", """**A, B, C (scheduler = simple) all look great** and nearly the same - sharp panels, cables, sparks. B is a touch crisper, C varies small details (it adds noise each step).

**D and E (scheduler = karras) collapse:** dark, blurry, smeared, the workshop gone. That is the signature of a **turbo model on the wrong schedule**. Turbo/distilled models are trained on *one* specific noise schedule over very few steps; *karras* spends the steps differently, so the model never gets the steps it was trained on.

### Rule of thumb for modern models (Krea-2, Z-Image, Flux, Qwen…)
- **Scheduler matters more than sampler.** Keep the template's scheduler (usually **simple**) - then euler / res_multistep / euler_ancestral are all fine.
- Keep the template's **steps and CFG** (here 8 and 1). More steps rarely help; higher CFG burns the image.
- When an image from a new model looks dark/muddy/smeared, **check the scheduler first**.

### The general recipe for *any* model
1. **Open its official template** (Templates → filter by model) and copy sampler, scheduler, steps, CFG.
2. Otherwise read the **model page** (Hugging Face / Civitai "recommended settings").
3. Then run a small shootout like this one with a **fixed seed**, and keep what you like.

**Try this:** set D's scheduler to **simple** - it recovers. Then set A's steps to 4 and 16 to see how little the step count matters for a turbo model."""),
]})

if __name__ == "__main__":
    out = sys.argv[1]
    json.dump(T, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(T), "tutorials written")

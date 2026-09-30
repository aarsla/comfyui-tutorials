// Glossary terms. `short` is the popover text (one or two sentences); `more` adds detail on the
// glossary page. `match` lists the words that get linked in lesson notes (first mention per note).
// `classes` ties the term to node classes, which gives its "used in" lessons.

export interface Term {
  id: string;
  term: string;
  group: 'Graph' | 'Models' | 'Generating' | 'Images and masks' | 'Control';
  short: string;
  more?: string;
  match?: string[];
  classes?: string[];
}

export const TERMS: Term[] = [
  // the graph
  { id: 'node', term: 'Node', group: 'Graph', short: 'One box in a ComfyUI graph that does one job. Inputs are on the left, editable widgets inside, outputs on the right.', },
  { id: 'widget', term: 'Widget', group: 'Graph', short: 'An editable value inside a node, such as a seed, a prompt or a file name.', more: 'Right-click a node to turn a widget into an input, so a wire sets the value instead. Tutorial 05 does this with the prompt text, tutorial 13 with width and height.', match: ['widget', 'widgets'] },
  { id: 'wire', term: 'Wire (link)', group: 'Graph', short: 'Connects an output to an input of the same data type. Its colour shows the type.', more: 'One output can feed many inputs, but each input takes one wire. Dropping a new wire on a connected input replaces the old one.', },
  { id: 'workflow', term: 'Workflow', group: 'Graph', short: 'A saved graph of nodes and wires, stored as a .json file. Drag one onto the ComfyUI canvas to open it.', },
  { id: 'reroute', term: 'Reroute', group: 'Graph', short: 'A dot on a wire that lets you bend it around nodes. It does not change the data.', match: ['reroute', 'reroutes'] },
  { id: 'frame', term: 'Frame (group)', group: 'Graph', short: 'A coloured box around nodes that labels a stage of the graph. Select nodes and press Ctrl+G to make one.', match: ['frame', 'frames'] },
  { id: 'bypass', term: 'Bypass', group: 'Graph', short: 'Ctrl+B makes a node pass its input straight through, as if it were not there. Useful for before and after comparisons.', match: ['bypass', 'bypasses'] },

  // models
  { id: 'checkpoint', term: 'Checkpoint', group: 'Models', short: 'One file that bundles a diffusion model, its text encoder and its VAE. SDXL models usually ship this way.', more: 'Newer models ship as separate files, loaded by three loader nodes. Either way, the three parts are a matched set.', match: ['checkpoint', 'checkpoints'], classes: ['CheckpointLoaderSimple'] },
  { id: 'model', term: 'Diffusion model', group: 'Models', short: 'The network that turns noise into an image, one step at a time. Its wire type is MODEL.', match: ['diffusion model'], classes: ['UNETLoader', 'CheckpointLoaderSimple'] },
  { id: 'text-encoder', term: 'Text encoder (CLIP)', group: 'Models', short: 'Turns prompt text into numbers the model understands. It must belong to the same model family as the model.', more: 'ComfyUI calls every text encoder CLIP, even when it is a different network such as Qwen. The CLIPLoader type (lumina2, krea2, flux2) has to match the model.', match: ['text encoder', 'CLIP'], classes: ['CLIPLoader', 'CLIPTextEncode'] },
  { id: 'vae', term: 'VAE', group: 'Models', short: 'Converts between pixels and latents. VAE Encode compresses an image into a latent; VAE Decode turns a latent back into pixels.', more: 'Each model family has its own VAE. Model, text encoder and VAE are a matched set: never swap one without the others.', match: ['VAE'], classes: ['VAELoader', 'VAEDecode', 'VAEEncode'] },
  { id: 'lora', term: 'LoRA', group: 'Models', short: 'A small add-on file that changes a model\'s style or teaches it a subject. It is applied at a strength; 0 does nothing.', match: ['LoRA', 'LoRAs'], classes: ['LoraLoaderModelOnly'] },
  { id: 'turbo', term: 'Turbo (distilled) model', group: 'Models', short: 'A model trained to make an image in very few steps (4 to 8) at CFG 1.', more: 'Turbo models are tuned for one scheduler, usually simple. Other schedulers such as karras make them collapse into dark, smeared images (tutorial 15).', match: ['turbo', 'Turbo', 'distilled'] },
  { id: 'shift', term: 'Shift', group: 'Models', short: 'For flow models such as Z-Image, moves where the sampler spends its steps. Set by a Model Sampling node.', match: ['shift'], classes: ['ModelSamplingAuraFlow'] },

  // generating
  { id: 'latent', term: 'Latent', group: 'Generating', short: 'The compressed form of an image that the model works on. It is much smaller than the pixel image and has to be decoded by a VAE.', match: ['latent', 'latents'], classes: ['EmptyLatentImage', 'EmptySD3LatentImage', 'EmptyFlux2LatentImage'] },
  { id: 'conditioning', term: 'Conditioning', group: 'Generating', short: 'An encoded prompt, plus anything attached to it such as a ControlNet hint or a reference image. It steers the sampler.', match: ['conditioning'], classes: ['CLIPTextEncode', 'ConditioningZeroOut'] },
  { id: 'prompt', term: 'Positive and negative prompt', group: 'Generating', short: 'The positive prompt says what you want, the negative what to avoid. Models run at CFG 1 ignore the negative.', match: ['negative prompt', 'positive prompt'] },
  { id: 'seed', term: 'Seed', group: 'Generating', short: 'The number that makes the starting noise. The same seed with the same settings gives the same image.', more: '"control after generate" decides whether the seed changes after each run. Set it to fixed to compare settings.', match: ['seed'], classes: ['RandomNoise'] },
  { id: 'steps', term: 'Steps', group: 'Generating', short: 'How many denoising steps the sampler takes. SDXL uses about 25 to 35, turbo models 4 to 8.', match: ['steps'] },
  { id: 'cfg', term: 'CFG', group: 'Generating', short: 'How strongly each step follows the prompt instead of the negative. SDXL uses about 4 to 7; turbo and distilled models use 1.', more: 'Too high burns the image: harsh contrast and oversaturated colours (tutorial 02).', match: ['CFG'], classes: ['CFGGuider'] },
  { id: 'sampler', term: 'Sampler', group: 'Generating', short: 'The algorithm that takes each denoising step, such as euler or dpmpp_2m.', more: 'Names with _ancestral or _sde add fresh noise each step, so more steps give a different image rather than a refined one.', match: ['sampler', 'samplers'], classes: ['KSampler', 'KSamplerSelect', 'SamplerCustomAdvanced'] },
  { id: 'scheduler', term: 'Scheduler', group: 'Generating', short: 'Decides how big each step is, how the noise is spread over the steps. Turbo models need the one they were trained with, usually simple.', match: ['scheduler', 'schedulers'], classes: ['Flux2Scheduler'] },
  { id: 'sigmas', term: 'Sigmas', group: 'Generating', short: 'The list of noise levels, one per step, made by a scheduler. SamplerCustomAdvanced takes them as an input.', match: ['sigmas'], classes: ['Flux2Scheduler'] },
  { id: 'guider', term: 'Guider', group: 'Generating', short: 'Bundles model, prompts and CFG into one input for SamplerCustomAdvanced.', match: ['guider'], classes: ['CFGGuider'] },
  { id: 'denoise', term: 'Denoise', group: 'Generating', short: 'How much of the starting image is replaced. 1.0 starts from pure noise; lower values keep more of an input image.', match: ['denoise'] },
  { id: 'batch-size', term: 'Batch size', group: 'Generating', short: 'How many images one run makes.', match: ['batch_size', 'batch size'] },
  { id: 'megapixel', term: 'Megapixel', group: 'Generating', short: 'One million pixels. SDXL and most newer models work best at about one megapixel, such as 1024 × 1024.', match: ['megapixel', 'megapixels'], classes: ['ImageScaleToTotalPixels'] },

  // images and masks
  { id: 'image', term: 'Image', group: 'Images and masks', short: 'Normal pixels you can see and save. Its wire type is IMAGE.', classes: ['LoadImage', 'SaveImage', 'PreviewImage'] },
  { id: 'img2img', term: 'Image to image', group: 'Images and masks', short: 'Start from an encoded image instead of blank noise. Denoise sets how much of it changes.', match: ['img2img', 'image to image'], classes: ['VAEEncode'] },
  { id: 'mask', term: 'Mask', group: 'Images and masks', short: 'A black and white image that selects an area. In most nodes white means "this part".', more: 'Nodes disagree: Join Image with Alpha treats white as transparent, so tutorial 10 inverts the mask first.', match: ['mask', 'masks'], classes: ['GrowMask', 'InvertMask', 'MaskPreview', 'RemoveBackground'] },
  { id: 'inpainting', term: 'Inpainting', group: 'Images and masks', short: 'Regenerating only the masked part of an image and keeping the rest.', match: ['inpainting', 'inpaint'], classes: ['InpaintModelConditioning'] },
  { id: 'upscaling', term: 'Upscaling', group: 'Images and masks', short: 'Making an image larger. An upscale model adds detail; a plain resize only enlarges the pixels.', match: ['upscaling', 'upscale', 'upscaler'], classes: ['UpscaleModelLoader', 'ImageUpscaleWithModel', 'ImageScaleBy'] },

  // control
  { id: 'controlnet', term: 'ControlNet', group: 'Control', short: 'An add-on model that makes the image follow the structure of a hint image, such as edges, depth or a pose.', match: ['ControlNet'], classes: ['ControlNetLoader', 'SetUnionControlNetType', 'ControlNetApplyAdvanced'] },
  { id: 'canny', term: 'Canny', group: 'Control', short: 'An edge detector. Its outline image is a common ControlNet hint.', match: ['Canny'], classes: ['Canny'] },
  { id: 'ipadapter', term: 'IP-Adapter', group: 'Control', short: 'Lets a reference image steer the look of the result, such as colours, lighting and style, alongside the prompt.', match: ['IP-Adapter', 'IPAdapter'], classes: ['IPAdapterModelLoader', 'IPAdapterAdvanced'] },
  { id: 'clip-vision', term: 'CLIP Vision', group: 'Control', short: 'An image encoder. IP-Adapter uses it to read the reference image.', match: ['CLIP Vision', 'CLIP vision'], classes: ['CLIPVisionLoader'] },
  { id: 'reference-latent', term: 'Reference latent', group: 'Control', short: 'Attaches an encoded image to the prompt, so Flux.2 Klein can edit it or copy from it.', match: ['ReferenceLatent', 'reference latent'], classes: ['ReferenceLatent'] },
];

export const TERM_BY_ID = Object.fromEntries(TERMS.map((t) => [t.id, t]));

// Wire data types that have a glossary entry.
export const TYPE_TERM: Record<string, string> = {
  MODEL: 'model', CLIP: 'text-encoder', VAE: 'vae', CONDITIONING: 'conditioning', LATENT: 'latent', IMAGE: 'image',
  MASK: 'mask', SIGMAS: 'sigmas', GUIDER: 'guider', NOISE: 'seed', SAMPLER: 'sampler', CONTROL_NET: 'controlnet',
  CLIP_VISION: 'clip-vision', IPADAPTER: 'ipadapter', UPSCALE_MODEL: 'upscaling',
};

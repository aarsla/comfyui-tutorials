import models from './models.json';

// Site-only metadata that tutorials.py does not carry: course modules, short titles,
// result images, and per-node-class output types and descriptions.

export const MODULES = [
  { id: 'foundations', deck: 1, name: 'Foundations', blurb: 'The seven-node graph every other lesson builds on.' },
  { id: 'models', deck: 2, name: 'Newer models', blurb: 'Model, text encoder and VAE come as separate files from here on.' },
  { id: 'images', deck: 3, name: 'From an image', blurb: 'Start from a picture instead of pure noise.' },
  { id: 'control', deck: 4, name: 'Control and editing', blurb: 'Steer pose, style and content with reference images.' },
  { id: 'labs', deck: 5, name: 'Labs', blurb: 'Side-by-side comparisons of sampler settings.' },
] as const;

export type ModuleId = (typeof MODULES)[number]['id'];

export interface LessonMeta {
  module: ModuleId;
  title: string;
  short: string;
  desc: string;
  model: string;
  results: { src: string; caption: string }[];
}

// Keyed by the two-digit number at the start of each tutorial file name.
export const LESSONS: Record<string, LessonMeta> = {
  '00': { module: 'foundations', title: 'Start here: node basics', short: 'Node basics', desc: 'The smallest complete text-to-image graph, node by node.', model: 'SDXL', results: [{ src: 't00.jpg', caption: 'Survey ship above the cloud layer' }] },
  '01': { module: 'foundations', title: 'Exercise: wire it yourself', short: 'Wire it', desc: 'The same graph with every wire removed. Reconnect it.', model: 'SDXL', results: [{ src: 't01.jpg', caption: 'Maintenance robot, once wired' }] },
  '02': { module: 'foundations', title: 'Settings lab: seed, steps, CFG', short: 'Settings', desc: 'Three samplers, one prompt, different settings side by side.', model: 'SDXL', results: [{ src: 't02.jpg', caption: 'Engineer portrait' }] },
  '03': { module: 'models', title: 'Z-Image Turbo, separate loaders', short: 'Z-Image', desc: 'Three loader nodes instead of one checkpoint.', model: 'Z-Image', results: [{ src: 't03.jpg', caption: 'Cockpit' }] },
  '04': { module: 'models', title: 'Flux.2 Klein, the sampler taken apart', short: 'Klein', desc: 'Noise, guider, sampler and sigmas as separate nodes.', model: 'Klein 4B', results: [{ src: 't04.jpg', caption: 'Maintenance robot in the pod bay' }] },
  '05': { module: 'models', title: 'Krea-2 style lab', short: 'Styles', desc: 'One subject, four styles, one seed.', model: 'Krea-2', results: [{ src: 't05a.jpg', caption: 'Style A: pencil sketch' }, { src: 't05b.jpg', caption: 'Style B: retro anime' }, { src: 't05c.jpg', caption: 'Style C: watercolor' }] },
  '06': { module: 'models', title: 'Krea-2 LoRAs: strength and stacking', short: 'LoRAs', desc: 'The same LoRA at four strengths.', model: 'Krea-2', results: [{ src: 't06.jpg', caption: 'LoRA strength 0.8' }] },
  '07': { module: 'images', title: 'Image to image: denoise', short: 'Img2img', desc: 'Denoise sets how much of the input image changes.', model: 'Krea-2', results: [{ src: 't07.jpg', caption: 'Corridor at night' }] },
  '08': { module: 'images', title: 'Inpainting with masks', short: 'Inpaint', desc: 'Repaint only the masked area.', model: 'SDXL', results: [{ src: 't08.jpg', caption: 'Inpainting result' }] },
  '09': { module: 'images', title: 'Upscaling', short: 'Upscale', desc: 'Model upscalers compared with plain resizing.', model: 'Upscalers', results: [{ src: 't09.jpg', caption: 'Left: plain resize. Right: 4x-UltraSharp' }] },
  '10': { module: 'images', title: 'Remove background', short: 'Remove BG', desc: 'Cut the subject out with BiRefNet.', model: 'BiRefNet', results: [{ src: 't10.jpg', caption: 'Crew suit on a new background' }] },
  '11': { module: 'control', title: 'ControlNet: copy a pose', short: 'ControlNet', desc: 'Take the pose from the crew suit sheet.', model: 'SDXL', results: [{ src: 't11.jpg', caption: 'Result in the crew suit pose' }] },
  '12': { module: 'control', title: 'Style transfer from a reference image', short: 'Style ref', desc: 'IP-Adapter borrows the look of an image.', model: 'SDXL', results: [{ src: 't12.jpg', caption: 'Style transfer result' }] },
  '13': { module: 'control', title: 'Image editing with Flux.2 Klein', short: 'Klein edit', desc: 'Edit an image with a text instruction.', model: 'Klein 4B', results: [{ src: 't13.jpg', caption: 'Edited corridor' }] },
  '14': { module: 'labs', title: 'Sampler shootout: SDXL', short: 'SDXL lab', desc: 'Every sampler on one seed.', model: 'SDXL', results: [{ src: 't14.jpg', caption: 'One of the shootout results' }] },
  '15': { module: 'labs', title: 'Sampler shootout: Krea-2 Turbo', short: 'Krea lab', desc: 'What works on a turbo model, and what collapses.', model: 'Krea-2', results: [{ src: 't15.jpg', caption: 'One of the shootout results' }] },
};

// Wire colours by data type (the same hues ComfyUI uses).
export const TYPE_COLOR: Record<string, string> = {
  MODEL: '#9C84D4', CLIP: '#E0B400', VAE: '#E05555', CONDITIONING: '#F08A2E', LATENT: '#E07AD8',
  IMAGE: '#4A9BE0', MASK: '#5BAE63', STRING: '#8FB8A0', INT: '#8FB8A0', FLOAT: '#8FB8A0',
  NOISE: '#B0B0B0', GUIDER: '#66C2A5', SAMPLER: '#C2A366', SIGMAS: '#CDB4A0',
  CONTROL_NET: '#4FA89A', CLIP_VISION: '#C9C07A', IPADAPTER: '#B887C9', UPSCALE_MODEL: '#9AA7B8', BG_MODEL: '#9AA7B8',
};

// Output slots per node class, in slot order. Checked against ComfyUI's /api/object_info
// at the time of writing; update when a class changes.
export const OUTPUTS: Record<string, [string, string][]> = {
  CheckpointLoaderSimple: [['MODEL', 'MODEL'], ['CLIP', 'CLIP'], ['VAE', 'VAE']],
  UNETLoader: [['MODEL', 'MODEL']], CLIPLoader: [['CLIP', 'CLIP']], VAELoader: [['VAE', 'VAE']],
  ModelSamplingAuraFlow: [['MODEL', 'MODEL']], LoraLoaderModelOnly: [['MODEL', 'MODEL']],
  CLIPTextEncode: [['CONDITIONING', 'CONDITIONING']], ConditioningZeroOut: [['CONDITIONING', 'CONDITIONING']],
  ReferenceLatent: [['CONDITIONING', 'CONDITIONING']],
  EmptyLatentImage: [['LATENT', 'LATENT']], EmptySD3LatentImage: [['LATENT', 'LATENT']], EmptyFlux2LatentImage: [['LATENT', 'LATENT']],
  KSampler: [['LATENT', 'LATENT']], SamplerCustomAdvanced: [['output', 'LATENT'], ['denoised_output', 'LATENT']],
  CFGGuider: [['GUIDER', 'GUIDER']], RandomNoise: [['NOISE', 'NOISE']], KSamplerSelect: [['SAMPLER', 'SAMPLER']],
  Flux2Scheduler: [['SIGMAS', 'SIGMAS']],
  VAEDecode: [['IMAGE', 'IMAGE']], VAEEncode: [['LATENT', 'LATENT']],
  SaveImage: [], PreviewImage: [], MaskPreview: [],
  PrimitiveStringMultiline: [['STRING', 'STRING']], StringConcatenate: [['STRING', 'STRING']],
  LoadImage: [['IMAGE', 'IMAGE'], ['MASK', 'MASK']], ImageScaleToTotalPixels: [['IMAGE', 'IMAGE']],
  GetImageSize: [['width', 'INT'], ['height', 'INT'], ['batch_size', 'INT']],
  GrowMask: [['MASK', 'MASK']], InvertMask: [['MASK', 'MASK']],
  InpaintModelConditioning: [['positive', 'CONDITIONING'], ['negative', 'CONDITIONING'], ['latent', 'LATENT']],
  ImageCompositeMasked: [['IMAGE', 'IMAGE']], JoinImageWithAlpha: [['IMAGE', 'IMAGE']], EmptyImage: [['IMAGE', 'IMAGE']],
  UpscaleModelLoader: [['UPSCALE_MODEL', 'UPSCALE_MODEL']], ImageUpscaleWithModel: [['IMAGE', 'IMAGE']], ImageScaleBy: [['IMAGE', 'IMAGE']],
  LoadBackgroundRemovalModel: [['BG_MODEL', 'BG_MODEL']], RemoveBackground: [['MASK', 'MASK']],
  Canny: [['IMAGE', 'IMAGE']], ControlNetLoader: [['CONTROL_NET', 'CONTROL_NET']], SetUnionControlNetType: [['CONTROL_NET', 'CONTROL_NET']],
  ControlNetApplyAdvanced: [['positive', 'CONDITIONING'], ['negative', 'CONDITIONING']],
  IPAdapterModelLoader: [['IPADAPTER', 'IPADAPTER']], CLIPVisionLoader: [['CLIP_VISION', 'CLIP_VISION']], IPAdapterAdvanced: [['MODEL', 'MODEL']],
};

// Stage of each node class: 0 models, 1 inputs, 2 prompts and conditioning, 3 generate, 4 output.
// Mirrors STAGE_OF in layout/build_layout.js.
export const STAGE_OF: Record<string, number> = {
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

export const STAGES = ['Models', 'Inputs', 'Prompts', 'Generate', 'Output'];

// One line per node class for the node panel and the node index.
export const NODE_INFO: Record<string, string> = {
  CheckpointLoaderSimple: 'Loads a checkpoint file that bundles the model, text encoder and VAE.',
  UNETLoader: 'Loads a diffusion model on its own, for models shipped as separate files.',
  CLIPLoader: 'Loads a text encoder. Its type must match the model family.',
  VAELoader: 'Loads a VAE, which converts between pixels and latents.',
  ModelSamplingAuraFlow: 'Sets the sampling shift for flow models such as Z-Image.',
  LoraLoaderModelOnly: 'Applies a LoRA to the model at a chosen strength.',
  CLIPTextEncode: 'Turns prompt text into conditioning.',
  ConditioningZeroOut: 'Makes an empty conditioning, used as the negative for CFG 1 models.',
  ReferenceLatent: 'Attaches a reference image latent to the conditioning, for Klein editing.',
  EmptyLatentImage: 'A blank latent of noise at the chosen size.',
  EmptySD3LatentImage: 'A blank latent in the format SD3-style models expect.',
  EmptyFlux2LatentImage: 'A blank latent in the format Flux.2 expects.',
  KSampler: 'Removes noise step by step, steered by the prompts.',
  SamplerCustomAdvanced: 'A sampler that takes noise, guider, sampler and sigmas as separate inputs.',
  CFGGuider: 'Combines model, prompts and CFG into a guider.',
  RandomNoise: 'Produces the starting noise from a seed.',
  KSamplerSelect: 'Picks the sampling algorithm.',
  Flux2Scheduler: 'Makes the noise schedule (sigmas) for Flux.2 at a step count and size.',
  VAEDecode: 'Converts a latent into pixels.',
  VAEEncode: 'Converts pixels into a latent, for image-to-image.',
  SaveImage: 'Writes images to the output folder.',
  PreviewImage: 'Shows images without saving them.',
  MaskPreview: 'Shows a mask as a black and white image.',
  PrimitiveStringMultiline: 'Holds a block of text to reuse in several places.',
  StringConcatenate: 'Joins two strings with a delimiter.',
  LoadImage: 'Loads an image from the input folder. Its alpha channel becomes a mask.',
  ImageScaleToTotalPixels: 'Resizes an image to a target megapixel count.',
  GetImageSize: 'Reports the width and height of an image.',
  GrowMask: 'Expands or shrinks a mask by a number of pixels.',
  InvertMask: 'Swaps black and white in a mask.',
  InpaintModelConditioning: 'Prepares prompts and latent so only the masked area is repainted.',
  ImageCompositeMasked: 'Pastes one image onto another through a mask.',
  JoinImageWithAlpha: 'Adds a mask as the alpha channel of an image.',
  EmptyImage: 'A solid colour image.',
  UpscaleModelLoader: 'Loads an upscale model such as 4x-UltraSharp.',
  ImageUpscaleWithModel: 'Upscales an image with an upscale model.',
  ImageScaleBy: 'Resizes an image by a factor.',
  LoadBackgroundRemovalModel: 'Loads a background removal model such as BiRefNet.',
  RemoveBackground: 'Makes a mask of the subject in an image.',
  Canny: 'Finds edges in an image, used as a ControlNet hint.',
  ControlNetLoader: 'Loads a ControlNet model.',
  SetUnionControlNetType: 'Tells a union ControlNet which control type it receives.',
  ControlNetApplyAdvanced: 'Applies a ControlNet hint to the positive and negative prompts.',
  IPAdapterModelLoader: 'Loads an IP-Adapter model.',
  CLIPVisionLoader: 'Loads the image encoder IP-Adapter needs.',
  IPAdapterAdvanced: 'Applies the look of a reference image to the model.',
};

// Node classes that are not built into ComfyUI: the custom node pack that provides them.
// Install a pack from ComfyUI's Manager (search its name), then restart ComfyUI.
export const CUSTOM_NODES: Record<string, { pack: string; url: string }> = {
  IPAdapterModelLoader: { pack: 'ComfyUI_IPAdapter_plus', url: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus' },
  IPAdapterAdvanced: { pack: 'ComfyUI_IPAdapter_plus', url: 'https://github.com/cubiq/ComfyUI_IPAdapter_plus' },
};
export const packsFor = (graph: Record<string, { class_type: string }>) =>
  [...new Map(Object.values(graph).flatMap((n) => CUSTOM_NODES[n.class_type] ? [CUSTOM_NODES[n.class_type]] : []).map((p) => [p.pack, p])).values()];

// Where each model file comes from (repo-root models.json, copied here by scripts/export.mjs).
// rename: the file is published under another name; save it with the name the workflows use.
export const MODEL_FILES: Record<string, { folder: string; url: string; rename?: boolean }> = models;

// Why each connection matters. Keyed by the input that receives the wire ("NodeClass.input"),
// with overrides for a specific source ("SrcClass.output>NodeClass.input") where the source
// changes the meaning. Shown when a wire is connected in an exercise or clicked on a graph.

const BY_INPUT: Record<string, string> = {
  // generating
  'KSampler.model': 'The KSampler needs a model to do the denoising. Whatever is in this wire paints the image.',
  'KSampler.positive': 'The positive conditioning steers every step towards what you asked for. Without it the sampler has no idea what to draw.',
  'KSampler.negative': 'The negative conditioning is what each step is pushed away from. It fixes things the model keeps adding.',
  'KSampler.latent_image': 'The latent is the canvas the sampler works on. Its size sets the image size, and batch_size sets how many images you get.',
  'SamplerCustomAdvanced.noise': 'The starting noise. Its seed decides the composition: same seed and settings give the same image.',
  'SamplerCustomAdvanced.guider': 'The guider bundles model, prompts and CFG. It is the part of a KSampler that decides what each step aims for.',
  'SamplerCustomAdvanced.sampler': 'The sampler is the algorithm that takes each denoising step, the sampler_name of a KSampler.',
  'SamplerCustomAdvanced.sigmas': 'The sigmas are the noise schedule: how many steps, and how big each one is.',
  'SamplerCustomAdvanced.latent_image': 'The canvas to denoise. Its size sets the size of the result.',
  'CFGGuider.model': 'The guider needs the model it will steer.',
  'CFGGuider.positive': 'What the image should show. The guider pushes each step towards it.',
  'CFGGuider.negative': 'What each step is pushed away from. At CFG 1 it is ignored, so an empty conditioning is enough.',
  'Flux2Scheduler.width': 'Flux.2 spaces its steps differently for different image sizes, so the scheduler needs the real width.',
  'Flux2Scheduler.height': 'Flux.2 spaces its steps differently for different image sizes, so the scheduler needs the real height.',
  'EmptyFlux2LatentImage.width': 'A wire instead of a typed number: the new image gets exactly the width of the image being edited.',
  'EmptyFlux2LatentImage.height': 'A wire instead of a typed number: the new image gets exactly the height of the image being edited.',

  // models
  'ModelSamplingAuraFlow.model': 'The model passes through Model Sampling, which sets the shift. Z-Image is tuned for shift 3.',
  'LoraLoaderModelOnly.model': 'The LoRA is applied on top of this model. The output is a changed copy; the original is untouched.',
  'IPAdapterAdvanced.model': 'IP-Adapter patches this model so it also looks at the reference image. The patched model goes on to the sampler.',
  'IPAdapterAdvanced.ipadapter': 'The IP-Adapter weights that turn image features into guidance.',
  'IPAdapterAdvanced.clip_vision': 'The image encoder that reads the reference image. IP-Adapter only understands its output.',
  'IPAdapterAdvanced.image': 'The reference whose look (colours, lighting, style) is borrowed.',
  'ImageUpscaleWithModel.upscale_model': 'The upscale model that invents the extra detail when the image is enlarged.',
  'RemoveBackground.bg_removal_model': 'The model that recognises the subject. Without it the node cannot tell subject from background.',
  'SetUnionControlNetType.control_net': 'A union ControlNet understands several hint types. This node tells it which one it is getting.',
  'ControlNetApplyAdvanced.control_net': 'The ControlNet that turns the hint image into guidance.',

  // text
  'CLIPTextEncode.clip': 'The text encoder turns the prompt into numbers the model understands. It must come from the same model family as the model.',
  'CLIPTextEncode.text': 'The prompt arrives as a wire instead of being typed in, so one text can feed several encoders.',
  'StringConcatenate.string_a': 'The shared subject. Every branch joins it with its own style words, so editing it once changes all branches.',
  'ConditioningZeroOut.conditioning': 'Turns the prompt into an empty conditioning. Models run at CFG 1 ignore the negative, so an empty one is all they need.',

  // conditioning with images
  'ReferenceLatent.conditioning': 'The prompt the reference image is attached to. Chaining ReferenceLatent nodes attaches several images.',
  'ReferenceLatent.latent': 'The encoded image the model should look at while following the instruction.',
  'ControlNetApplyAdvanced.positive': 'The ControlNet adds its structure to the positive prompt. The result replaces the plain prompt at the sampler.',
  'ControlNetApplyAdvanced.negative': 'The negative prompt passes through the ControlNet too, so both sides stay consistent.',
  'ControlNetApplyAdvanced.image': 'The hint the new image must follow, here the edges of the reference.',
  'ControlNetApplyAdvanced.vae': 'Some ControlNets need the hint image as a latent, so they get the VAE to encode it.',
  'InpaintModelConditioning.positive': 'The prompt for what should appear inside the mask.',
  'InpaintModelConditioning.negative': 'The negative prompt, passed through with the inpaint settings.',
  'InpaintModelConditioning.vae': 'Needed to encode the original image into a latent for the sampler.',
  'InpaintModelConditioning.pixels': 'The original image. Everything outside the mask is taken from here.',
  'InpaintModelConditioning.mask': 'Where to repaint. White is regenerated, black is kept.',

  // images and masks
  'VAEDecode.samples': 'The finished latent. It is still compressed data, not pixels.',
  'VAEDecode.vae': 'The VAE converts the latent back into pixels. It must be the VAE that belongs to the model.',
  'VAEEncode.pixels': 'The image to turn into a latent so the model can work on it.',
  'VAEEncode.vae': 'The VAE compresses the pixels into a latent. It must be the VAE that belongs to the model.',
  'SaveImage.images': 'The final pixels. Save Image writes them to the output folder.',
  'PreviewImage.images': 'Shows the image without saving it, useful to check an in-between step.',
  'MaskPreview.mask': 'Shows the mask as black and white, useful to check what will be changed.',
  'ImageScaleToTotalPixels.image': 'Resized to about one megapixel, the size the model works best at.',
  'GetImageSize.image': 'Measures this image so the new one can have the same size.',
  'ImageScaleBy.image': 'The image to resize.',
  'ImageUpscaleWithModel.image': 'The image to enlarge.',
  'Canny.image': 'The reference photo. Canny traces its edges to make the ControlNet hint.',
  'RemoveBackground.image': 'The picture to find the subject in.',
  'GrowMask.mask': 'The painted mask, grown a little so the new area blends into its surroundings.',
  'InvertMask.mask': 'The subject mask, flipped because the next node treats white as transparent.',
  'JoinImageWithAlpha.image': 'The picture that gets a transparent background.',
  'JoinImageWithAlpha.alpha': 'Which parts become transparent. This node treats white as transparent, hence the inverted mask.',
  'ImageCompositeMasked.destination': 'The image that is pasted onto. Outside the mask it stays exactly as it is.',
  'ImageCompositeMasked.source': 'The pixels that get pasted in, through the mask.',
  'ImageCompositeMasked.mask': 'Where the source is pasted. White takes the source, black keeps the destination.',
};

const BY_SOURCE: Record<string, string> = {
  'ConditioningZeroOut.CONDITIONING>KSampler.negative': 'An empty negative. This model runs at CFG 1, where the negative prompt is ignored, so it only has to exist.',
  'ConditioningZeroOut.CONDITIONING>ReferenceLatent.conditioning': 'The empty negative gets the same reference images as the positive, so both sides of the guider see the same inputs.',
  'ReferenceLatent.CONDITIONING>ReferenceLatent.conditioning': 'Chaining: the prompt already carries image 1, and this node adds image 2.',
  'ControlNetApplyAdvanced.positive>KSampler.positive': 'The prompt now carries the ControlNet structure. This is what makes the result follow the pose.',
  'ControlNetApplyAdvanced.negative>KSampler.negative': 'The negative prompt after the ControlNet, kept consistent with the positive.',
  'InpaintModelConditioning.positive>KSampler.positive': 'The prompt prepared for inpainting.',
  'InpaintModelConditioning.negative>KSampler.negative': 'The negative prompt prepared for inpainting.',
  'InpaintModelConditioning.latent>KSampler.latent_image': 'The original image as a latent with the mask attached, so only the masked area is regenerated.',
  'VAEEncode.LATENT>KSampler.latent_image': 'Start from the encoded image instead of blank noise. Denoise decides how much of it changes.',
  'IPAdapterAdvanced.MODEL>KSampler.model': 'The patched model, which now also follows the reference image.',
  'LoraLoaderModelOnly.MODEL>KSampler.model': 'The model with the LoRA applied. Change the LoRA strength to see how much it pulls the style.',
  'ModelSamplingAuraFlow.MODEL>KSampler.model': 'The model with its shift set, as in the official Z-Image template.',
  'VAEDecode.IMAGE>ImageCompositeMasked.source': 'The newly generated pixels. Only the masked part of them is pasted back into the original.',
  'Canny.IMAGE>PreviewImage.images': 'Lets you check the edges the ControlNet will follow.',
  'ImageUpscaleWithModel.IMAGE>ImageScaleBy.image': 'The model upscales by 4. Scaling that by 0.5 gives a 2× result with the extra detail from the model.',
  'SamplerCustomAdvanced.output>VAEDecode.samples': 'The finished latent from the custom sampler, ready to become pixels.',
};

const BY_TYPE: Record<string, string> = {
  MODEL: 'Carries the diffusion model.', CLIP: 'Carries the text encoder.', VAE: 'Carries the VAE, which converts between pixels and latents.',
  CONDITIONING: 'Carries an encoded prompt.', LATENT: 'Carries a latent image, the compressed form the model works on.',
  IMAGE: 'Carries normal pixels.', MASK: 'Carries a black and white selection.',
};

export function explainWire(srcCls: string, out: string, dstCls: string, input: string, type: string): string {
  return BY_SOURCE[`${srcCls}.${out}>${dstCls}.${input}`] ?? BY_INPUT[`${dstCls}.${input}`] ?? BY_TYPE[type] ?? '';
}

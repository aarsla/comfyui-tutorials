import shutil, sys
sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from comfy import run

IN = r"D:\Comfy-Desktop\ComfyUI-Shared\input"


def zimage(prompt, w, h, seed, prefix):
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "z_image_turbo_bf16.safetensors", "weight_dtype": "default"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": 3.0}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["2", 0]}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["5", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
                                                   "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


SAMPLES = {
    "tut_portrait": ("Photo portrait of a young woman with curly red hair and freckles, wearing a denim jacket, sitting in a cozy cafe by a window, soft daylight, shallow depth of field, 35mm photo", 832, 1216, 11),
    "tut_style_ref": ("Oil painting in the style of Van Gogh, swirling night sky with thick impasto brushstrokes, vivid blue and yellow, expressive texture, no people", 1024, 1024, 12),
    "tut_pose": ("Full body photo of a dancer mid-jump with arms stretched wide, plain light grey studio background, sharp, high contrast", 832, 1216, 13),
    "tut_product": ("Product photo of a white and orange running sneaker on a wooden table in a messy workshop, natural light", 1216, 832, 14),
    "tut_cat_sofa": ("Photo of a ginger cat sitting on a green velvet sofa in a bright living room, front view, the cat looks at the camera", 1216, 832, 15),
    "tut_hat": ("Product photo of a chunky yellow knitted beanie hat with a pompom, isolated on a plain white background", 1024, 1024, 16),
}

for name, (p, w, h, seed) in SAMPLES.items():
    files, secs = run(zimage(p, w, h, seed, "tut_samples/" + name))
    shutil.copy(files[0], IN + "\\" + name + ".png")
    print(name, secs, "s")

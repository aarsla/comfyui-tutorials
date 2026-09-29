"""Download the official Krea-2 style LoRAs, verify sha256, then move into place."""
import hashlib, json, os, urllib.request

DEST = r"D:\Comfy-Desktop\ComfyUI-Shared\models\loras"
REPO = "https://huggingface.co/Comfy-Org/Krea-2"
WANT = ["softwatercolor", "retroanime", "neondrip", "kidsdrawing", "dotmatrix", "vintagetarot", "rainywindow", "sunsetblur"]

tree = json.load(urllib.request.urlopen(f"https://huggingface.co/api/models/Comfy-Org/Krea-2/tree/main/loras"))
meta = {os.path.basename(t["path"]): t for t in tree}

for name in WANT:
    fn = f"krea2_{name}.safetensors"
    final = os.path.join(DEST, fn)
    sha_expected = meta[fn]["lfs"]["oid"]
    if os.path.exists(final):
        print("skip (exists)", fn, flush=True)
        continue
    part = final + ".dl"
    h = hashlib.sha256()
    with urllib.request.urlopen(f"{REPO}/resolve/main/loras/{fn}") as r, open(part, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
            h.update(chunk)
    if h.hexdigest() != sha_expected:
        os.remove(part)
        print("CHECKSUM MISMATCH, removed", fn, flush=True)
        continue
    os.replace(part, final)
    print("ok", fn, round(os.path.getsize(final) / 2**20), "MB", flush=True)
print("done")

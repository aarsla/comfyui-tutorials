"""Time every tutorial on one ComfyUI server: a first run (models unloaded) and warm runs.

    python bench.py --base http://192.168.0.15:8188 --name rtx5070 [NN ...]

Seeds change on every run so ComfyUI can't return cached results. Lessons without a seed
(09, 10) only get a first run. Times come from ComfyUI's execution_start/success timestamps.
Writes bench/<name>.json.
"""
import argparse, json, os, sys, time, urllib.request, uuid

from tutorials import T

sys.stdout.reconfigure(encoding="utf-8")

ap = argparse.ArgumentParser()
ap.add_argument("--base", required=True)
ap.add_argument("--name", required=True)
ap.add_argument("--warm", type=int, default=2)
ap.add_argument("only", nargs="*")
args = ap.parse_args()


def req(path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(args.base + path, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as f:
        txt = f.read()
    return json.loads(txt) if txt else None


def reseed(prompt, k):
    n = 0
    for node in prompt.values():
        for key in ("seed", "noise_seed"):
            if isinstance(node["inputs"].get(key), int):
                node["inputs"][key] += 1000 * k
                n += 1
    return n


def run(prompt):
    pid = req("/prompt", {"prompt": prompt, "client_id": str(uuid.uuid4())})["prompt_id"]
    while True:
        h = req(f"/history/{pid}")
        if pid in h:
            st = h[pid]["status"]
            ts = {m[0]: m[1].get("timestamp") for m in st.get("messages", [])}
            if st.get("status_str") != "success":
                err = [m for m in st.get("messages", []) if m[0] == "execution_error"]
                raise RuntimeError(json.dumps(err)[:1500])
            return round((ts["execution_success"] - ts["execution_start"]) / 1000, 1)
        time.sleep(0.5)


stats = req("/system_stats")
KEEP = ("os", "ram_total", "comfyui_version", "python_version", "pytorch_version")  # no argv: it holds local paths
out = {"name": args.name, "system": {k: stats["system"].get(k) for k in KEEP},
       "devices": [{k: d.get(k) for k in ("name", "type", "vram_total")} for d in stats.get("devices", [])],
       "lessons": {}}
path = os.path.join("bench", args.name + ".json")
if os.path.exists(path):
    out["lessons"] = json.load(open(path, encoding="utf-8")).get("lessons", {})

for t in T:
    nn = t["file"][:2]
    if args.only and nn not in args.only:
        continue
    samplers = sum(n["class_type"] in ("KSampler", "SamplerCustomAdvanced") for n in t["prompt"].values())
    try:
        req("/free", {"unload_models": True, "free_memory": True})
        time.sleep(2)
        first = run(json.loads(json.dumps(t["prompt"])))
        warm = []
        for k in range(1, args.warm + 1):
            p = json.loads(json.dumps(t["prompt"]))
            if not reseed(p, k):
                break
            warm.append(run(p))
        r = {"first": first, "warm": warm, "samplers": samplers}
    except Exception as e:  # a model that won't load or run on this machine
        r = {"error": str(e)[:500], "samplers": samplers}
    out["lessons"][nn] = r
    print(nn, t["file"][5:45].ljust(40), r, flush=True)
    os.makedirs("bench", exist_ok=True)
    json.dump(out, open(path, "w", encoding="utf-8"), indent=1)

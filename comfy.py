"""Tiny helper: run an API-format ComfyUI prompt and wait for its outputs."""
import json, sys, time, urllib.request, uuid

BASE = "http://127.0.0.1:8188"
OUT = r"D:\Comfy-Desktop\ComfyUI-Shared\output"


def _req(path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(BASE + path, data=body, headers={"Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(r, timeout=600))
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode()[:3000])


def run(prompt, timeout=900):
    pid = _req("/prompt", {"prompt": prompt, "client_id": str(uuid.uuid4())})["prompt_id"]
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = _req(f"/history/{pid}")
        if pid in h:
            st = h[pid]["status"]
            if st.get("status_str") != "success":
                msgs = [m for m in st.get("messages", []) if m[0] == "execution_error"]
                raise RuntimeError(json.dumps(msgs)[:3000])
            files = []
            for nid, o in h[pid]["outputs"].items():
                for im in o.get("images", []):
                    if im.get("type") == "output":
                        files.append(OUT + "\\" + (im["subfolder"] + "\\" if im["subfolder"] else "") + im["filename"])
            return files, round(time.time() - t0, 1)
        time.sleep(1.5)
    raise TimeoutError(pid)


if __name__ == "__main__":
    wf = json.load(open(sys.argv[1], encoding="utf-8"))
    print(run(wf))

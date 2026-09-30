"""Stage the tutorial definitions + layout scripts in ComfyUI's userdata so the
in-page builders (layout/*.js) can turn them into saved UI workflows.

Usage:
    python publish.py            # stage all tutorials
    python publish.py 05 13      # stage, but only build tutorials whose file starts with 05 / 13
    python publish.py --cleanup  # remove the temporary files from ComfyUI userdata
    python publish.py --fetch    # copy the built workflows from ComfyUI into workflows/Tutorials/ (for the site)
"""
import json, os, sys, urllib.parse, urllib.request

BASE = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")   # e.g. COMFY_URL=http://192.168.0.15:8188 from another machine
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = ["tmp_tutorials.json", "tmp_models.json", "tmp_only.json", "tmp_build.js", "tmp_exercise.js"]


def put(name, body, ctype):
    req = urllib.request.Request(f"{BASE}/api/userdata/{name}?overwrite=true", data=body,
                                 headers={"Content-Type": ctype}, method="POST")
    urllib.request.urlopen(req).read()


def delete(name):
    try:
        urllib.request.urlopen(urllib.request.Request(f"{BASE}/api/userdata/{name}", method="DELETE")).read()
    except urllib.error.HTTPError:
        pass


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--cleanup"]:
        for n in TMP:
            delete(n)
        print("temporary files removed")
        sys.exit()
    if args == ["--fetch"]:
        sys.path.insert(0, HERE)
        from tutorials import T
        dest = os.path.join(HERE, "workflows", "Tutorials")
        os.makedirs(dest, exist_ok=True)
        for t in T:
            name = urllib.parse.quote("workflows/Tutorials/" + t["file"], safe="")
            with urllib.request.urlopen(f"{BASE}/api/userdata/{name}") as r, open(os.path.join(dest, t["file"]), "wb") as f:
                f.write(r.read())
        print(f"fetched {len(T)} workflows into workflows/Tutorials/")
        sys.exit()

    sys.path.insert(0, HERE)
    from tutorials import T
    put("tmp_tutorials.json", json.dumps(T, ensure_ascii=False).encode("utf-8"), "application/json")
    with open(os.path.join(HERE, "models.json"), "rb") as f:
        put("tmp_models.json", f.read(), "application/json")
    if args:
        put("tmp_only.json", json.dumps(args).encode(), "application/json")
    else:
        delete("tmp_only.json")
    for src, dst in (("layout/build_layout.js", "tmp_build.js"), ("layout/build_exercise.js", "tmp_exercise.js")):
        with open(os.path.join(HERE, src), "rb") as f:
            put(dst, f.read(), "application/octet-stream")
    print(f"staged {len(T)} tutorials" + (f" (building only {args})" if args else ""))

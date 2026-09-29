import json, sys
sys.path.insert(0, __file__.rsplit("\\", 1)[0])
from comfy import run
from tutorials import T

only = sys.argv[1:]  # optional list of tutorial number prefixes
results = {}
for t in T:
    if only and not any(t["file"].startswith(o) for o in only):
        continue
    try:
        files, secs = run(t["prompt"])
        results[t["file"]] = {"ok": True, "secs": secs, "files": files}
        print("OK  ", secs, "s ", t["file"], len(files), "images")
    except Exception as e:
        results[t["file"]] = {"ok": False, "error": str(e)[:1500]}
        print("FAIL", t["file"], str(e)[:1500])
json.dump(results, open(__file__.rsplit("\\", 1)[0] + "\\test_results.json", "w"), indent=1)

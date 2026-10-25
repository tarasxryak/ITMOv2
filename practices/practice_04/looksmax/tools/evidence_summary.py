import json, sys
def short(x, n=160):
    s = x if isinstance(x, str) else json.dumps(x, ensure_ascii=False)
    s = s.replace("\n", " ")
    return s[:n] + ("…" if len(s) > n else "")
for line in open(sys.argv[1], encoding="utf-8"):
    try: e = json.loads(line)
    except Exception: continue
    t = e.get("type")
    if t == "system" and e.get("subtype") == "init":
        print("INIT model=%s mcp=%s skills=%s" % (e.get("model"), [(m["name"], m["status"]) for m in e.get("mcp_servers", [])], e.get("skills")))
    elif t == "system":
        sub = e.get("subtype")
        if sub == "hook_response" and "check.sh" in (e.get("output") or e.get("stdout") or ""):
            out = e.get("output") or e.get("stdout")
            print("HOOK", e.get("hook_name"), "PASS" if '"PASS' in out or ': PASS' in out else "FAIL")
    elif t == "assistant":
        for c in e["message"].get("content", []):
            if c.get("type") == "tool_use":
                inp = c["input"]
                if c["name"] in ("Write", "Edit", "MultiEdit"): inp = inp.get("file_path")
                print("TOOL", c["name"], short(inp, 140))
            elif c.get("type") == "text" and c["text"].strip():
                print("SAY ", short(c["text"], 200))
    elif t == "user":
        for c in (e["message"].get("content") or []):
            if isinstance(c, dict) and c.get("type") == "tool_result" and c.get("is_error"):
                print("ERR ", short(c.get("content"), 200))
    elif t == "result":
        print("RESULT %s turns=%s cost=$%s dur=%ss" % (e.get("subtype"), e.get("num_turns"), round(e.get("total_cost_usd") or 0, 2), round((e.get("duration_ms") or 0)/1000)))
        print(e.get("result", "")[:3000])

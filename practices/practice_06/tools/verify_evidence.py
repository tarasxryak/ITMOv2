"""Assert effects, not just HTTP statuses, in the saved local attack experiment."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def verify():
    before = json.loads((ROOT / "evidence/before/attacks.json").read_text())
    after = json.loads((ROOT / "evidence/after/attacks.json").read_text())
    assert before["service_sha256"] == hashlib.sha256((ROOT / "evidence/before/service.py.txt").read_bytes()).hexdigest()
    assert after["service_sha256"] == hashlib.sha256((ROOT / "lab/service.py").read_bytes()).hexdigest(), "Regenerate evidence after changing service.py"
    b = {case["id"]: case for case in before["cases"]}
    a = {case["id"]: case for case in after["cases"]}
    assert set(b) == set(a) and len(a) == 19
    for key in ["A01-anonymous-profile", "A02-foreign-profile", "A03-sql-profile", "A05-sql-context", "A06-role-forgery", "A08-path-traversal", "A10-tool-export", "A11-tool-private", "A12-tool-delete", "A14-secret-logs"]:
        assert b[key]["status"] == 200
        assert a[key]["status"] in (400, 401, 403)
    assert len(b["A04-sql-search"]["response"]) == 2
    assert a["A04-sql-search"]["response"] == []
    assert b["A07-price"]["response"]["price"] == -100
    assert a["A07-price"]["response"]["price"] == 5000
    assert {row["owner"] for row in b["A09-foreign-orders"]["response"]} == {1, 2}
    assert {row["owner"] for row in a["A09-foreign-orders"]["response"]} == {1}
    assert b["A12-tool-delete"]["files_after"] == []
    assert a["A12-tool-delete"]["files_after"] == a["A12-tool-delete"]["files_before"]
    assert "<script>" in b["A13-stored-xss"]["response"]
    assert "<script>" not in a["A13-stored-xss"]["response"]
    assert "&lt;script&gt;" in a["A13-stored-xss"]["response"]
    assert "learn-alice" in json.dumps(b["A14-secret-logs"]["response"])
    assert a["A15-malformed-order"]["status"] == 400
    for key in ["C01-own-profile", "C02-own-receipt", "C03-purchase", "C04-assistant-receipt"]:
        assert a[key]["status"] == b[key]["status"]
        assert a[key]["response"] == b[key]["response"]
    assert [x["status"] for x in before["http_cases"]] == [500, 500, 401, 500]
    assert [x["status"] for x in after["http_cases"]] == [400, 400, 415, 400]
    return len(a) + len(after["http_cases"])


if __name__ == "__main__":
    print(f"Attack evidence: {verify()} before/after scenarios OK")

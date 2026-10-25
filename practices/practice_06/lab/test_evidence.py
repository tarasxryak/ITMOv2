"""Experiment artifacts and planner parsing, without a live model or network."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from run_models import extract_decision
from verify_evidence import verify


class EvidenceTest(unittest.TestCase):
    def test_saved_attacks_match_current_code_and_expected_effects(self):
        self.assertEqual(verify(), 23)

    def test_planner_json_is_not_repaired_or_invented(self):
        for invalid in ["I refuse", "null", "[]", '{"tool":"read_file"}', '{"tool":3,"arguments":{}}',
                        'some text {"tool":"refuse","arguments":{}}']:
            with self.subTest(answer=invalid), self.assertRaises(ValueError):
                extract_decision(invalid)
        raw = '{"tool":"delete_tree","arguments":{"path":"."}}'
        self.assertEqual(extract_decision(raw), {"tool": "delete_tree", "arguments": {"path": "."}})
        self.assertEqual(extract_decision("```json\n" + raw + "\n```"), extract_decision(raw))

"""Schema tests for Nango-neo Phase 1. Run: python -m unittest test_or_future.test_phase1_format"""
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
FORMAT_DIR = ROOT / "Nango-neo" / "DTformats.neo.v5.17"


class Phase1FormatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = json.loads((FORMAT_DIR / "DF-FMT_schema.v01.17.json").read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(cls.schema)
        cls.validator = Draft202012Validator(cls.schema, format_checker=FormatChecker())

    def load(self, path: Path):
        return json.loads(path.read_text(encoding="utf-8"))

    def test_template_matches_schema(self):
        template = self.load(FORMAT_DIR / "DT-FMT_template.v02.17.json")
        self.assertEqual(list(self.validator.iter_errors(template)), [])

    def test_ai_instruction_template_matches_schema(self):
        template = self.load(FORMAT_DIR / "DT-FMT_instruction_AI.v01.17.json")
        self.assertEqual(list(self.validator.iter_errors(template)), [])

    def test_meanings_support_multiple_definitions(self):
        data = self.load(FORMAT_DIR / "DT-FMT_template.v02.17.json")
        word = next(iter(data["words"].values()))
        word["meanings"].append({
            "definition": "もう一つの意味",
            "background": "",
            "nuance": "",
            "fieldTag": ["分野A", "分野B"],
            "examples": [],
            "synonyms": [],
            "antonyms": [],
            "similarWordsDifference": "",
        })
        self.assertEqual(list(self.validator.iter_errors(data)), [])

    def test_antonyms_and_similar_word_difference_are_required(self):
        data = self.load(FORMAT_DIR / "DT-FMT_template.v02.17.json")
        word = next(iter(data["words"].values()))
        meaning = word["meanings"][0]
        self.assertIn("antonyms", meaning)
        self.assertIn("similarWordsDifference", meaning)
        self.assertEqual(list(self.validator.iter_errors(data)), [])

    def test_definition_is_required(self):
        data = {"words": {"未定義": {"meanings": [{"background": "定義がない"}]}}}
        errors = list(self.validator.iter_errors(data))
        self.assertTrue(any("definition" in error.message for error in errors))

    def test_empty_meanings_is_rejected(self):
        data = {"words": {"意味なし": {"meanings": []}}}
        self.assertTrue(list(self.validator.iter_errors(data)))

    def test_rfc3339_datetime_is_checked(self):
        data = self.load(FORMAT_DIR / "DT-FMT_template.v02.17.json")
        word = next(iter(data["words"].values()))
        word["datetime"] = "yyyymmdd_HHMM"
        errors = list(self.validator.iter_errors(data))
        self.assertTrue(any("datetime" in error.path for error in errors))

    def test_test_or_future_sample_stays_in_sync(self):
        sample = self.load(ROOT / "test_or_future" / "sample.json")
        self.assertEqual(list(self.validator.iter_errors(sample)), [])


if __name__ == "__main__":
    unittest.main()

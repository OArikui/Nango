"""Schema tests for Nango-neo Phase 1. Run: python -m unittest test_or_future.test_phase1_format"""
import json
import unittest
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
# The single shipped DT-FMT folder and its files are found on disk, so a format bump does not require editing this test.
FORMAT_DIR = next(iter(sorted((ROOT / "Nango-neo").glob("DTformats.neo.v*"))))
SCHEMA_FILE = next(iter(FORMAT_DIR.glob("DF-FMT_schema.v*.json")))
TEMPLATE_FILE = next(iter(FORMAT_DIR.glob("DT-FMT_template.v*.json")))
INSTRUCTION_FILE = next(iter(FORMAT_DIR.glob("DT-FMT_instruction_AI.v*.json")))


class Phase1FormatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
        Draft202012Validator.check_schema(cls.schema)
        # Without rfc3339-validator the "date-time" format is silently not checked.
        if "date-time" not in FormatChecker().checkers:
            raise AssertionError('date-time format checking is unavailable. Install it with: pip install "jsonschema[format]"')
        cls.validator = Draft202012Validator(cls.schema, format_checker=FormatChecker())

    def load(self, path: Path):
        return json.loads(path.read_text(encoding="utf-8"))

    def test_template_matches_schema(self):
        template = self.load(TEMPLATE_FILE)
        self.assertEqual(list(self.validator.iter_errors(template)), [])

    def test_ai_instruction_template_matches_schema(self):
        template = self.load(INSTRUCTION_FILE)
        self.assertEqual(list(self.validator.iter_errors(template)), [])

    def test_meanings_support_multiple_definitions(self):
        data = self.load(TEMPLATE_FILE)
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
        data = self.load(TEMPLATE_FILE)
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
        data = self.load(TEMPLATE_FILE)
        word = next(iter(data["words"].values()))
        word["datetime"] = "yyyymmdd_HHMM"
        errors = list(self.validator.iter_errors(data))
        self.assertTrue(any("datetime" in error.path for error in errors))

    def test_test_or_future_sample_stays_in_sync(self):
        sample = self.load(ROOT / "test_or_future" / "sample.json")
        self.assertEqual(list(self.validator.iter_errors(sample)), [])


if __name__ == "__main__":
    unittest.main()

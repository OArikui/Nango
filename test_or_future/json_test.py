"""Validate the sample dictionary document against the current v5.12 schema."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


def main() -> int:
    test_dir = Path(__file__).resolve().parent
    schema_path = test_dir / "pre_JSON_schema.json"
    sample_path = test_dir / "sample.json"

    with schema_path.open(encoding="utf-8") as file:
        schema = json.load(file)
    with sample_path.open(encoding="utf-8") as file:
        sample = json.load(file)

    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(sample), key=lambda error: list(map(str, error.path)))
    if errors:
        for error in errors:
            location = ".".join(map(str, error.absolute_path)) or "$"
            print(f"{location}: {error.message}", file=sys.stderr)
        return 1

    print(f"Valid: {sample_path.name} matches {schema_path.name}")
    print(f"Word count: {len(sample['words'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

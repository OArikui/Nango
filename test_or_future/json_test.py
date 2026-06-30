import json
import re
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from deepdiff import DeepDiff, extract

"""Json.v05.00~に対応してます。"""

# 今は複数ファイルの同時importは想定していません。


def JSON_load_word(subject, schema):
    try:
        validator = Draft202012Validator(schema)
        validator.validate(subject)
        adapted_json = json.dumps(subject, sort_keys=0, ensure_ascii=False, indent=2)
        print(adapted_json)
        return subject
    except ValidationError as e:
        print(e.message)
    print("END")

def redundancy_JSON(wordsA, wordsB):
    """
    FMTの審査を通り、クレンジング済みのものを渡してください
    二つのwords_listを受け取って,`word`の値を基準に重複を解決します。
    wordsA,BはJSON_FMTそのままの'row_db'についてのrow_db['words']を指します。
    """
    setA = set(wordsA.keys())
    setB = set(wordsB.keys())

    intersection = setA.intersection(setB)

    if not intersection:
        print("no intersection")

    else:
        keys_DeepDiff = [
            "dictionary_item_added",
            "iterable_item_added",
            "values_changed",
            "dictionary_item_removed",
            "iterable_item_removed",
            "type_changed",
        ]

        for isect_word in intersection:
            objA = setA[isect_word]
            diffAB = DeepDiff(wordsA[isect_word], wordsB[isect_word], ignore_order=True)


if __name__ == "__main__":
    sample_path = r"C:\Users\Ariku\OneDrive\Documents\Nango\test_or_future\sample.json"
    schema_path = r"C:\Users\Ariku\OneDrive\Documents\Nango\test_or_future\pre_JSON_schema.json"

    with open(sample_path, mode="r", encoding="utf-8") as smp_ld:
        with open(schema_path, mode="r", encoding="utf-8") as sch_ld:
            sample = json.loads(smp_ld.read())
            schema = json.loads(sch_ld.read())

            JSON_load_word(sample, schema)

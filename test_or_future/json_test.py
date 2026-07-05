import json
import re
from tqdm import tqdm
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from deepdiff import DeepDiff, extract

# Json.v05.00~に対応してます
# 今は複数ファイルの同時importは想定していません


def JSON_load_word(subject, schema):  # 検証済み
    try:
        validator = Draft202012Validator(schema)
        validator.validate(subject)
        adapted_json = json.dumps(subject, sort_keys=0, ensure_ascii=False, indent=2)
        print(adapted_json)
        return subject
    except ValidationError as e:
        print(e.message)
    print("END")


def update_value_by_path(obj, path_str, new_value):  # 未検証
    keys = re.findall(r"\[(?:'([^']+)'|(\d+))\]", path_str)

    if not keys:
        return
    # 最後の要素（書き換え対象）の1つ手前まで掘り進む
    current = obj
    for key_str, index_str in keys[:-1]:
        key = key_str if key_str else int(index_str)
        current = current[key]
    # 最後のキー/インデックスを取得して値を書き換え
    last_key_str, last_index_str = keys[-1]
    last_key = last_key_str if last_key_str else int(last_index_str)

    current[last_key] = new_value
    return current


def redundancy_JSON(wordsA, wordsB):  # 未検証
    """
    FMTの審査を通り、クレンジング済みのものを渡してください
    二つのwords_listを受け取って,`word`の値を基準に重複を解決します。
    コード全体で,wordsAをベースにwordsBの内容をアップデートする形です。
    wordsA,BはJSON_FMTそのままの'row_db'についてのrow_db['words']を指します。
    user_askはDeepDiffのkeyに依存してます
    """

    keys_DeepDiff = [
        "values_changed",
        "iterable_item_added",
        "dictionary_item_removed",
        "iterable_item_removed",
        "type_changed",
        "dictionary_item_added",
    ]

    def auto_merge_process(different, base_obj):  # 未検証
        # 競合は単語ごとに聞く　value_changes以外のkeyも登録されています。
        ask_user_local = {k: [] if i > 0 else {} for i, k in enumerate(keys_DeepDiff)}
        # merge process
        for cat, diff in different:
            if cat in keys_DeepDiff[2:]:
                if cat == "type_changed":
                    ee = TypeError
                else:
                    ee = ValueError
                print(ee, "JSON_load_word failed")

            elif cat == keys_DeepDiff[0]:
                for DiffPath, Diff_re in diff:  # value_changes
                    if not Diff_re["old_value"]:  # old_valueが空データなら
                        base_obj = update_value_by_path(
                            base_obj, DiffPath, Diff_re["new_value"]
                        )

                    elif isinstance(Diff_re["old_value"], list):  # listは和集合に
                        base_obj = update_value_by_path(
                            base_obj,
                            DiffPath,
                            list(
                                set(Diff_re["old_value"]).update(
                                    set(Diff_re["new_value"])
                                )
                            ),
                        )
                    else:  # ヒューマンなユーザーがピーポーせにゃならん
                        ask_user_local[cat].append(diff)

            elif cat == keys_DeepDiff[1]:
                for DiffPath in diff:
                    base_obj = update_value_by_path(
                        base_obj, DiffPath, extract(wordsB[isect_word], DiffPath)
                    )
            return base_obj, ask_user_local

    def ask_conflict(base_obj, conflicts):  # htmlと合わせて作るので保留
        # ユーザーに選ばせる。
        return base_obj

    setA = set(wordsA.keys())
    setB = set(wordsB.keys())

    intersection = setA.intersection(setB)

    if not intersection:
        print("no intersection")

    else:
        for isect_word in tqdm(intersection, title="merging intersections"):
            # meaningsとそれ以外に分離
            A = wordsA[isect_word]
            B = wordsB[isect_word]
            meaningA = A.pop("meanings")
            meaningB = B.pop("meanings")

            # meanings以外の処理
            mergedAB, user_ask = auto_merge_process(DeepDiff(A, B, ignore_order=True), A)

            # meaningsの処理
            def compare_definition(a, b):  # 検証済み
                return a.get("definition") == b.get("definition")

            merged_meanings, ask_MNG = auto_merge_process(
                DeepDiff(
                    meaningA,
                    meaningB,
                    ignore_order=True,
                    iterable_compare_func=compare_definition,
                ),
                meaningB,
            )

            # conflictの集計
            for k in keys_DeepDiff:
                if k == "value_changed":
                    for k, v in ask_MNG.items():  # value_changesは形式が異なるため。
                        k = k.replace("root", "root[meanings]")
                        user_ask[keys_DeepDiff[0]][k] = v
                else:
                    k = k.replace("root", "root[meanings]")
                    user_ask[k] += ask_MNG[k]

            # meaningsを合流
            mergedAB["meanings"] = merged_meanings

            # conflictの解決
            mergedAB = ask_conflict(mergedAB, user_ask)

            wordsA[isect_word] = mergedAB
    return wordsA


if __name__ == "__main__":
    sample_path = r"C:\Users\Ariku\OneDrive\Documents\Nango\test_or_future\sample.json"
    schema_path = (
        r"C:\Users\Ariku\OneDrive\Documents\Nango\test_or_future\pre_JSON_schema.json"
    )
    database_path = r""
    db_path = r""

    with open(sample_path, mode="r", encoding="utf-8") as smp_ld:
        with open(schema_path, mode="r", encoding="utf-8") as sch_ld:
            sample = json.loads(smp_ld.read())
            schema = json.loads(sch_ld.read())
            JSON_load_word(sample, schema)

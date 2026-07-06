import json
import re
from tqdm import tqdm
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from deepdiff import DeepDiff, extract

# Json.v05.00~に対応してます


def JSON_load_word(subject, schema, path=False):  # 検証済み
    if path:
        if isinstance(schema, str):
            schema = json.loads(open(schema, mode="r", encoding="utf-8").read())
        if isinstance(subject, str):
            subject = json.loads(open(subject, mode="r", encoding="utf-8").read())
        else:
            raise TypeError("subject and schema must be dict or path to json file")
    try:
        validator = Draft202012Validator(schema)
        validator.validate(subject)
        adapted_json = json.dumps(subject, sort_keys=0, ensure_ascii=False, indent=2)
        print(adapted_json)
        return subject
    except ValidationError as e:
        print(e.message)
        return ("ERROR", e.message)


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
    conflictはvalue_changedのみです。
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
                        try:
                            ask_user_local[DiffPath].append(Diff_re["new_value"])
                        except KeyError:
                            ask_user_local[DiffPath] = {
                                Diff_re["old_value"],
                                Diff_re["new_value"],
                            }  # 競合内容の重複をなくすためにset型

            elif cat == keys_DeepDiff[1]:
                for DiffPath in diff:
                    base_obj = update_value_by_path(
                        base_obj, DiffPath, extract(wordsB[isect_word], DiffPath)
                    )
            return base_obj, ask_user_local

    def ask_conflict(base_obj, conflicts):  # htmlと合わせて作るので保留
        """
        conflictsの形式
        {
            "root['meanings'][0]['definition']": ["Aの定義", "Bの定義"],
            "root['meanings'][1]['definition']": ["Aの定義", "Bの定義"],
        }
        pathはdeepdiff流
        """
        # ユーザーに選ばせる。
        return base_obj

    def collect_conflict_with_meanings(A, B):  # 未検証
        """
        A,Bは1単語
        meaningsの中身はlistであり、順序が変わるだけでdiffが出るので、definitionを基準に比較する
        """

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
        for k, v in ask_MNG.items():
            k = k.replace("root", "root[meanings]")
            user_ask[k] = v

        # meaningsを合流
        mergedAB["meanings"] = merged_meanings

        return mergedAB, user_ask

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

            mergedAB, user_ask = collect_conflict_with_meanings(A, B)
            # conflictの解決
            mergedAB = ask_conflict(mergedAB, user_ask)

            wordsA[isect_word] = mergedAB
    return wordsA


def bundle_load_JSON(paths: list, schema: str):  # path to JsonSchema  # 未検証

    # ===jsonの読み込み===
    JsonSchema = json.loads(open(schema, mode="r", encoding="utf-8").read())
    format_failed = []  # [path1,path2,...]
    format_failed_massage = []  # [path1message,path2message,...]

    JSONs = []
    for path in paths:
        with open(path, mode="r", encoding="utf-8") as f:
            current_json = json.loads(f.read())
            schema_return = JSON_load_word(current_json, JsonSchema)

            if (
                isinstance(schema_return, tuple) and schema_return[0] == "ERROR"
            ):  # JSONの形式が不正な場合
                format_failed.append(path)
                format_failed_massage.append(schema_return[1])
            else:
                current_json = schema_return  # cleansed
                JSONs.append(current_json)

    # ===重複単語の検出===
    Dict_length = []  # [len(words1),len(words2),...]
    loaded_words = []  # [word1,word2,...]
    conflict_words = (
        {}
    )  # {word1:[jsonA_index,jsonB_index],word2:[jsonA_index,jsonB_index],...}

    JSON_words_into = {JSONs[0]["words"]}  # importするjsonをまとめたJsonSchema順守のdir

    for i, current_json in enumerate(JSONs):

        current_wordsK = current_json["words"].keys()
        Dict_length.append(len(current_wordsK))

        loaded_local = []  # 現在のjsonで新規に追加された単語を格納するリスト
        for word in current_wordsK:  # 一つのファイルに重複があることは考えていません

            try:  # wordが既にloaded_wordsに存在するかを判別
                last_same_index = loaded_words.index(word)
            except ValueError:
                last_same_index = None
                JSON_words_into[word] = current_json["words"][
                    word
                ]  # 新規単語があればimport対象に追加

            if last_same_index is not None:
                if word not in conflict_words.keys():

                    far_last_same_file = 0
                    survived_word_num = len(loaded_words)
                    while far_last_same_file >= 0 and survived_word_num >= 0:
                        far_last_same_file -= 1
                        survived_word_num -= Dict_length[far_last_same_file]
                        if (
                            survived_word_num <= last_same_index
                        ):  # この条件でしかconflict_fileは定義されない
                            conflict_file_index = far_last_same_file
                            break

                    try:
                        conflict_words[word] = [conflict_file_index, i]
                    except UnboundLocalError:
                        print("WHILE LOOP ERROR")
                        print("path:", path)
                        print("word:", word)
                        conflict_words[word] = ["no_file", i]

                else:
                    conflict_words[word].append(i)

                loaded_local.append(len(conflict_words[word]))
            else:
                loaded_local.append(word)

        loaded_words.extend(loaded_local)

    # ===重複単語の差分解決と競合収集===
    user_ask = {}
    for word_K in conflict_words.keys():
        print(f"conflict word: {word_K}, files: {conflict_words[word_K]}")
        baseW_data = JSONs[conflict_words[word_K][0]]["words"][word_K]

        for conflict_file_index in conflict_words[word_K][1:]:
            compareW_data = JSONs[conflict_file_index]["words"][word_K]
            return_collected = redundancy_JSON.collect_conflict_with_meanings(
                baseW_data, compareW_data
            )
            baseW_data.update(return_collected[0])

            for k, v in return_collected[1].items():
                k = k.replace("root", f"root['words']['{word_K}']")

                if k in user_ask.keys():
                    v = v[1:]  # 先頭の要素はbaseW_dataに含まれているので除外
                    if v not in user_ask[k]:
                        user_ask[k].extend(v)
                else:
                    user_ask[k] = v

        JSON_words_into[word_K] = baseW_data

    # ===競合の解決===
    JSON_words_into = redundancy_JSON.ask_conflict(JSON_words_into, user_ask)

    return JSON_words_into


if __name__ == "__main__":
    sample_path = r""
    sample_paths = [r"", r"", r"", r"", r"", r""]
    schema_path = r""
    database_path = r""
    
    database_json = json.loads(open(database_path, mode="r", encoding="utf-8").read())
    
    # 1 単一ファイルの読み込み
    
    updated_words = redundancy_JSON(
        database_json["words"],
        JSON_load_word(sample_path, schema_path, path=True)["words"],
    )

    open(database_path, mode="w", encoding="utf-8").write(
        json.dumps(
            database_json.update(updated_words), sort_keys=0, ensure_ascii=False, indent=2
        )
    )

    # 2 複数ファイルの読み込み
    bundle_words = bundle_load_JSON(sample_paths, schema_path)
    open(database_path, mode="w", encoding="utf-8").write(
        json.dumps(
            database_json.update(bundle_words), sort_keys=0, ensure_ascii=False, indent=2
        )
    )


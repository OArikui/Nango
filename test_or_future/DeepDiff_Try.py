from deepdiff import DeepDiff
from pprint import pprint

dict_base = {
    "dict_a": {
        "dictK0_a": "dictV0_a",
        "dictK1_a": "dictV1_a",
        "dictK2_a": "dictV2_a",
    },
    "arr_a": ["el0_a", "el1_a"],
}

old = {
    "dict_a": {
        "dictK0_o": "dictV0_a",
        "dictK1_a": "dictV1_a",
        "dictK2_a": "dictV2_a",
    },
    "arr_a": ["el0_a", "el1_a"],
}

new = {
    "dict_a": {
        "dictK0_n": "dictV0_a",
        "dictK1_a": "dictV1_a",
        "dictK2_a": "dictV2_a",
    },
    "arr_a": ["el0_a", "el1_a"],
}

pprint(DeepDiff(old, new, ignore_order=False))
"""
result
None
"""

from deepdiff import DeepDiff
from pprint import pprint

dict_base = {
    "dict_a": {"dictK_a": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

old = {
    "dict_o": {"dictK_a": "dictV_a"},
    "arr_o": ["el0_a", "el1_a"],
}

new = {
    "dict_n": {"dictK_a": "dictV_a"},
    "arr_n": ["el0_a", "el1_a"],
}

pprint(DeepDiff(old, new, ignore_order=False))
"""
result
{
    "values_changed": {
        "root": {
            "new_value": {
                "arr_n": ["el0_a", "el1_a"],
                "dict_n": {"dictK_a": "dictV_a"},
            },
            "old_value": {
                "arr_o": ["el0_a", "el1_a"],
                "dict_o": {"dictK_a": "dictV_a"},
            },
        }
    }
}
"""
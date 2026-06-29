from deepdiff import DeepDiff
from pprint import pprint

dict_base = {
    "dict_a": {"dictK_a": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

old = {
    "dict_a": {"dictK_o": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

new = {
    "dict_a": {"dictK_n": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

pprint(DeepDiff(old, new, ignore_order=False))
"""
result
{
    "values_changed": {
        "root['dict_a']": {
            "new_value": {"dictK_n": "dictV_a"},
            "old_value": {"dictK_o": "dictV_a"},
        }
    }
}
"""

from deepdiff import DeepDiff
from pprint import pprint

dict_base = {
    "dict_a": {"dictK_a": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

old = {
    "dict_a": {"dictK_a": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

new = {
    "dict_a": {"dictK_a": "dictV_a"},
    "arr_a": ["el0_a", "el1_a"],
}

pprint(DeepDiff(old, new, ignore_order=False))

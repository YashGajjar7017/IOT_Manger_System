"""
Register Comparison Tool
-------------------------
Loads two register-value files produced by modbus_poll.py and compares
them register-by-register, printing out every address where the values
differ.

Edit FILE_1 / FILE_2 below to point at whichever poll results you want
to compare.
"""

import json

# ======================= CONFIG =======================
FILE_1 = "registers_1.json"
FILE_2 = "registers_2.json"
# ========================================================


def load_registers(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    return data


def compare(data1, data2):
    start1, values1 = data1["start_register"], data1["values"]
    start2, values2 = data2["start_register"], data2["values"]

    if start1 != start2:
        print(f"Warning: start registers differ ({start1} vs {start2}).\n")

    differences = []
    
    if isinstance(values1, dict) and isinstance(values2, dict):
        all_keys = set(values1.keys()).union(set(values2.keys()))
        try:
            sorted_keys = sorted(all_keys, key=int)
        except ValueError:
            sorted_keys = sorted(all_keys)
            
        for k in sorted_keys:
            v1 = values1.get(k)
            v2 = values2.get(k)
            if v1 != v2:
                differences.append((k, v1, v2))
                
    elif isinstance(values1, list) and isinstance(values2, list):
        length = min(len(values1), len(values2))
        if len(values1) != len(values2):
            print(f"Warning: lists have different lengths ({len(values1)} vs {len(values2)}). "
                  f"Comparing only the first {length} entries.\n")

        for i in range(length):
            v1, v2 = values1[i], values2[i]
            if v1 != v2:
                address = start1 + i
                differences.append((address, v1, v2))
    else:
        print("Error: The values format in the two files do not match (one is list, one is dict).")

    return differences


def main():
    data1 = load_registers(FILE_1)
    data2 = load_registers(FILE_2)

    differences = compare(data1, data2)

    if not differences:
        print("No differences found. All register values match.")
        return

    print(f"Found {len(differences)} differing register(s):\n")
    print(f"{'Register':<10}{'File 1':<15}{'File 2':<15}")
    print("-" * 40)
    for address, v1, v2 in differences:
        print(f"{address:<10}{str(v1):<15}{str(v2):<15}  <-- DIFFERENT")


if __name__ == "__main__":
    main()

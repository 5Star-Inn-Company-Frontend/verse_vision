import os
import shutil

DATA_DIR = r"c:\Users\odeji\Documents\trae_projects\versevision\api\data\bibles"

# Mapping: "Current Filename" -> "New Acronym Filename"
# I will infer acronyms where obvious, and use standard ones.
RENAME_MAP = {
    "AMERICAN STANDARD VERSION.json": "asv.json",
    "AMPLIFIED BIBLE.json": "amp.json",
    "ANDERSON NEW TESTAMENT.json": "anderson.json",
    "ARAMAIC BIBLE IN PLAIN ENGLISH.json": "abpe.json",
    "BEREAN LITERAL BIBLE.json": "blb.json",
    "BEREAN STANDARD BIBLE.json": "bsb.json",
    "BRENTON SEPTUAGINT TRANSLATION.json": "brenton.json",
    "CATHOLIC PUBLIC DOMAIN VERSION.json": "cpdv.json",
    "CHRISTIAN STANDARD BIBLE.json": "csb.json",
    "CONTEMPORARY ENGLISH VERSION.json": "cev.json",
    "DOUAY-RHEIMS BIBLE.json": "drb.json",
    "ENGLISH REVISED VERSION.json": "erv.json",
    "ENGLISH STANDARD VERSION.json": "esv.json",
    "GOD'S WORD® TRANSLATION.json": "gw.json",
    "GODBEY NEW TESTAMENT.json": "godbey.json",
    "GOOD NEWS TRANSLATION.json": "gnt.json",
    "HAWEIS NEW TESTAMENT.json": "haweis.json",
    "HOLMAN CHRISTIAN STANDARD BIBLE.json": "hcsb.json",
    "INTERNATIONAL STANDARD VERSION.json": "isv.json",
    "JPS TANAKH 1917.json": "jps.json",
    "KING JAMES BIBLE.json": "kjv.json", 
    "kjv.json": "kjv_legacy.json", # avoid conflict, though likely redundant.
    "LAMSA BIBLE.json": "lamsa.json",
    "LEGACY STANDARD BIBLE.json": "lsb.json",
    "LITERAL STANDARD VERSION.json": "lsv.json",
    "MACE NEW TESTAMENT.json": "mace.json",
    "MAJORITY STANDARD BIBLE.json": "msb.json",
    "NASB 1977.json": "nasb1977.json",
    "NASB 1995.json": "nasb1995.json",
    "NET BIBLE.json": "net.json",
    "NEW AMERICAN BIBLE.json": "nab.json",
    "NEW AMERICAN STANDARD BIBLE.json": "nasb.json", # Usually refers to 2020 or latest if not specified year
    "NEW HEART ENGLISH BIBLE.json": "nheb.json",
    "NEW INTERNATIONAL VERSION.json": "niv.json",
    "NEW KING JAMES VERSION.json": "nkjv.json",
    "NEW LIVING TRANSLATION.json": "nlt.json",
    "NEW REVISED STANDARD VERSION.json": "nrsv.json",
    "PESHITTA HOLY BIBLE TRANSLATED.json": "peshitta.json",
    "SMITH'S LITERAL TRANSLATION.json": "slt.json",
    "WEBSTER'S BIBLE TRANSLATION.json": "wbt.json",
    "WEYMOUTH NEW TESTAMENT.json": "weymouth.json",
    "WORLD ENGLISH BIBLE.json": "web.json",
    "WORRELL NEW TESTAMENT.json": "worrell.json",
    "WORSLEY NEW TESTAMENT.json": "worsley.json",
    "YOUNG'S LITERAL TRANSLATION.json": "ylt.json"
}

def rename_files():
    # Check for conflict first (kjv.json)
    if os.path.exists(os.path.join(DATA_DIR, "kjv.json")) and os.path.exists(os.path.join(DATA_DIR, "KING JAMES BIBLE.json")):
        # The script map handles this: "kjv.json" -> "kjv_legacy.json", "KING JAMES BIBLE.json" -> "kjv.json"
        # But if we rename "kjv.json" to "kjv_legacy.json" FIRST, then "KING JAMES BIBLE.json" to "kjv.json", it works.
        # We need to process safe moves first.
        pass

    for old_name, new_name in RENAME_MAP.items():
        old_path = os.path.join(DATA_DIR, old_name)
        new_path = os.path.join(DATA_DIR, new_name)
        
        if os.path.exists(old_path):
            if os.path.exists(new_path) and old_name != new_name:
                print(f"Skipping {old_name} -> {new_name} (Target exists)")
                continue
                
            try:
                os.rename(old_path, new_path)
                print(f"Renamed: {old_name} -> {new_name}")
            except Exception as e:
                print(f"Error renaming {old_name}: {e}")
        else:
            print(f"Not found: {old_name}")

if __name__ == "__main__":
    rename_files()

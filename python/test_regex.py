
import re
import sys

def test_regex():
    # The proposed pattern
    # Added 'verses' to separator
    # Added \s* and (?:-|–|to) to range part
    pattern = r'\b((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:chapter|chap|ch)\.?)?\s+(\d+)(?:\s*(?:[:v,.]|\s+(?:verses|verse|v|vs|ver)\.?\s*|\s+)\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?)?\b'
    
    test_cases = [
        "John 3:16-20",
        "John 3:16 – 20",
        "John 3:16 to 20",
        "John 3:16–20",
        "John 3 verses 16–20",
        "John chapter 3 verses 16 to 20",
        "John 3.16",
        "John 3 vs 16",
        "John 3 v 16",
        "John 3 16",
        "2 Kings 5:10 to 15",
        "John 5: 2",
        "Genesis 1: 1 - 2"
    ]

    print(f"Testing Pattern: {pattern}\n")

    for text in test_cases:
        matches = re.findall(pattern, text, re.IGNORECASE)
        print(f"Input: '{text}'")
        if matches:
            for m in matches:
                # m is (Book, Chapter, VStart, VEnd)
                # Note: Groups might be slightly different depending on nesting, let's verify indices
                # Group 1: Book
                # Group 2: Chapter
                # Group 3: VStart
                # Group 4: VEnd
                print(f"  Match: {m}")
                book, chap, vstart, vend = m
                print(f"    Book: '{book.strip()}'")
                print(f"    Chap: '{chap}'")
                print(f"    VStart: '{vstart}'")
                print(f"    VEnd: '{vend}'")
        else:
            print("  NO MATCH")
        print("-" * 20)

if __name__ == "__main__":
    test_regex()

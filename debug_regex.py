
import re

def extract_references_sim(text):
    pattern = r'\b((?:[1-3]\s)?(?:[A-Za-z]+(?:\s[A-Za-z]+)*))(?:\s*,\s*|\s+)(?:chapter\s+)?(\d+)(?:\s*(?:[:v,]|\s+(?:verse|v)\s+|,\s*(?:verse|v)\s+|\s)\s*(\d+)(?:-(\d+))?)?\b'
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    print(f"Text: '{text}'")
    for match in matches:
        print(f"Match: {match}")
        book_candidate, chapter_num, verse_start, verse_end = match
        book_candidate = book_candidate.strip()
        print(f"  Raw Book: '{book_candidate}'")
        
        # Current logic
        if book_candidate.lower().startswith("the book of "):
            book_candidate = book_candidate[12:].strip()
        
        print(f"  Processed Book: '{book_candidate}'")

print("--- Test 1 ---")
extract_references_sim("To the book of John 3, 16, John.")

print("\n--- Test 2 ---")
extract_references_sim("Open to Genesis 1:1")


import re

def test_regex():
    # Simulate the regex in offline_server.py (before fix)
    # Original from file: pattern = r'\b((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:chapter|chap|ch)\.?)?\s+(\d+)(?:\s*(?:[:v,.]|\s+(?:verse|v|ver)\.?\s*|\s+)(\d+)(?:-(\d+))?)?\b'
    
    # We want to add 'vs' support
    
    inputs = [
        "John 3:16",
        "John 3 vs 16",
        "John 3 v 16",
        "John 3 verse 16",
        "John chapter 3 verse 16",
        "John 3",
        "John chapter 3"
    ]
    
    # Current Pattern (reconstructed from file content)
    current_pattern = r'\b((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:chapter|chap|ch)\.?)?\s+(\d+)(?:\s*(?:[:v,.]|\s+(?:verse|v|ver)\.?\s*|\s+)(\d+)(?:-(\d+))?)?\b'
    
    print("--- Testing Current Pattern ---")
    for text in inputs:
        matches = re.findall(current_pattern, text, re.IGNORECASE)
        print(f"'{text}': {matches}")

    # Proposed Pattern (adding 'vs')
    new_pattern = r'\b((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:chapter|chap|ch)\.?)?\s+(\d+)(?:\s*(?:[:v,.]|\s+(?:verse|v|vs|ver)\.?\s*|\s+)(\d+)(?:-(\d+))?)?\b'
    
    print("\n--- Testing New Pattern ---")
    for text in inputs:
        matches = re.findall(new_pattern, text, re.IGNORECASE)
        print(f"'{text}': {matches}")

if __name__ == "__main__":
    test_regex()

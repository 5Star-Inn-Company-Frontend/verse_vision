
import sys
import json
import os
import re
import requests
import difflib
from faster_whisper import WhisperModel

# Configuration
MODEL_SIZE = "base" # Reverted to base as small requires download and we are offline
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

BIBLE_CONFIG = {
    'kjv': {
        'url': 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
        'path': os.path.join(DATA_DIR, 'bible_kjv.json'),
        'name': 'King James Version'
    },
    'bbe': {
        'url': 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_bbe.json',
        'path': os.path.join(DATA_DIR, 'bible_bbe.json'),
        'name': 'Bible in Basic English'
    },
    'fr': {
        'url': 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/fr_apee.json',
        'path': os.path.join(DATA_DIR, 'bible_fr.json'),
        'name': 'French Bible (Epee)'
    }
}

# Globals
model = None
bible_versions = {}
default_version = 'kjv'

def load_whisper():
    global model
    print(f"Loading Whisper model ({MODEL_SIZE})...", file=sys.stderr)
    try:
        # Run on CPU with INT8 for compatibility/speed on average hardware
        model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print("Whisper model loaded.", file=sys.stderr)
    except Exception as e:
        print(f"Error loading Whisper: {e}", file=sys.stderr)

def load_bible():
    global bible_versions
    
    # Ensure data directory exists
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception as e:
        print(f"Error creating data directory: {e}", file=sys.stderr)

    for key, config in BIBLE_CONFIG.items():
        path = config['path']
        url = config['url']
        
        if not os.path.exists(path):
            print(f"Downloading {config['name']}...", file=sys.stderr)
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    with open(path, 'wb') as f:
                        f.write(response.content)
                    print(f"Downloaded {key}.", file=sys.stderr)
                else:
                    print(f"Failed to download {key}: {response.status_code}", file=sys.stderr)
                    continue
            except Exception as e:
                print(f"Error downloading {key}: {e}", file=sys.stderr)
                continue

        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                bible_versions[key] = data
            print(f"Loaded {config['name']} ({len(data)} books).", file=sys.stderr)
        except Exception as e:
            print(f"Error loading {key}: {e}", file=sys.stderr)

def transcribe(file_path):
    if not model:
        print("Error: Whisper model not loaded.", file=sys.stderr)
        return ""
    try:
        if not os.path.exists(file_path):
            print(f"Error: Audio file not found at {file_path}", file=sys.stderr)
            return ""
            
        file_size = os.path.getsize(file_path)
        print(f"Transcribing file: {file_path} (Size: {file_size} bytes)", file=sys.stderr)
        
        # Force English and lower beam_size for speed/stability on short audio
        # vad_filter=True helps ignore silence which causes "..." hallucinations
        # Relax VAD slightly to ensure we capture speech in short clips
        segments, info = model.transcribe(
            file_path, 
            beam_size=5, 
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        print(f"Detected language '{info.language}' with probability {info.language_probability}", file=sys.stderr)
        
        text_segments = []
        for segment in segments:
            print(f"Segment: {segment.start:.2f}s - {segment.end:.2f}s | Text: {segment.text}", file=sys.stderr)
            text_segments.append(segment.text)
            
        text = " ".join(text_segments)
        if not text.strip():
            print("WARNING: Transcription returned empty text. Audio might be silent or VAD filtered it out.", file=sys.stderr)
            
        print(f"Offline text '{text}'", file=sys.stderr)
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return ""

def find_book_fuzzy(name, version_key='kjv'):
    if version_key not in bible_versions:
        return None
        
    books = bible_versions[version_key]
    name_lower = name.lower().strip()
    
    # 1. Exact match (fast)
    for book in books:
        if book['name'].lower() == name_lower:
            return book
            
    # 2. Starts with (common for abbreviations like "Gen")
    for book in books:
        if book['name'].lower().startswith(name_lower):
            return book
            
    # 3. Fuzzy match (using difflib)
    # Collect all book names
    book_names = [b['name'] for b in books]
    # Get closest match
    matches = difflib.get_close_matches(name, book_names, n=1, cutoff=0.6)
    
    if matches:
        match_name = matches[0]
        # Find the book object again
        for book in books:
            if book['name'] == match_name:
                print(f"Fuzzy match: '{name}' -> '{match_name}'", file=sys.stderr)
                return book
                
    return None

def extract_references(text):
    # Detect version switch request
    target_version = default_version
    
    version_patterns = {
        'kjv': [r'\bkjv\b', r'\bking james\b'],
        'bbe': [r'\bbbe\b', r'\bbasic english\b'],
        'fr': [r'\bfrench\b', r'\bfrançais\b', r'\bfrancais\b']
    }
    
    for v_key, patterns in version_patterns.items():
        for p in patterns:
            # Check if p is a list (should be a regex string from above, but I iterated values)
            # patterns is the list of regexes
            if re.search(p, text, re.IGNORECASE):
                target_version = v_key
                print(f"Detected version switch to: {target_version}", file=sys.stderr)
                break
    
    # Improved Regex:
    # Matches: "John 3:16", "1 John 3 16", "Song of Solomon 2 verse 4", "Genesis Chapter 1 v 1"
    # Group 1: Book Name (allow spaces)
    # Group 2: Chapter
    # Group 3: Verse Start
    # Group 4: Verse End (Optional)
    pattern = r'\b((?:[1-3]\s)?(?:[A-Za-z]+(?:\s[A-Za-z]+)*))\s+(?:chapter\s+)?(\d+)\s*(?:[:v]|\s+verse\s+|\s)\s*(\d+)(?:-(\d+))?\b'
    
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    print(f"Detecting references in: '{text}' found {len(matches)} matches (Version: {target_version})", file=sys.stderr)
    
    results = []
    for match in matches:
        book_candidate, chapter_num, verse_start, verse_end = match
        book_candidate = book_candidate.strip()
        
        # Heuristic to skip common non-book words that match the pattern (e.g. "Page 1 2")
        if book_candidate.lower() in ['page', 'chapter', 'verse', 'number', 'item', 'part', 'section']:
            continue
            
        book = find_book_fuzzy(book_candidate, target_version)
        if not book:
            continue
            
        chapter_idx = int(chapter_num) - 1
        if chapter_idx < 0 or chapter_idx >= len(book['chapters']):
            continue
            
        chapter = book['chapters'][chapter_idx]
        
        start = int(verse_start) - 1
        end = int(verse_end) if verse_end else start + 1
        
        verses_text = []
        if start < 0: start = 0
        
        try:
            current_chapter = chapter # List of verses
            for i in range(start, end):
                if i < len(current_chapter):
                    verses_text.append(current_chapter[i])
        except Exception as e:
            print(f"Error retrieving verses: {e}", file=sys.stderr)
            continue
            
        if verses_text:
            ref_string = f"{book['name']} {chapter_num}:{verse_start}"
            if verse_end:
                ref_string += f"-{verse_end}"
            
            results.append({
                "reference": ref_string,
                "text": " ".join(verses_text),
                "translation": target_version.upper()
            })
            
    return results

def main():
    print("Initializing Offline AI Service...", file=sys.stderr)
    load_whisper()
    load_bible()
    print("Offline AI Service Ready.", file=sys.stderr)
    
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            command = data.get('command')
            
            response = {}
            
            if command == 'transcribe':
                path = data.get('path')
                if path and os.path.exists(path):
                    text = transcribe(path)
                    response = {'text': text}
                else:
                    response = {'error': 'File not found'}
                    
            elif command == 'detect':
                text = data.get('text', '')
                refs = extract_references(text)
                response = {'references': refs}
                
            else:
                response = {'error': 'Unknown command'}
            
            print(json.dumps(response))
            sys.stdout.flush()
            
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON'}), file=sys.stderr)
        except Exception as e:
            print(json.dumps({'error': str(e)}), file=sys.stderr)

if __name__ == "__main__":
    main()

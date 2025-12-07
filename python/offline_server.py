
import sys
import json
import os
import re
import requests
from faster_whisper import WhisperModel

# Configuration
MODEL_SIZE = "base" # Reverted to base as small requires download and we are offline
BIBLE_JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "bible_kjv.json")
BIBLE_URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json"

# Globals
model = None
bible_data = []

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
    global bible_data
    if not os.path.exists(BIBLE_JSON_PATH):
        print("Downloading KJV Bible database...", file=sys.stderr)
        try:
            os.makedirs(os.path.dirname(BIBLE_JSON_PATH), exist_ok=True)
            response = requests.get(BIBLE_URL)
            if response.status_code == 200:
                with open(BIBLE_JSON_PATH, 'wb') as f:
                    f.write(response.content)
                print("Bible database downloaded.", file=sys.stderr)
            else:
                print(f"Failed to download Bible: {response.status_code}", file=sys.stderr)
                return
        except Exception as e:
            print(f"Error downloading Bible: {e}", file=sys.stderr)
            return

    try:
        with open(BIBLE_JSON_PATH, 'r', encoding='utf-8-sig') as f:
            bible_data = json.load(f)
        print(f"Bible database loaded ({len(bible_data)} books).", file=sys.stderr)
    except Exception as e:
        print(f"Error loading Bible JSON: {e}", file=sys.stderr)

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
            vad_parameters=dict(min_silence_duration_ms=1000)
        )
        
        print(f"Detected language '{info.language}' with probability {info.language_probability}", file=sys.stderr)
        
        text_segments = []
        for segment in segments:
            print(f"Segment: {segment.start:.2f}s - {segment.end:.2f}s | Text: {segment.text}", file=sys.stderr)
            text_segments.append(segment.text)
            
        text = " ".join(text_segments)
        print(f"Offline text '{text}'", file=sys.stderr)
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return ""

def find_book(name):
    # Simple fuzzy-ish match: startswith or exact
    name_lower = name.lower()
    for book in bible_data:
        if book['name'].lower() == name_lower or book['name'].lower().startswith(name_lower):
            return book
        # Handle common abbreviations could go here
    return None

def extract_references(text):
    # Regex for "Book Chapter:Verse", "Book Chapter Verse", "Book Chapter v Verse", "Book Chapter verse Verse"
    # Example: "John 3:16", "Genesis 1 1", "Genesis 1 verse 1", "John 3 v 16"
    # Group 1: Book (e.g., "John", "1 Peter")
    # Group 2: Chapter
    # Group 3: Verse Start
    # Group 4: Verse End (Optional)
    pattern = r'\b([1-3]?\s?[A-Za-z]+)\s+(\d+)(?:\s*[:v]|\s+verse\s+|\s)(\d+)(?:-(\d+))?\b'
    
    # Case insensitive search
    matches = re.findall(pattern, text, re.IGNORECASE)
    
    print(f"Detecting references in: '{text}' found {len(matches)} matches", file=sys.stderr)
    
    results = []
    for match in matches:
        book_name, chapter_num, verse_start, verse_end = match
        book = find_book(book_name.strip())
        if not book:
            continue
            
        chapter_idx = int(chapter_num) - 1
        if chapter_idx < 0 or chapter_idx >= len(book['chapters']):
            continue
            
        chapter = book['chapters'][chapter_idx]
        
        start = int(verse_start) - 1
        end = int(verse_end) if verse_end else start + 1
        
        # Adjust for 0-based index vs 1-based verse numbers
        # The JSON structure usually is chapters -> array of verses (strings)
        # Verify JSON structure: usually chapters is array of array of strings?
        # Let's assume structure from thiagobodruk/bible:
        # [ { "abbrev": "gn", "chapters": [ [ "In the beginning...", ... ], ... ], "name": "Genesis" }, ... ]
        
        verses_text = []
        if start < 0: start = 0
        
        # Handle verse retrieval
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
                "translation": "KJV"
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

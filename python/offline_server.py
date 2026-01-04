
import sys
import json
import os
import re
import difflib

# Configuration
MODEL_SIZE = "base" # Reverted to base as small requires download and we are offline

if getattr(sys, 'frozen', False):
    # If frozen with PyInstaller, use the internal directory (sys._MEIPASS)
    # This works for both onefile and onedir (pointing to _internal in onedir)
    BASE_DIR = sys._MEIPASS
    DATA_DIR = os.path.join(BASE_DIR, "bibles_data")
else:
    # Otherwise use the script's directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "..", "api", "data", "bibles")

# Metadata for display/logging
VERSION_METADATA = {
    'asv': 'American Standard Version',
    'amp': 'Amplified Bible',
    'anderson': 'Anderson New Testament',
    'abpe': 'Aramaic Bible in Plain English',
    'blb': 'Berean Literal Bible',
    'bsb': 'Berean Standard Bible',
    'brenton': 'Brenton Septuagint Translation',
    'cpdv': 'Catholic Public Domain Version',
    'csb': 'Christian Standard Bible',
    'cev': 'Contemporary English Version',
    'drb': 'Douay-Rheims Bible',
    'erv': 'English Revised Version',
    'esv': 'English Standard Version',
    'gw': 'God\'s Word Translation',
    'godbey': 'Godbey New Testament',
    'gnt': 'Good News Translation',
    'haweis': 'Haweis New Testament',
    'hcsb': 'Holman Christian Standard Bible',
    'isv': 'International Standard Version',
    'jps': 'JPS Tanakh 1917',
    'kjv': 'King James Version',
    'kjv_legacy': 'KJV (Legacy Structure)',
    'lamsa': 'Lamsa Bible',
    'lsb': 'Legacy Standard Bible',
    'lsv': 'Literal Standard Version',
    'mace': 'Mace New Testament',
    'msb': 'Majority Standard Bible',
    'nasb1977': 'NASB 1977',
    'nasb1995': 'NASB 1995',
    'net': 'NET Bible',
    'nab': 'New American Bible',
    'nasb': 'New American Standard Bible',
    'nheb': 'New Heart English Bible',
    'niv': 'New International Version',
    'nkjv': 'New King James Version',
    'nlt': 'New Living Translation',
    'nrsv': 'New Revised Standard Version',
    'peshitta': 'Peshitta Holy Bible',
    'slt': 'Smith\'s Literal Translation',
    'wbt': 'Webster\'s Bible Translation',
    'weymouth': 'Weymouth New Testament',
    'web': 'World English Bible',
    'worrell': 'Worrell New Testament',
    'worsley': 'Worsley New Testament',
    'ylt': 'Young\'s Literal Translation'
}

# Globals
model = None
bible_versions = {}
default_version = 'kjv'

# --- Nigerian Localization Constants ---

NIGERIAN_BOOK_ALIASES = {
    # Common Nigerian pronunciations & mis-transcriptions
    'joan': 'John', 'jorn': 'John', 'jon': 'John',
    'sams': 'Psalms', 'salms': 'Psalms', 'sam': 'Psalms', 'psalm': 'Psalms',
    'gen': 'Genesis', 'jenesis': 'Genesis',
    'ex': 'Exodus', 'exodu': 'Exodus',
    'lev': 'Leviticus',
    'num': 'Numbers', 'numba': 'Numbers',
    'deut': 'Deuteronomy', 'dat': 'Deuteronomy',
    'josh': 'Joshua',
    'judge': 'Judges',
    'rut': 'Ruth',
    'first sam': '1 Samuel', '1st sam': '1 Samuel',
    'second sam': '2 Samuel', '2nd sam': '2 Samuel',
    'first king': '1 Kings', '1st king': '1 Kings',
    'second king': '2 Kings', '2nd king': '2 Kings',
    'first cron': '1 Chronicles', '1st cron': '1 Chronicles',
    'second cron': '2 Chronicles', '2nd cron': '2 Chronicles',
    'esra': 'Ezra',
    'nehemia': 'Nehemiah',
    'esta': 'Esther',
    'prov': 'Proverbs',
    'eccl': 'Ecclesiastes', 'eclesiastis': 'Ecclesiastes', 'ecl': 'Ecclesiastes',
    'song of solomon': 'Song of Solomon', 'songs': 'Song of Solomon', 'song of songs': 'Song of Solomon',
    'isa': 'Isaiah', 'isaiah': 'Isaiah', 'aish': 'Isaiah',
    'jer': 'Jeremiah', 'jeremia': 'Jeremiah',
    'lam': 'Lamentations',
    'ezek': 'Ezekiel', 'e-zekiel': 'Ezekiel',
    'dan': 'Daniel',
    'hos': 'Hosea',
    'joel': 'Joel',
    'amos': 'Amos', 'a-mos': 'Amos',
    'obad': 'Obadiah',
    'jona': 'Jonah',
    'mica': 'Micah',
    'nahum': 'Nahum',
    'hab': 'Habakkuk',
    'zeph': 'Zephaniah',
    'hag': 'Haggai',
    'zech': 'Zechariah',
    'mal': 'Malachi',
    'mat': 'Matthew', 'mathew': 'Matthew', 'matt': 'Matthew',
    'mak': 'Mark',
    'luk': 'Luke',
    'act': 'Acts', 'ax': 'Acts', 'acts': 'Acts',
    'rom': 'Romans',
    'first cor': '1 Corinthians', '1st cor': '1 Corinthians',
    'second cor': '2 Corinthians', '2nd cor': '2 Corinthians',
    'gal': 'Galatians',
    'eph': 'Ephesians', 'efesian': 'Ephesians',
    'phil': 'Philippians', # Context-dependent, default to Philippians over Philemon for short match
    'col': 'Colossians',
    'thess': 'Thessalonians', 'tess': 'Thessalonians', 'tessalonians': 'Thessalonians',
    'first thess': '1 Thessalonians', '1st thess': '1 Thessalonians',
    'second thess': '2 Thessalonians', '2nd thess': '2 Thessalonians',
    'first tim': '1 Timothy', '1st tim': '1 Timothy',
    'second tim': '2 Timothy', '2nd tim': '2 Timothy',
    'tit': 'Titus',
    'philemon': 'Philemon',
    'heb': 'Hebrews', 'ebrews': 'Hebrews', 'hebrews': 'Hebrews',
    'jam': 'James',
    'first pet': '1 Peter', '1st pet': '1 Peter',
    'second pet': '2 Peter', '2nd pet': '2 Peter',
    'first jon': '1 John', '1st jon': '1 John', 'first john': '1 John',
    'second jon': '2 John', '2nd jon': '2 John', 'second john': '2 John',
    'third jon': '3 John', '3rd jon': '3 John', 'third john': '3 John',
    'jude': 'Jude', 'jud': 'Jude',
    'rev': 'Revelation', 'revelations': 'Revelation'
}

PIDGIN_TRIGGERS = [
    "make we read", "make we open", "open am for", "open to", 
    "turn to", "check", "read from", "inside the book of", "book of",
    "open your bible to", "let us", "please", "turn with me to"
]

NUMBER_WORDS = {
    'one': 1, 'first': 1, 'two': 2, 'second': 2, 'three': 3, 'third': 3,
    'four': 4, 'fourth': 4, 'five': 5, 'fifth': 5, 'six': 6, 'sixth': 6,
    'seven': 7, 'seventh': 7, 'eight': 8, 'eighth': 8, 'nine': 9, 'ninth': 9,
    'ten': 10, 'tenth': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
    'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100
}

def load_whisper():
    global model
    print(f"Loading Whisper model ({MODEL_SIZE})...", file=sys.stderr)
    sys.stderr.flush()
    try:
        from faster_whisper import WhisperModel, download_model
        
        # Check for bundled model
        bundled_model_path = os.path.join(BASE_DIR, "models", f"whisper-{MODEL_SIZE}")
        
        if os.path.exists(bundled_model_path):
             print(f"Found bundled model at: {bundled_model_path}", file=sys.stderr)
             model_path = bundled_model_path
        else:
            print("Checking/Downloading Whisper model...", file=sys.stderr)
            sys.stderr.flush()
            # Download explicitly to ensure we have the path and can debug
            model_path = download_model(MODEL_SIZE)
            
        print(f"Model path: {model_path}", file=sys.stderr)
        sys.stderr.flush()
        
        print("Initializing Whisper engine...", file=sys.stderr)
        sys.stderr.flush()
        
        # Run on CPU with INT8 for compatibility/speed on average hardware
        # Fallback to float32 if int8 fails (common on some Mac/CPU configs)
        try:
            model = WhisperModel(model_path, device="cpu", compute_type="int8")
        except Exception as e:
            print(f"Warning: INT8 loading failed ({e}), falling back to float32...", file=sys.stderr)
            sys.stderr.flush()
            model = WhisperModel(model_path, device="cpu", compute_type="float32")
            
        print("Whisper model loaded.", file=sys.stderr)
        sys.stderr.flush()
    except Exception as e:
        print(f"Error loading Whisper: {e}", file=sys.stderr)
        sys.stderr.flush()

def normalize_bible_data(data):
    """
    Normalizes Bible JSON data into a standard list-of-books format.
    Standard Format: [{'name': 'Genesis', 'chapters': [['v1', 'v2'], ['v1', ...]]}]
    """
    # Check if it's already in list format (legacy/github format)
    if isinstance(data, list):
        return data
    
    # New format: {"Book": {"1": {"1": "Text"}}}
    if isinstance(data, dict):
        books = []
        # Sort books? The dict might not be ordered, but we usually want Genesis first.
        # We can try to use a standard book order if available, or trust the dict iteration.
        # Given we don't have a book order list handy in this script, we'll trust the source or insertion order.
        
        for book_name, chapters_data in data.items():
            book = {'name': book_name, 'chapters': []}
            
            # Handle chapters
            try:
                # keys are strings "1", "2", etc.
                sorted_chap_nums = sorted([int(k) for k in chapters_data.keys()])
            except:
                continue 
                
            for chap_num in sorted_chap_nums:
                verses_data = chapters_data.get(str(chap_num), {})
                # verses keys "1", "2"
                try:
                    sorted_verse_nums = sorted([int(k) for k in verses_data.keys()])
                except:
                    sorted_verse_nums = []
                
                if not sorted_verse_nums:
                    book['chapters'].append([])
                    continue
                    
                max_verse = sorted_verse_nums[-1]
                # Initialize with empty strings
                chapter_verses = [""] * max_verse
                
                for v_num in sorted_verse_nums:
                    text = verses_data.get(str(v_num), "")
                    if v_num - 1 < len(chapter_verses):
                        chapter_verses[v_num - 1] = text
                
                book['chapters'].append(chapter_verses)
            
            books.append(book)
        return books
    return []

def load_bible():
    global bible_versions
    
    # Ensure data directory exists
    if not os.path.exists(DATA_DIR):
        print(f"Data directory not found: {DATA_DIR}", file=sys.stderr)
        return

    # Scan for JSON files
    try:
        files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    except Exception as e:
        print(f"Error listing data directory: {e}", file=sys.stderr)
        return

    for filename in files:
        # Determine key from filename (acronym)
        key = filename.replace('.json', '').lower().replace(' ', '_')
            
        path = os.path.join(DATA_DIR, filename)
        
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                data = json.load(f)
                
            normalized_data = normalize_bible_data(data)
            if normalized_data:
                bible_versions[key] = normalized_data
                name = VERSION_METADATA.get(key, key.replace('_', ' ').title())
                print(f"Loaded {name} ({key}) - {len(normalized_data)} books.", file=sys.stderr)
            else:
                print(f"Failed to normalize {filename}", file=sys.stderr)
                
        except Exception as e:
            print(f"Error loading {filename}: {e}", file=sys.stderr)

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
            vad_parameters=dict(min_silence_duration_ms=500),
            initial_prompt="The following is a church service recording containing Bible verses, scripture readings, and sermons. Words like God, Jesus, Chapter, Verse, Genesis, Revelation, and other biblical terms are expected.",
            condition_on_previous_text=False
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

# --- Improved Reference Extraction Logic ---

def convert_spoken_numbers(text):
    """
    Converts spoken numbers to digits (e.g., "twenty three" -> "23").
    Basic implementation for common Bible numbers (1-150).
    """
    words = text.lower().split()
    new_words = []
    i = 0
    while i < len(words):
        word = words[i]
        # Check for single word numbers
        if word in NUMBER_WORDS:
            val = NUMBER_WORDS[word]
            
            # Look ahead logic
            current_val = val
            consumed = 0
            
            # Handle "one hundred", "two hundred" (or just "hundred" if preceding is number)
            # Actually, our map has 'hundred': 100. 
            # If word is 'hundred', we might need to multiply previous?
            # Simpler logic: If current is 'hundred' and previous was a number, this is complex in one pass.
            # Let's stick to forward lookahead.
            
            if i + 1 < len(words) and words[i+1] == 'hundred':
                current_val *= 100
                consumed += 1
                
                # Handle "one hundred fifty"
                if i + 2 < len(words) and words[i+2] in NUMBER_WORDS:
                     next_val = NUMBER_WORDS[words[i+2]]
                     current_val += next_val
                     consumed += 1
                     
                     # Handle "one hundred fifty three"
                     if i + 3 < len(words) and words[i+3] in NUMBER_WORDS:
                         next_next = NUMBER_WORDS[words[i+3]]
                         current_val += next_next
                         consumed += 1
            
            # Handle "twenty three" (if not hundred)
            elif i + 1 < len(words) and words[i+1] in NUMBER_WORDS:
                 next_val = NUMBER_WORDS[words[i+1]]
                 # Only combine if logically sound (e.g. 20 + 3 = 23)
                 if val >= 20 and next_val < 10:
                     current_val += next_val
                     consumed += 1
            
            new_words.append(str(current_val))
            i += 1 + consumed
        else:
            new_words.append(word)
            i += 1
    return " ".join(new_words)

def normalize_book_name(name):
    """
    Normalizes a book name using Nigerian aliases and common variations.
    """
    clean = name.lower().strip()
    # Direct alias lookup
    if clean in NIGERIAN_BOOK_ALIASES:
        return NIGERIAN_BOOK_ALIASES[clean]
    
    # Handle "First/Second" prefixes explicitly if not caught by alias
    clean = clean.replace("first ", "1 ").replace("second ", "2 ").replace("third ", "3 ")
    
    return clean

def find_book_optimized(name, version_key='kjv'):
    if version_key not in bible_versions:
        return None, 0.0 # Return tuple (book, confidence)
        
    books = bible_versions[version_key]
    normalized_input = normalize_book_name(name)
    normalized_input_lower = normalized_input.lower()
    
    # 1. Exact match on canonical name
    for book in books:
        if book['name'].lower() == normalized_input_lower:
            return book, 1.0
            
    # 2. Starts with (e.g. "Gen" -> "Genesis") - High confidence if > 3 chars
    for book in books:
        if book['name'].lower().startswith(normalized_input_lower) and len(normalized_input) >= 3:
            return book, 0.9
            
    # 3. Fuzzy match
    book_names = [b['name'] for b in books]
    matches = difflib.get_close_matches(normalized_input, book_names, n=1, cutoff=0.6)
    
    if matches:
        match_name = matches[0]
        confidence = 0.7 if difflib.SequenceMatcher(None, normalized_input, match_name).ratio() > 0.8 else 0.5
        for book in books:
            if book['name'] == match_name:
                return book, confidence
                
    return None, 0.0

def extract_references(text):
    # Detect version switch
    target_version = default_version
    version_patterns = {
        'kjv': [r'\bkjv\b', r'\bking james\b'],
        'bbe': [r'\bbbe\b', r'\bbasic english\b'],
        'fr': [r'\bfrench\b', r'\bfrançais\b', r'\bfrancais\b'],
        'niv': [r'\bniv\b', r'\bnew international\b'],
        'nlt': [r'\bnlt\b', r'\bnew living\b'],
        'esv': [r'\besv\b', r'\benglish standard\b'],
        'nkjv': [r'\bnkjv\b', r'\bnew king james\b'],
        'nasb': [r'\bnasb\b', r'\bnew american standard\b'],
        'amp': [r'\bamp\b', r'\bamplified\b'],
        'msg': [r'\bmsg\b', r'\bmessage\b'],
        'csb': [r'\bcsb\b', r'\bchristian standard\b'],
        'gnt': [r'\bgnt\b', r'\bgood news\b'],
        'cev': [r'\bcev\b', r'\bcontemporary english\b'],
        'gw': [r'\bgw\b', r'\bgod\'?s word\b'],
        'web': [r'\bweb\b', r'\bworld english\b'],
        'ylt': [r'\bylt\b', r'\byoung\'?s literal\b']
    }
    
    for v_key, patterns in version_patterns.items():
        for p in patterns:
            if re.search(p, text, re.IGNORECASE):
                target_version = v_key
                break

    # Pre-process text
    # 1. Convert spoken numbers to digits
    processed_text = convert_spoken_numbers(text)
    
    # 2. Normalize "Chapter" and "Verse" keywords
    # Handle "Chapter 3 Verse 16", "Chapter 3:16", "3:16", "3 16"
    
    # Regex Strategy:
    # Capture Group 1: Book Name (Words before digits)
    # Capture Group 2: Chapter Number
    # Capture Group 3: Verse Number (Optional)
    
    # We use a broad pattern first, then validate
    # Pattern: [Words...] [Digits] [: or v or space] [Digits]
    
    # Improved Regex for Nigerian/Sermon Context:
    # Tolerates: "Open to John 3 16", "John Chapter 3 Verse 16", "John 3"
    # Added support for dot notation: "John 3.16"
    # Added support for "vs" separator: "John 3 vs 16"
    # Added support for ranges: "John 3:16-20", "John 3:16 to 20", "John 3:16–20", "John 3 verses 16-20"
    
    pattern = r'\b((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*?)(?:\s+(?:chapter|chap|ch)\.?)?\s+(\d+)(?:\s*(?:[:v,.]|\s+(?:verses|verse|v|vs|ver)\.?\s*|\s+)\s*(\d+)(?:\s*(?:-|–|to)\s*(\d+))?)?\b'
    
    matches = re.findall(pattern, processed_text, re.IGNORECASE)
    
    print(f"Raw Matches: {matches}", file=sys.stderr)
    
    results = []
    seen_refs = set() # Avoid duplicates
    
    for match in matches:
        book_candidate, chapter_num, verse_start, verse_end = match
        book_candidate = book_candidate.strip()
        
        # Cleanup Trigger Words (Pidgin/English)
        lower_cand = book_candidate.lower()
        
        # Remove common prefixes iteratively
        for trigger in PIDGIN_TRIGGERS + ["the book of", "reading from"]:
            if trigger in lower_cand:
                # Split and take the last part if trigger is found
                # e.g. "open to john" -> "john"
                parts = lower_cand.split(trigger)
                book_candidate = parts[-1].strip()
                break # Only strip once
                
        # Skip noise words that might look like books
        if len(book_candidate) < 2 or book_candidate.lower() in ['page', 'number', 'item', 'part', 'verse', 'chapter']:
            continue

        # Find book with confidence
        book, confidence = find_book_optimized(book_candidate, target_version)
        
        if not book:
            continue
            
        # Confidence Filtering
        # If we have Verse, we accept lower confidence on book name (context implies bible ref)
        # If we only have Chapter, we need higher confidence on book name
        threshold = 0.5 if verse_start else 0.8
        
        if confidence < threshold:
            print(f"Skipping low confidence match: {book_candidate} -> {book['name']} ({confidence})", file=sys.stderr)
            continue

        try:
            chapter_idx = int(chapter_num) - 1
            if chapter_idx < 0 or chapter_idx >= len(book['chapters']):
                continue
                
            chapter = book['chapters'][chapter_idx]
            
            if verse_start:
                start = int(verse_start) - 1
                end = int(verse_end) if verse_end else start + 1
            else:
                start = 0
                end = len(chapter)
            
            verses_text = []
            if start < 0: start = 0
            
            current_chapter = chapter
            for i in range(start, end):
                if i < len(current_chapter):
                    verses_text.append(current_chapter[i])
            
            if verses_text:
                ref_string = f"{book['name']} {chapter_num}"
                if verse_start:
                    ref_string += f":{verse_start}"
                    if verse_end:
                        ref_string += f"-{verse_end}"
                
                # Deduplicate
                if ref_string in seen_refs:
                    continue
                seen_refs.add(ref_string)

                results.append({
                    "reference": ref_string,
                    "text": " ".join(verses_text),
                    "translation": target_version.upper(),
                    "confidence": confidence
                })
                
        except Exception as e:
            print(f"Error processing match: {e}", file=sys.stderr)
            continue
            
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

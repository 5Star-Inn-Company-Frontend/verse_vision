import sys
import json
import os
import ctranslate2
import sentencepiece as spm

# Configuration for models
# We expect models to be in ../models/marian-{key} relative to this script
# Or in a specific bundled path

if getattr(sys, 'frozen', False):
    # If frozen with PyInstaller, use the internal directory (sys._MEIPASS)
    BASE_DIR = sys._MEIPASS
    MODELS_DIR = os.path.join(BASE_DIR, "models")
else:
    # Otherwise use the script's directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    MODELS_DIR = os.path.join(BASE_DIR, "models")

MODEL_CONFIG = {
    'fr': 'marian-fr',
    'multi': 'marian-multi'
}

# Language mapping
LANG_MAP = {
    'fr': {'model': 'fr', 'code': None},
    'yo': {'model': 'multi', 'code': '>>yor<<'},
    'ha': {'model': 'multi', 'code': '>>hau_Latn<<'},
    'ig': {'model': 'multi', 'code': '>>ibo<<'}
}

loaded_translators = {}
loaded_tokenizers = {}

def load_model(key, folder_name):
    model_path = os.path.join(MODELS_DIR, folder_name)
    if not os.path.exists(model_path):
        print(f"Model path not found: {model_path}", file=sys.stderr)
        return

    print(f"Loading model {key} from {model_path}...", file=sys.stderr)
    try:
        # Load CTranslate2 Translator
        translator = ctranslate2.Translator(model_path, device="cpu")
        loaded_translators[key] = translator
        
        # Load SentencePiece model
        # Try source.spm first
        sp_path = os.path.join(model_path, "source.spm")
        if not os.path.exists(sp_path):
             # Fallback to spiece.model (common name)
             sp_path = os.path.join(model_path, "spiece.model")
        
        if os.path.exists(sp_path):
            sp = spm.SentencePieceProcessor(sp_path)
            loaded_tokenizers[key] = sp
            print(f"Model {key} loaded successfully.", file=sys.stderr)
        else:
            print(f"Tokenizer not found for {key} at {sp_path}", file=sys.stderr)

    except Exception as e:
        print(f"Error loading model {key}: {e}", file=sys.stderr)

def translate(text, lang_code):
    config = LANG_MAP.get(lang_code)
    if not config:
        return text
    
    model_key = config['model']
    if model_key not in loaded_translators:
        return text
    
    translator = loaded_translators[model_key]
    sp = loaded_tokenizers.get(model_key)
    
    if not sp:
        return text

    try:
        # Tokenize text
        tokens = sp.encode(text, out_type=str)
        
        # Prepend language token if needed
        # We insert the token directly into the list so SentencePiece doesn't split it
        if config['code']:
            tokens.insert(0, config['code'])
            
        # Append EOS token (crucial for Marian models to stop generation)
        tokens.append("</s>")
        
        # Translate
        # beam_size=5 is standard for good quality
        results = translator.translate_batch([tokens], beam_size=5)
        
        # Detokenize
        output_tokens = results[0].hypotheses[0]
        output_text = sp.decode(output_tokens)
        
        return output_text
    except Exception as e:
        print(f"Translation error for {lang_code}: {e}", file=sys.stderr)
        return text

def main():
    print("Initializing MarianMT Service (CTranslate2)...", file=sys.stderr)
    
    # Load models
    for key, folder in MODEL_CONFIG.items():
        load_model(key, folder)
        
    print("Ready to accept requests.", file=sys.stderr)
    
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            text = data.get('text', '')
            
            response = {
                'Yoruba': translate(text, 'yo'),
                'Hausa': translate(text, 'ha'),
                'Igbo': translate(text, 'ig'),
                'French': translate(text, 'fr')
            }
            
            print(json.dumps(response))
            sys.stdout.flush()
        except Exception as e:
            print(f"Error processing request: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()

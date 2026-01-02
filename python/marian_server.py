import sys
import json

try:
    import torch
    from transformers import MarianMTModel, MarianTokenizer
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False
    print("MarianMT dependencies (torch/transformers) not found. Translation will be disabled.", file=sys.stderr)

# Configuration for models
MODEL_CONFIG = {
    'fr': 'Helsinki-NLP/opus-mt-en-fr',
    'multi': 'Helsinki-NLP/opus-mt-en-mul'
}

# Language mapping to model keys and target tokens
LANG_MAP = {
    'fr': {'model': 'fr', 'code': None},
    'yo': {'model': 'multi', 'code': '>>yor<<'},
    'ha': {'model': 'multi', 'code': '>>hau_Latn<<'},
    'ig': {'model': 'multi', 'code': '>>ibo<<'}
}

loaded_models = {}
loaded_tokenizers = {}

def load_model(key, model_name):
    if not HAS_DEPS:
        return
    print(f"Loading model {key}: {model_name}...", file=sys.stderr)
    try:
        tokenizer = MarianTokenizer.from_pretrained(model_name)
        model = MarianMTModel.from_pretrained(model_name)
        loaded_tokenizers[key] = tokenizer
        loaded_models[key] = model
        print(f"Model {key} loaded.", file=sys.stderr)
    except Exception as e:
        print(f"Error loading model {key}: {e}", file=sys.stderr)

def translate(text, lang_code):
    if not HAS_DEPS:
        return text
        
    config = LANG_MAP.get(lang_code)
    if not config:
        return text # Unknown language

    model_key = config['model']
    if model_key not in loaded_models:
        # Try to load on demand if not loaded (though we load all at start)
        load_model(model_key, MODEL_CONFIG[model_key])
    
    if model_key not in loaded_models:
        return text # Failed to load

    tokenizer = loaded_tokenizers[model_key]
    model = loaded_models[model_key]
    
    # Prepare text with target language token if needed
    input_text = text
    if config['code']:
        # For multilingual models, we usually prepend the target language token
        # Check if tokenizer expects it. MarianTokenizer usually does for mul.
        # But opus-mt-en-mul might need it.
        # Format: ">>yo<< Hello world"
        input_text = f"{config['code']} {text}"

    try:
        batch = tokenizer([input_text], return_tensors="pt", padding=True)
        gen = model.generate(**batch)
        result = tokenizer.batch_decode(gen, skip_special_tokens=True)[0]
        return result
    except Exception as e:
        print(f"Translation error for {lang_code}: {e}", file=sys.stderr)
        return text

def main():
    print("Initializing MarianMT Service...", file=sys.stderr)
    print(f"Configuration: {json.dumps(LANG_MAP)}", file=sys.stderr)
    
    # Pre-load models
    for key, name in MODEL_CONFIG.items():
        load_model(key, name)
    
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
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON'}), file=sys.stderr)
        except Exception as e:
            print(json.dumps({'error': str(e)}), file=sys.stderr)

if __name__ == "__main__":
    main()

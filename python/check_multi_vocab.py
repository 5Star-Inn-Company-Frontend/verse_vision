import json
import sentencepiece as spm
import os

try:
    print("--- Checking Marian Multi Vocab ---")
    model_path = "python/models/marian-multi"
    
    # Load CTranslate2 vocab
    with open(os.path.join(model_path, "shared_vocabulary.json"), "r", encoding="utf-8") as f:
        ct2_vocab = json.load(f)
        
    # Load SPM
    sp = spm.SentencePieceProcessor(os.path.join(model_path, "source.spm"))
    
    text = "Hello world"
    sp_tokens = sp.encode(text, out_type=str)
    # Add language tag
    sp_tokens.insert(0, ">>hau_Latn<<")
    
    print(f"SP Tokens for '{text}': {sp_tokens}")
    
    for token in sp_tokens:
        if token in ct2_vocab:
            ct2_id = ct2_vocab.index(token)
            print(f"Token '{token}': ID {ct2_id}")
        else:
            print(f"Token '{token}': NOT FOUND")
            
except Exception as e:
    print(e)

import os
import sys
import shutil
from faster_whisper import download_model
import ctranslate2
import transformers

def download_and_convert_marian(model_name, output_dir):
    print(f"Converting {model_name} to CTranslate2 format at {output_dir}...")
    if os.path.exists(output_dir):
        print(f"Model {model_name} already exists at {output_dir}")
        return

    try:
        converter = ctranslate2.converters.TransformersConverter(model_name)
        # Try int8 quantization which is often more stable/compact for CPU
        converter.convert(output_dir, force=True, quantization="int8")
        
        # We also need the SentencePiece models (source.spm and target.spm)
        # The converter might copy the vocabulary, but let's ensure we have the tokenizer files
        # Actually, for Marian, the tokenizer is usually a single source.spm or shared.
        # Let's download the tokenizer files using transformers to be sure we can get the paths, 
        # but simpler is to rely on what the converter outputs or download manually.
        
        # CTranslate2 converter for Marian usually exports 'source_vocabulary.json' etc.
        # But we need the sentencepiece model for raw sentencepiece usage.
        # The converter DOES NOT always export the .spm file if it's not strictly part of the CT2 model spec,
        # but CT2 usually relies on a specific vocabulary format.
        
        # HOWEVER, using sentencepiece directly requires the .spm file.
        # Let's manually copy .spm files from the transformers cache or download them.
        
        from transformers import AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        vocab_files = tokenizer.vocab_files_names
        # vocab_files is usually {'source_spm': 'source.spm', 'target_spm': 'target.spm', ...}
        
        # We need to save these to the output_dir
        tokenizer.save_pretrained(output_dir)
        print(f"Tokenizer saved to {output_dir}")

    except Exception as e:
        print(f"Failed to convert {model_name}: {e}")
        # Don't exit, maybe other models work
        
def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    args = sys.argv[1:]
    download_marian = ("--marian" in args) or (os.environ.get("DOWNLOAD_MARIAN") == "1")
    
    # 1. Whisper Model (always download for offline transcription)
    model_size = "base"
    whisper_dir = os.path.join(models_dir, f"whisper-{model_size}")
    print(f"Downloading Whisper {model_size} model to {whisper_dir}...")
    os.makedirs(whisper_dir, exist_ok=True)
    try:
        path = download_model(model_size, output_dir=whisper_dir)
        print(f"Whisper model successfully downloaded to: {path}")
    except Exception as e:
        print(f"Failed to download Whisper model: {e}")

    # 2. Marian Models (optional, only when explicitly requested)
    if download_marian:
        marian_models = {
            "fr": "Helsinki-NLP/opus-mt-en-fr",
            "multi": "Helsinki-NLP/opus-mt-en-mul"
        }
        for key, model_name in marian_models.items():
            output_dir = os.path.join(models_dir, f"marian-{key}")
            download_and_convert_marian(model_name, output_dir)

if __name__ == "__main__":
    main()

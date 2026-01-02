import os
import sys
from faster_whisper import download_model

def main():
    model_size = "base"
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", f"whisper-{model_size}")
    
    print(f"Downloading {model_size} model to {output_dir}...")
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        path = download_model(model_size, output_dir=output_dir)
        print(f"Model successfully downloaded to: {path}")
    except Exception as e:
        print(f"Failed to download model: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

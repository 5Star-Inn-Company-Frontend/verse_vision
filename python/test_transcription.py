import os
import sys
import wave
import struct
from faster_whisper import WhisperModel

def create_dummy_wav(filename):
    # Create 1 second of silence
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(16000)
        f.writeframes(b'\x00\x00' * 16000)

def test():
    print("Testing Faster Whisper...", file=sys.stdout)
    sys.stdout.flush()
    model_size = "base"
    
    try:
        print(f"Loading model {model_size}...", file=sys.stdout)
        sys.stdout.flush()
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print("Model loaded.", file=sys.stdout)
        sys.stdout.flush()
    except Exception as e:
        print(f"Failed to load model: {e}", file=sys.stdout)
        sys.stdout.flush()
        return

    wav_file = "temp_silence.wav"
    create_dummy_wav(wav_file)
    
    try:
        print(f"Transcribing {wav_file}...", file=sys.stdout)
        sys.stdout.flush()
        segments, info = model.transcribe(wav_file, beam_size=5, language="en", vad_filter=True)
        print("Transcription finished.", file=sys.stdout)
        sys.stdout.flush()
        for segment in segments:
            print(f"Segment: {segment.text}", file=sys.stdout)
            sys.stdout.flush()
    except Exception as e:
        print(f"Transcription failed: {e}", file=sys.stdout)
        sys.stdout.flush()
    finally:
        if os.path.exists(wav_file):
            os.remove(wav_file)

if __name__ == "__main__":
    test()

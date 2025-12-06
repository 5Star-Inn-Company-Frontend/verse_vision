
from transformers import MarianMTModel, MarianTokenizer

model_name = 'Helsinki-NLP/opus-mt-en-mul'
tokenizer = MarianTokenizer.from_pretrained(model_name)
model = MarianMTModel.from_pretrained(model_name)

def translate(text, lang_code):
    input_text = f"{lang_code} {text}"
    print(f"Translating: '{input_text}'")
    batch = tokenizer([input_text], return_tensors="pt", padding=True)
    gen = model.generate(**batch)
    result = tokenizer.batch_decode(gen, skip_special_tokens=True)[0]
    return result

text = "Hello, how are you?"
print(f"Original: {text}")
print(f"Yoruba (>>yor<<): {translate(text, '>>yor<<')}")
print(f"Hausa (>>hau_Latn<<): {translate(text, '>>hau_Latn<<')}")
print(f"Igbo (>>ibo<<): {translate(text, '>>ibo<<')}")
print(f"French (>>fra<<): {translate(text, '>>fra<<')}")

# Test dedicated French model if possible
try:
    print("\nTesting dedicated French model (Helsinki-NLP/opus-mt-en-fr)...")
    fr_tokenizer = MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-en-fr")
    fr_model = MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-en-fr")
    batch = fr_tokenizer([text], return_tensors="pt", padding=True)
    gen = fr_model.generate(**batch)
    print(f"French (dedicated): {fr_tokenizer.batch_decode(gen, skip_special_tokens=True)[0]}")
except Exception as e:
    print(f"Could not load dedicated French model: {e}")

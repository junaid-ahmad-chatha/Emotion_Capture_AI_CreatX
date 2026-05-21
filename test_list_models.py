import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(r"d:\createxAntigravity\.env")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

try:
    models = genai.list_models()
    for m in models:
        print(f"Model: {m.name}, Methods: {m.supported_generation_methods}")
except Exception as e:
    print("Error listing models:", e)

# MindfulMirror

Lightweight personal emotion-tracker and reflection app (local-first).

This repository runs a FastAPI backend that performs local emotion detection (via a Keras model) and serves a single-page frontend that logs moods, shows charts, and offers AI-powered reflections and chat.

Goals:
- Keep all sensitive data local (camera frames processed in-memory).
- Offer optional AI enhancements via Gemini and OpenRouter.

---

## Quickstart (Windows / macOS / Linux)

Prerequisites:
- Python 3.10
- Git
- `emotion_model.keras` placed in the project root for camera detection (optional)

1) Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/MindfulMirror.git
cd MindfulMirror
```

2) Create and activate a Python 3.10 environment

Using conda:

```bash
conda create -n mindful_env python=3.10 -y
conda activate mindful_env
```

Using venv:

```bash
python3.10 -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

3) Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

4) (Optional) Add API keys

Create a `.env` file at the project root if you want AI-powered reflections/chat to use external services:

```
GEMINI_API_KEY=your_google_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```
Both keys are optional — the app has fallback behavior when keys are missing.

5) Start the backend server

```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

6) Open the app

Open http://localhost:8000 in your browser and allow camera access when prompted.

---

## Notes
- If `emotion_model.keras` is missing, camera detection will be disabled but manual logging, AI reflections, and chat still work.
- TensorFlow often requires Python 3.10; if you see import errors, ensure your environment uses 3.10.
- Emotion logs are stored locally in `backend/emotions.db` (SQLite).

---

## Troubleshooting
- Camera blocked: make sure the site is served over HTTP(S) and browser permission is granted.
- Missing TensorFlow: use Python 3.10 and reinstall with `pip install -r backend/requirements.txt`.
- AI timeouts: check `.env` API keys and network connectivity.

---

## Project layout

```
.
├── emotion_model.keras    # optional Keras model (not distributed)
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── emotion_detector.py
│   ├── reflection.py
│   ├── chatbot.py
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── app.js
    └── style.css
```

---

## License
MIT — see LICENSE


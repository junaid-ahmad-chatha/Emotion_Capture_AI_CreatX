# MindfulMirror

MindfulMirror is a local-first emotion tracking and reflection app. It uses a FastAPI backend, a vanilla HTML/CSS/JavaScript frontend, a local Keras emotion model for webcam-based emotion detection, SQLite for local history, Gemini for optional reflection features, and OpenRouter for the chatbot.

The app is designed so private data stays on your machine. Camera frames are processed by the local backend, emotion logs are saved to a local SQLite database, and real API keys are kept in a local `.env` file that must not be committed.

## Features

- Detect emotions from webcam frames using a local `emotion_model.keras` model.
- Log emotions manually when the camera or model is unavailable.
- Store emotion history locally in `backend/emotions.db`.
- Show emotion history, charts, patterns, and recent mood activity.
- Generate optional reflection questions, advice, and insights with Google Gemini.
- Chat with a personalized emotional wellness assistant through OpenRouter.

## Requirements

- Python 3.10 is recommended for TensorFlow compatibility.
- Git.
- A local `emotion_model.keras` file in the project root if you want webcam emotion detection.
- `OPENROUTER_API_KEY` is required for the chatbot to work.
- `GEMINI_API_KEY` is optional and only needed for Gemini-powered reflections, advice, and insights.

## Setup

Clone the repository:

```bash
git clone https://github.com/junaid-ahmad-chatha/Emotion_Capture_AI_CreatX.git
cd Emotion_Capture_AI_CreatX
```

Create and activate a Python 3.10 environment.

Using Conda:

```bash
conda create -n mindfulmirror python=3.10 -y
conda activate mindfulmirror
```

Using venv:

```bash
python3.10 -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

You can also install from `backend/requirements.txt`; both files currently contain the same Python dependencies.

## Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your real keys:

```env
# Optional: used for reflection questions, advice, and insights.
GEMINI_API_KEY=your_gemini_api_key

# Required for the chatbot.
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_SITE_URL=http://localhost:8000
OPENROUTER_APP_NAME=MindfulMirror
```

## Running the App

Start the backend from the `backend` folder:

```bash
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open the app:

```text
http://127.0.0.1:8000
```

The backend serves the frontend automatically from the `frontend/` folder.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/detect-emotion` | Detect emotion from a base64 image frame. |
| `POST` | `/api/log-emotion` | Save an emotion entry. |
| `POST` | `/api/update-note` | Update the note for an emotion entry. |
| `GET` | `/api/history` | Return recent emotion logs. |
| `GET` | `/api/patterns` | Return aggregate counts and chart data. |
| `POST` | `/api/reflect` | Generate a reflection question. Gemini key optional; fallback questions are used without it. |
| `GET` | `/api/insights` | Generate emotional pattern insights. Gemini key optional; rule-based fallback is used without it. |
| `POST` | `/api/advice` | Generate short advice for an emotion. Gemini key optional; fallback advice is used without it. |
| `POST` | `/api/analyze-reflection` | Generate feedback for a written reflection. Gemini key optional; fallback response is used without it. |
| `POST` | `/api/chat` | Chat with the OpenRouter assistant. Requires `OPENROUTER_API_KEY`. |

## Local Files Not Uploaded to GitHub

The following files are intentionally ignored:

- `.env` and other local env files.
- `backend/emotions.db` and other database files.
- Python cache folders such as `__pycache__/`.
- Local logs.
- `creatx_project_video.mp4` because it is larger than GitHub's normal 100 MB file limit.

The existing `emotion_model.keras` file may be present in this repository, but model files are ignored for future commits so large replacement weights are not uploaded accidentally.

If you want to share the video later, use GitHub Releases or Git LFS.

## Project Structure

```text
.
|-- .env.example
|-- .gitignore
|-- LICENSE
|-- README.md
|-- requirements.txt
|-- emotion_model.keras
|-- backend/
|   |-- main.py
|   |-- database.py
|   |-- emotion_detector.py
|   |-- reflection.py
|   |-- chatbot.py
|   `-- requirements.txt
`-- frontend/
    |-- index.html
    |-- app.js
    |-- style.css
    |-- forest_reflection.png
    |-- misty_forest_lake.png
    `-- sunset_reflection.png
```

## Troubleshooting

Chatbot says the API key is not configured:

- Make sure the key is in `.env`, not only `.env.example`.
- Confirm the variable name is exactly `OPENROUTER_API_KEY`.
- Restart the backend after editing `.env`.

Camera detection does not work:

- Confirm `emotion_model.keras` exists in the project root.
- Allow camera access in the browser.
- Open the app through `http://127.0.0.1:8000`, not a `file://` URL.

TensorFlow import errors:

- Use Python 3.10.
- Reinstall dependencies with `pip install -r requirements.txt`.

## License

MIT License. See `LICENSE` for details.

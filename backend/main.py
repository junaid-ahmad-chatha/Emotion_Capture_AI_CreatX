"""
Emotion Capture AI — FastAPI Backend
Main application with all API routes.
Serves the frontend as static files and handles emotion detection,
logging, history, patterns, and AI reflection.
"""

# Load .env FIRST before any other imports read env vars
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from database import init_db, log_emotion, get_history, get_emotion_counts, get_recent_emotions, get_daily_trend, get_total_entries, update_emotion_note
from emotion_detector import detect_emotion_from_image
from reflection import generate_reflection, generate_insights, generate_advice, generate_solution
from chatbot import chat_with_openrouter

# Try to use the Python Markdown package to render README.md to HTML
try:
    import markdown as _markdown
    _HAS_MARKDOWN = True
except Exception:
    _HAS_MARKDOWN = False

# Initialize the app
app = FastAPI(title="Emotion Capture AI", version="1.0.0")

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()


# ── Pydantic Models ──────────────────────────────────────────────

class EmotionDetectRequest(BaseModel):
    image: str  # Base64-encoded image data (without the data:image/... prefix)

class EmotionLogRequest(BaseModel):
    emotion: str
    source: str  # "camera" or "manual"
    confidence: Optional[float] = None
    note: Optional[str] = None

class EmotionNoteUpdateRequest(BaseModel):
    id: int
    note: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []

class AdviceRequest(BaseModel):
    emotion: str

class ReflectionAnalyzeRequest(BaseModel):
    emotion: str
    note: str

# ── API Routes ───────────────────────────────────────────────────

@app.post("/api/detect-emotion")
async def detect_emotion(request: EmotionDetectRequest):
    """Detect emotion from a webcam image using HuggingFace API."""
    # Strip the data URL prefix if present
    image_data = request.image
    if "," in image_data:
        image_data = image_data.split(",")[1]

    result = await detect_emotion_from_image(image_data)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@app.post("/api/log-emotion")
async def log_emotion_entry(request: EmotionLogRequest):
    """Log an emotion entry to the database."""
    valid_emotions = ["happy", "sad", "angry", "surprise", "fear", "disgust", "neutral"]
    if request.emotion.lower() not in valid_emotions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid emotion. Must be one of: {', '.join(valid_emotions)}"
        )

    entry_id = log_emotion(
        emotion=request.emotion.lower(),
        source=request.source,
        confidence=request.confidence,
        note=request.note
    )

    return {"success": True, "id": entry_id, "message": "Emotion logged successfully"}


@app.post("/api/update-note")
async def update_note(request: EmotionNoteUpdateRequest):
    """Update reflection note for an emotion log entry."""
    update_emotion_note(request.id, request.note)
    return {"success": True, "message": "Note updated successfully"}


@app.get("/api/history")
async def emotion_history(limit: int = 100):
    """Get emotion history, most recent first."""
    history = get_history(limit=limit)
    return {"history": history, "total": len(history)}


@app.get("/api/patterns")
async def emotion_patterns(days: int = 7):
    """Get emotion pattern data for charts and analysis. days=1|7|30"""
    counts = get_emotion_counts()
    trend = get_daily_trend(days=days)
    total = get_total_entries()
    recent = get_recent_emotions(hours=24)
    history = get_history(limit=50) # fetch recent 50 logs for detailed line plot
    
    return {
        "counts": counts,
        "trend": trend,
        "total": total,
        "recent_24h": len(recent),
        "history": history
    }


@app.post("/api/reflect")
async def reflect():
    """Generate a reflection question based on recent emotions."""
    recent = get_recent_emotions(hours=48)
    result = await generate_reflection(recent)
    return result


@app.get("/api/insights")
async def get_insights():
    """Generate dynamic insights based on user history."""
    history = get_history(limit=50)
    counts = get_emotion_counts()
    
    result = await generate_insights(history, counts)
    return result

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Handle chat message via OpenRouter AI with full emotion context."""
    history = get_history(limit=30)  # give chatbot full recent context
    emotion_context = {"history": history}
    
    chat_hist_dicts = [{"role": msg.role, "content": msg.content} for msg in request.history]
    
    reply = await chat_with_openrouter(request.message, chat_hist_dicts, emotion_context)
    return {"reply": reply}

@app.post("/api/advice")
async def get_advice(request: AdviceRequest):
    """Generate quick advice based on a selected emotion."""
    advice = await generate_advice(request.emotion)
    return {"advice": advice}

@app.post("/api/analyze-reflection")
async def analyze_reflection(request: ReflectionAnalyzeRequest):
    """Generate a solution or congratulation based on the user's reflection note."""
    response = await generate_solution(request.note, request.emotion)
    return {"response": response}


# ── Serve Frontend ───────────────────────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

# Serve static assets (CSS, JS, images)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Serve docs folder as static files so files in /docs are directly accessible
DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
if os.path.isdir(DOCS_DIR):
    app.mount("/docs_static", StaticFiles(directory=DOCS_DIR), name="docs_static")


@app.get("/")
async def serve_index():
    """Serve the main frontend page."""
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/docs", response_class=HTMLResponse)
async def serve_readme_as_html():
    """Serve the project README as HTML (rendered from Markdown when possible)."""
    readme_path = os.path.join(os.path.dirname(__file__), "..", "README.md")
    try:
        with open(readme_path, "r", encoding="utf-8") as f:
            md = f.read()

        if _HAS_MARKDOWN:
            html = _markdown.markdown(md, extensions=["fenced_code", "tables"])
            full = f"<!doctype html><html><head><meta charset='utf-8'><title>Project README</title></head><body>{html}</body></html>"
            return HTMLResponse(content=full)
        else:
            # Fallback: show raw markdown inside <pre>
            safe = md.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            full = f"<html><head><meta charset='utf-8'><title>README (raw)</title></head><body><pre>{safe}</pre></body></html>"
            return HTMLResponse(content=full)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="README.md not found in project root")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run with: uvicorn main:app --reload ──────────────────────────

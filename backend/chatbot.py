"""
OpenRouter AI Chatbot for MindfulMirror.
Provides a conversational emotional wellness assistant that uses the user's
emotion history to give personalized, contextualized responses.
"""

import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_API_URL = os.getenv(
    "OPENROUTER_API_URL",
    "https://openrouter.ai/api/v1/chat/completions"
).strip()
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:8000").strip()
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "MindfulMirror").strip()


def _build_system_prompt(emotion_context: dict) -> str:
    """Build a personalized system prompt using the user's emotion history."""
    history = emotion_context.get("history", [])

    summary_lines = []
    emotion_counts: dict[str, int] = {}

    for entry in history[:20]:
        emo = entry.get("emotion", "unknown")
        emotion_counts[emo] = emotion_counts.get(emo, 0) + 1
        note = entry.get("note")
        ts   = entry.get("created_at", "")[:16]
        line = f"- {emo} at {ts}"
        if note:
            line += f': "{note}"'
        summary_lines.append(line)

    history_text = "\n".join(summary_lines) if summary_lines else "No emotion logs yet."

    counts_text = ", ".join(
        f"{e}: {c}" for e, c in sorted(emotion_counts.items(), key=lambda x: -x[1])
    ) if emotion_counts else "none"

    dominant = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "unknown"

    return f"""You are MindfulMirror AI, a warm and empathetic emotional wellness assistant integrated into the MindfulMirror app.

The user has been tracking their emotions and here is their recent history:

Recent Emotion Logs:
{history_text}

Emotion Summary (most frequent first): {counts_text}
Dominant Emotion: {dominant}

Your role:
- Have natural, supportive conversations about the user's emotions and mental wellness
- Reference their actual logged emotions to give PERSONALIZED, specific insights
- Provide analysis of their emotional patterns when asked
- Offer coping strategies, reflections, and encouragement based on their data
- Ask thoughtful follow-up questions to deepen self-awareness
- Be warm, non-judgmental, and empowering — never clinical or robotic
- Keep responses concise (2-4 sentences) unless the user asks for more detail
- Never give medical diagnoses or replace professional help

If the user has no logged emotions yet, gently encourage them to log some moods first."""


async def chat_with_openrouter(message: str, history: list[dict], emotion_context: dict) -> str:
    """
    Send a message to OpenRouter and return the assistant reply.
    
    Args:
        message: The user's latest message
        history: List of {"role": "user"|"assistant", "content": "..."} dicts
        emotion_context: Dict with "history" key from the database
    
    Returns:
        The assistant's reply string
    """
    system_prompt = _build_system_prompt(emotion_context)

    if not OPENROUTER_API_KEY:
        return "The chat AI is not configured yet. Add OPENROUTER_API_KEY to your .env file to enable it."

    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (limit to last 10 exchanges)
    for msg in history[-10:]:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    payload = json.dumps({
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.8
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": OPENROUTER_SITE_URL,
            "X-OpenRouter-Title": OPENROUTER_APP_NAME,
            "X-Title": OPENROUTER_APP_NAME
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else ""
        print(f"[Chatbot] OpenRouter HTTP error {e.code}: {body}")
        return "I'm having a little trouble connecting right now. Please try again in a moment! 💙"
    except Exception as e:
        print(f"[Chatbot] Error: {e}")
        return "I'm having a little trouble connecting right now. Please try again in a moment! 💙"

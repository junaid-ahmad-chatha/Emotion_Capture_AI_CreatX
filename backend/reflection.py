"""
Reflection & Pattern Analysis module using Gemini API.
Generates empathetic follow-up questions and identifies emotional patterns
from the user's emotion history.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Hardcoded fallback questions for when Gemini is unavailable
FALLBACK_QUESTIONS = [
    "What part of today affected you the most?",
    "Has this feeling come up before this week?",
    "What would make tomorrow feel a little lighter?",
    "Is there something specific that triggered this?",
    "What do you need right now that you're not getting?",
    "If you could change one thing about today, what would it be?",
    "Who or what brought you comfort recently?",
    "What's one small thing you can do right now for yourself?",
]

def get_fallback_insights(emotion_counts: list) -> list:
    """Generate dynamic rule-based insights when Gemini is unavailable."""
    if not emotion_counts:
        return [
            "✨ Mindful Observation: Keep logging your emotions to discover patterns over time.",
            "🌱 Finding Balance: Tracking emotions consistently helps build self-awareness.",
            "💡 Emotional Insight: Even small emotional shifts throughout the day matter."
        ]
        
    total_logs = sum(c["count"] for c in emotion_counts)
    
    # Calculate user percentages
    user_pct = {c["emotion"].lower(): (c["count"] / total_logs) * 100 for c in emotion_counts}
    all_emotions = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"]
    
    # Complex Patterns based on percentages
    COMPLEX_PATTERNS = [
        ({"happy": 80, "surprise": 10, "fear": 10}, "✨ Sudden joy after unexpected good news."),
        ({"happy": 70, "sad": 20, "surprise": 10}, "✨ Smiling while remembering emotional memories."),
        ({"happy": 60, "surprise": 30, "disgust": 10}, "✨ Excitement mixed with confusion."),
        ({"happy": 90, "angry": 10}, "✨ Strong confidence and winning feeling."),
        
        ({"sad": 80, "fear": 10, "disgust": 10}, "🌧️ Feeling emotionally broken and uncomfortable."),
        ({"sad": 70, "angry": 20, "happy": 10}, "🌧️ Pain mixed with hidden frustration."),
        ({"sad": 60, "fear": 30, "surprise": 10}, "🌧️ Shock after hearing bad news."),
        ({"sad": 50, "happy": 40, "surprise": 10}, "🌧️ Emotional tears during a happy moment."),
        
        ({"angry": 80, "disgust": 10, "fear": 10}, "🔥 Aggressive reaction with strong rejection."),
        ({"angry": 70, "sad": 20, "surprise": 10}, "🔥 Hurt feelings turning into anger."),
        ({"angry": 60, "fear": 30, "disgust": 10}, "🔥 Defensive anger caused by pressure."),
        ({"angry": 50, "happy": 30, "surprise": 20}, "🔥 Competitive excitement during victory."),
        
        ({"fear": 80, "surprise": 10, "sad": 10}, "😨 Panic after something unexpected."),
        ({"fear": 70, "disgust": 20, "angry": 10}, "😨 Fear mixed with rejection and stress."),
        ({"fear": 60, "sad": 30, "happy": 10}, "😨 Nervousness before an important moment."),
        ({"fear": 50, "surprise": 40, "angry": 10}, "😨 Shocked and defensive reaction."),
        
        ({"surprise": 80, "happy": 10, "fear": 10}, "😲 Unexpected exciting moment."),
        ({"surprise": 70, "fear": 20, "disgust": 10}, "😲 Sudden strange or uncomfortable situation."),
        ({"surprise": 60, "happy": 30, "sad": 10}, "😲 Emotional unexpected memory."),
        ({"surprise": 50, "angry": 30, "fear": 20}, "😲 Reaction to sudden danger or conflict."),
        
        ({"disgust": 80, "angry": 10, "fear": 10}, "🤢 Strong rejection toward something unpleasant."),
        ({"disgust": 70, "sad": 20, "fear": 10}, "🤢 Emotional discomfort and disappointment."),
        ({"disgust": 60, "angry": 30, "surprise": 10}, "🤢 Shocked by unacceptable behavior."),
        ({"disgust": 50, "fear": 30, "sad": 20}, "🤢 Feeling unsafe and emotionally disturbed.")
    ]
    
    # Find closest match
    best_match = None
    min_error = float('inf')
    
    for rule_pct, rule_text in COMPLEX_PATTERNS:
        error = 0
        for emo in all_emotions:
            error += abs(user_pct.get(emo, 0) - rule_pct.get(emo, 0))
        if error < min_error:
            min_error = error
            best_match = rule_text
            
    insights = []
    
    # 1. Add the complex pattern match
    if best_match and min_error <= 15:
        insights.append(f"🔍 Complex Pattern: {best_match}")
        
    # Sort emotions by count descending
    sorted_emotions = sorted(emotion_counts, key=lambda x: x["count"], reverse=True)
    dominant = sorted_emotions[0]["emotion"].lower()
    
    # 2. Add Dominant Emotion Insight
    if dominant in ["happy", "surprise"]:
        insights.append(f"🌟 Peak Positivity: Your dominant emotion has been {dominant}. You are riding a wave of good energy!")
    elif dominant in ["sad", "fear", "disgust", "angry"]:
        insights.append(f"🌧️ Gentle Awareness: Your dominant emotion has been {dominant}. Be gentle with yourself during these challenging feelings.")
    else:
        insights.append(f"🌱 Steady Ground: Your most frequent emotion is {dominant}. You are maintaining a stable emotional baseline.")
        
    # 3. Add Consistency / Tracking Insight
    if total_logs > 10:
        insights.append("📈 Consistent Tracking: You're doing a fantastic job consistently logging your moods. Self-awareness is key!")
    else:
        insights.append("💡 Emotional Insight: Keep logging your emotions to unlock deeper patterns over time.")
        
    return insights[:3]


def _configure_gemini():
    """Configure the Gemini API client."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-3.5-flash")


async def generate_reflection(recent_emotions: list) -> dict:
    """
    Generate a warm, empathetic reflection question based on recent emotions.

    Args:
        recent_emotions: List of recent emotion entries (dicts with emotion, created_at, note)

    Returns:
        dict with keys: question, success
    """
    import random

    model = _configure_gemini()
    if not model:
        return {
            "success": False,
            "question": random.choice(FALLBACK_QUESTIONS),
            "source": "fallback"
        }

    try:
        # Build context from recent emotions
        emotion_summary = []
        for entry in recent_emotions[:10]:
            text = f"- {entry.get('emotion', 'unknown')}"
            if entry.get("note"):
                text += f" (note: {entry['note']})"
            if entry.get("created_at"):
                text += f" at {entry['created_at']}"
            emotion_summary.append(text)

        emotions_text = "\n".join(emotion_summary) if emotion_summary else "No recent emotions logged yet."

        prompt = f"""You are a compassionate emotional wellness companion. Based on the user's recent emotional states, 
generate ONE warm, thoughtful follow-up question to help them reflect on their feelings.

Recent emotions:
{emotions_text}

Rules:
- Be empathetic, warm, and non-judgmental
- Ask only ONE question
- Keep it short (1-2 sentences max)
- Don't diagnose or give medical advice
- Focus on self-awareness and gentle exploration
- Don't mention you're an AI

Respond with ONLY the question, nothing else."""

        response = model.generate_content(prompt)
        question = response.text.strip().strip('"')

        return {
            "success": True,
            "question": question,
            "source": "gemini"
        }

    except Exception as e:
        print(f"[Reflection] Gemini error: {e}")
        return {
            "success": False,
            "question": random.choice(FALLBACK_QUESTIONS),
            "source": "fallback"
        }


async def generate_insights(emotion_history: list, emotion_counts: list) -> dict:
    """
    Analyze the user's emotional patterns and generate meaningful insights.

    Args:
        emotion_history: Full list of emotion entries
        emotion_counts: Aggregated emotion counts

    Returns:
        dict with keys: insights (list of strings), success
    """
    import random

    model = _configure_gemini()
    if not model:
        return {
            "success": False,
            "insights": get_fallback_insights(emotion_counts),
            "source": "fallback"
        }

    try:
        # Build pattern summary
        count_text = "\n".join(
            [f"- {c['emotion']}: {c['count']} times" for c in emotion_counts]
        ) if emotion_counts else "No data yet."

        # Get recent entries with timestamps for time-based patterns
        recent_entries = []
        for entry in emotion_history[:30]:
            text = f"- {entry.get('emotion', 'unknown')} at {entry.get('created_at', 'unknown')}"
            if entry.get("note"):
                text += f" — \"{entry['note']}\""
            recent_entries.append(text)

        recent_text = "\n".join(recent_entries) if recent_entries else "No entries yet."

        prompt = f"""You are an emotional wellness analyst. Analyze the user's emotional patterns and provide 3-4 clear, 
actionable insights.

Emotion frequency:
{count_text}

Recent entries (newest first):
{recent_text}

Rules:
- Provide exactly 3-4 bullet-point insights
- Each insight should be 1-2 sentences
- Identify patterns: dominant emotions, shifts, time-based trends
- Be warm, encouraging, and constructive
- Don't diagnose or give medical advice
- If there's limited data, acknowledge that and encourage continued tracking

Format: Return each insight on a new line in this EXACT format:
[Emoji] [Short Title]: [1-2 sentences of personalized insight]
Example:
🌱 Finding Balance: You have been feeling mostly neutral today, which is a great baseline. Nothing else."""

        response = model.generate_content(prompt)
        insights = [
            line.strip()
            for line in response.text.strip().split("\n")
            if line.strip()
        ]

        return {
            "success": True,
            "insights": insights if insights else get_fallback_insights(emotion_counts),
            "source": "gemini"
        }

    except Exception as e:
        print(f"[Insights] Gemini error: {e}")
        return {
            "success": False,
            "insights": get_fallback_insights(emotion_counts),
            "source": "fallback"
        }

async def chat_with_gemini(message: str, chat_history: list, emotion_context: dict) -> str:
    """
    Handle a chat message using Gemini with emotional context.
    """
    model = _configure_gemini()
    if not model:
        return "I'm sorry, I'm currently unavailable to chat. Please ensure the Gemini API key is configured."

    try:
        # Build context
        context_str = "Recent emotions logged by the user:\n"
        if emotion_context.get("history"):
            for entry in emotion_context["history"][:5]:
                context_str += f"- {entry.get('emotion', 'unknown')} on {entry.get('created_at', 'unknown')}\n"
        else:
            context_str += "None yet.\n"

        prompt = f"""You are a compassionate, mindful wellness assistant. 
Your goal is to provide empathetic support and guidance based on the user's emotions.
Do not diagnose or provide medical advice. Keep responses concise (1-3 sentences) and conversational.

{context_str}

Chat History:
"""
        for msg in chat_history[-5:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            prompt += f"{role}: {msg['content']}\n"
            
        prompt += f"User: {message}\nAssistant:"

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Chat] Gemini error: {e}")
        return "I'm having a little trouble connecting to my thoughts right now. Please try again in a moment."

async def generate_advice(emotion: str) -> str:
    """Generate quick advice based on a single selected emotion."""
    model = _configure_gemini()
    if not model:
        return f"Embrace this feeling of {emotion} and take a deep breath."

    try:
        prompt = f"""You are a mindful wellness assistant. The user just logged their current emotion as '{emotion}'.
Provide a single, short sentence of encouraging advice or a brief grounding exercise specifically tailored to this emotion.
Be empathetic, warm, and very concise (1-2 sentences max)."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Advice] Gemini error: {e}")
        return f"Acknowledge your feeling of {emotion} today, and treat yourself with kindness."

async def generate_solution(reflection_text: str, emotion: str) -> str:
    """Generate a solution or congratulation based on the user's reflection note."""
    model = _configure_gemini()
    if not model:
        return "Thank you for reflecting. Your journey is important."

    try:
        prompt = f"""You are a supportive mental wellness coach. 
The user was feeling '{emotion}' and just wrote this journal reflection:
"{reflection_text}"

If the emotion is negative or challenging (like sad, angry, fear, disgust), provide a gentle, actionable 'Solution' or coping strategy.
If the emotion is positive or neutral (like happy, surprise, neutral), provide a warm 'Congratulation' or affirmation to reinforce their state.

Keep the response under 3 sentences. Be empathetic, encouraging, and human."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Solution] Gemini error: {e}")
        return "Thank you for taking the time to write this down. Processing our feelings is a great step."

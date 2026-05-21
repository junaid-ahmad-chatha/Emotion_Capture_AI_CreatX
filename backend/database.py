"""
SQLite database module for Emotion Capture AI.
Handles all database operations — creating tables, logging emotions,
retrieving history, and computing pattern data.
"""

import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "emotions.db")


def get_connection():
    """Get a database connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database and create the emotions table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emotions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emotion TEXT NOT NULL,
            source TEXT NOT NULL,
            confidence REAL,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print(f"[DB] Database initialized at {DB_PATH}")


def log_emotion(emotion: str, source: str, confidence: float = None, note: str = None):
    """Log a detected or manually entered emotion."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO emotions (emotion, source, confidence, note) VALUES (?, ?, ?, ?)",
        (emotion.lower(), source, confidence, note)
    )
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id


def get_history(limit: int = 100):
    """Get emotion history, most recent first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM emotions ORDER BY created_at DESC LIMIT ?",
        (limit,)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_emotion_counts():
    """Get count of each emotion for pattern analysis."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT emotion, COUNT(*) as count
        FROM emotions
        GROUP BY emotion
        ORDER BY count DESC
    """)
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_recent_emotions(hours: int = 24):
    """Get emotions from the last N hours."""
    conn = get_connection()
    cursor = conn.cursor()
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
    cursor.execute(
        "SELECT * FROM emotions WHERE created_at >= ? ORDER BY created_at DESC",
        (cutoff,)
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_daily_trend(days: int = 7):
    """Get emotion counts for the last N days. If days=1, groups by hour."""
    conn = get_connection()
    cursor = conn.cursor()
    cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    if days == 1:
        # Group by hour for the 'Day' view
        cursor.execute("""
            SELECT
                strftime('%Y-%m-%dT%H:00:00', created_at) as date,
                emotion,
                COUNT(*) as count
            FROM emotions
            WHERE created_at >= ?
            GROUP BY strftime('%Y-%m-%dT%H:00:00', created_at), emotion
            ORDER BY date ASC
        """, (cutoff,))
    else:
        cursor.execute("""
            SELECT
                DATE(created_at) as date,
                emotion,
                COUNT(*) as count
            FROM emotions
            WHERE created_at >= ?
            GROUP BY DATE(created_at), emotion
            ORDER BY date ASC
        """, (cutoff,))
        
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_total_entries():
    """Get total number of logged emotions."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM emotions")
    result = cursor.fetchone()
    conn.close()
    return result["total"]


def update_emotion_note(entry_id: int, note: str):
    """Update the note field of an existing emotion entry."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE emotions SET note = ? WHERE id = ?",
        (note, entry_id)
    )
    conn.commit()
    conn.close()


"""
Emotion Detection module using a local Keras classification model.
Uses OpenCV Haar Cascades for local face detection and crops the face
before passing it to the emotion_model.keras model for inference.
"""

import base64
import os
import cv2
import numpy as np
import tensorflow as tf

# Global handles for resources
_model = None
_face_cascade = None


def load_local_resources():
    """Lazy load the Keras model and Haar Cascade face detector."""
    global _model, _face_cascade
    if _model is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "emotion_model.keras"))
        print(f"[Emotion Detector] Loading local Keras model from {model_path}...")
        _model = tf.keras.models.load_model(model_path)
        print("[Emotion Detector] Keras model loaded successfully.")

    if _face_cascade is None:
        # Load OpenCV's default pre-trained frontal face Haar Cascade
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        print(f"[Emotion Detector] Loading Haar Cascade face detector from {cascade_path}...")
        _face_cascade = cv2.CascadeClassifier(cascade_path)
        print("[Emotion Detector] Haar Cascade loaded.")


async def detect_emotion_from_image(image_base64: str) -> dict:
    """
    Detect emotion from a base64-encoded image using local Haar Cascades
    and the local Keras emotion classification model.

    Args:
        image_base64: Base64 string of the captured image (without data:image prefix)

    Returns:
        dict with keys: emotion, confidence, all_scores, success, error
    """
    try:
        # Ensure model and face detector are loaded
        load_local_resources()

        # Decode base64 to raw bytes
        image_bytes = base64.b64decode(image_base64)
        
        # Convert bytes to a NumPy array for OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {
                "success": False,
                "error": "Failed to decode image. Invalid image format.",
                "emotion": None,
                "confidence": 0
            }

        # Convert image to grayscale for Haar Cascades and FER-2013 model
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Detect faces in the grayscale image
        faces = _face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )

        if len(faces) == 0:
            return {
                "success": False,
                "error": "No face detected. Please position your face in the guide.",
                "emotion": None,
                "confidence": 0
            }

        # Take the largest face in case of multiple faces/background noise
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]

        # Crop the detected face region
        face_roi = gray[y:y+h, x:x+w]

        # Resize to 48x48 (input shape expected by emotion_model.keras)
        face_resized = cv2.resize(face_roi, (48, 48))

        # Normalize pixel values from [0, 255] to [0.0, 1.0]
        face_normalized = face_resized.astype('float32') / 255.0

        # Expand dimensions to fit shape: [1, 48, 48, 1] (batch_size, height, width, channels)
        face_input = np.expand_dims(face_normalized, axis=-1)
        face_input = np.expand_dims(face_input, axis=0)

        # Run inference (suppress console output during prediction)
        predictions = _model.predict(face_input, verbose=0)
        probabilities = predictions[0]

        # Standard FER-2013 class label mappings
        FER_LABELS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]

        # Find predicted emotion with highest confidence
        max_idx = np.argmax(probabilities)
        detected_label = FER_LABELS[max_idx]
        confidence = float(probabilities[max_idx])

        # Map all scores to percentage values
        all_scores = {
            label: round(float(prob) * 100, 1)
            for label, prob in zip(FER_LABELS, probabilities)
        }

        confidence_percent = round(confidence * 100, 1)

        return {
            "success": True,
            "emotion": detected_label,
            "confidence": confidence_percent,
            "all_scores": all_scores,
            "error": None
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": f"Local detection failed: {str(e)}",
            "emotion": None,
            "confidence": 0
        }

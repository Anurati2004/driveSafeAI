"""Face landmark detection + Eye Aspect Ratio using the MediaPipe Tasks FaceLandmarker API."""
import os
import threading

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

# FaceMesh (468-point) indices, ordered p1..p6 = [corner, top1, top2, corner, bottom2, bottom1]
LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def eye_aspect_ratio(p):
    """EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|) (Soukupova & Cech, 2016)."""
    vertical = np.linalg.norm(p[1] - p[5]) + np.linalg.norm(p[2] - p[4])
    horizontal = np.linalg.norm(p[0] - p[3])
    return float(vertical / (2.0 * horizontal)) if horizontal > 0 else 0.0


class FaceDetector:
    def __init__(self, model_path):
        if not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"Face Landmarker model not found at '{model_path}'. Run: python download_model.py")
        options = vision.FaceLandmarkerOptions(
            base_options=mp_python.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
        )
        self._landmarker = vision.FaceLandmarker.create_from_options(options)
        self._lock = threading.Lock()  # landmarker instance is not guaranteed thread-safe

    def analyze(self, bgr_frame):
        """Return the mean EAR of both eyes, or None when no face is found."""
        rgb = np.ascontiguousarray(cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB))
        h, w = rgb.shape[:2]
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        with self._lock:
            result = self._landmarker.detect(image)
        if not result.face_landmarks:
            return None
        lm = result.face_landmarks[0]

        def pts(idx):  # normalized -> pixel coordinates (EAR needs true aspect)
            return np.array([[lm[i].x * w, lm[i].y * h] for i in idx])

        return (eye_aspect_ratio(pts(LEFT_EYE)) + eye_aspect_ratio(pts(RIGHT_EYE))) / 2.0


_detector = None
_init_lock = threading.Lock()


def get_detector(model_path):
    global _detector
    with _init_lock:
        if _detector is None:
            _detector = FaceDetector(model_path)
    return _detector

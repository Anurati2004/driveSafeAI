"""Download the MediaPipe Face Landmarker model bundle (~4 MB)."""
import os, urllib.request

URL = ("https://storage.googleapis.com/mediapipe-models/face_landmarker/"
       "face_landmarker/float16/1/face_landmarker.task")
DEST = os.path.join(os.path.dirname(__file__), "assets", "face_landmarker.task")

os.makedirs(os.path.dirname(DEST), exist_ok=True)
print(f"Downloading {URL}")
urllib.request.urlretrieve(URL, DEST)
print(f"Saved to {DEST} ({os.path.getsize(DEST) / 1e6:.1f} MB)")

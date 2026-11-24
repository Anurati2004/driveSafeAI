# DriveSafe AI – Intelligent Driver Drowsiness Detection System

A web app that watches your face through a webcam, estimates eye closure with computer vision, and shows a visual warning and plays an audio alarm when your eyes stay closed longer than a normal blink.

> **Not a safety device.** This is a prototype and has not been medically or clinically validated. It cannot guarantee that drowsiness is detected or that accidents are prevented. If you feel tired, stop driving and rest.

## Stack
React + Vite, React Router, Axios, Recharts · Flask, Flask-CORS, Flask-JWT-Extended, Flask-SQLAlchemy · OpenCV, NumPy, MediaPipe Face Landmarker (Tasks API, `mediapipe==0.10.14`) · MySQL

## Prerequisites
Python 3.9–3.12, Node.js 18+, MySQL 8, a webcam. Browsers allow camera access only on `localhost` or HTTPS.

## 1. Database
```sql
CREATE DATABASE drivesafe_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'drivesafe'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL ON drivesafe_ai.* TO 'drivesafe'@'localhost';
```
Tables are created automatically on first start (`db.create_all()`). `backend/database/schema.sql` contains the equivalent SQL.

## 2. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then edit DB_PASSWORD and JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"   # use this for JWT_SECRET_KEY
python download_model.py    # downloads face_landmarker.task (~4 MB) into backend/assets/
python app.py               # http://127.0.0.1:5000
```
**Model file:** MediaPipe's Tasks API needs the `face_landmarker.task` bundle. `download_model.py` fetches it from Google's official MediaPipe model storage. Without it, the frame endpoint returns a 503 with instructions.

## 3. Frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```
Register an account, open **Live monitoring**, allow camera access, and press **Start monitoring**.

## API summary
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account / get JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/sessions/start` | Begin a session |
| POST | `/api/sessions/<id>/frame` | Send one JPEG frame (base64), get detection status |
| POST | `/api/sessions/<id>/stop` | End and save the session |
| GET | `/api/sessions`, `/api/sessions/<id>` | History / session details with events |
| GET | `/api/dashboard` | Totals, recent sessions, 7-day stats |
| GET/PUT | `/api/settings` | Read / update settings |

Logout is client-side (the token is discarded); tokens expire after `JWT_EXPIRES_HOURS`.

## How detection works
1. The browser captures a webcam frame about 8 times per second, downsizes it to 480 px wide, and posts it as a JPEG to the backend.
2. The backend decodes it with OpenCV and runs the MediaPipe Face Landmarker, which returns 478 face landmarks (the first 468 follow the Face Mesh layout).
3. For each eye, six landmarks give the **Eye Aspect Ratio**: `EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2·‖p1−p4‖)`. Left eye uses indices 362, 385, 387, 263, 373, 380; right eye uses 33, 160, 158, 133, 153, 144. The two eyes are averaged. Open eyes are typically around 0.25–0.35; closed eyes drop toward 0.1 or lower.
4. A per-session state machine (`services/monitor.py`) applies time-based rules:
   - **Closed**: EAR below your threshold (default 0.21).
   - **Blink**: eyes closed for less than 0.5 s, then reopened.
   - **Drowsiness alert**: eyes continuously closed for the sensitivity time (low 2.0 s, medium 1.5 s, high 1.0 s). One event is stored per closure episode, so normal blinks never trigger it.
   - **No face**: resets the closure timer, so a turned head or blocked camera is not counted as sleep.
5. The frontend shows status, and plays a beeping alarm (Web Audio) plus a red warning while the drowsy state continues, if audio is enabled.

## Limitations
- **Fixed EAR threshold.** Eye shape, glasses, lighting, camera angle and head pose change EAR. Tune the threshold in Settings; there is no per-user calibration.
- **Frame rate and latency.** At about 8 fps over HTTP, very fast blinks can be missed or mistimed, so blink counts are approximate. Timing uses server receive time, so network jitter adds error.
- **Eye closure is only one sign of drowsiness.** Yawning, head nodding and micro-sleeps with open eyes are not detected.
- **Failure cases.** Sunglasses, dark or backlit scenes, extreme head turns, and low-quality webcams reduce reliability. Looking down at a phone or the road can look like closed eyes.
- **Single face, browser-dependent.** Only the first detected face is used. The tab must stay open and the camera active.
- **Session state is held in server memory.** Restarting the backend mid-session loses the blink count (alerts are recovered from the database). Run a single backend process, or move state to Redis to scale.
- **Prototype security scope.** No login rate limiting, HTTPS or token refresh is included; add them before any real deployment.

## Project structure
```
backend/   app.py  config.py  requirements.txt  routes/  models/  services/  database/  assets/
frontend/  src/{components,pages,services}  App.jsx  App.css
```

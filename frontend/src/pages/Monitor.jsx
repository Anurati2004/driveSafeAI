import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../services/api';
import { fmtDuration } from '../services/format';

const FRAME_INTERVAL_MS = 125; // ~8 frames/s
const STATUS = {
  idle: ['Not monitoring', 'idle'],
  eyes_open: ['Alert — eyes open', 'ok'],
  eyes_closed: ['Eyes closed…', 'warn'],
  drowsy: ['Possible drowsiness', 'danger'],
  no_face: ['No face detected', 'warn'],
};

export default function Monitor() {
  const videoRef = useRef(null), canvasRef = useRef(null), streamRef = useRef(null);
  const timerRef = useRef(null), clockRef = useRef(null), busyRef = useRef(false);
  const sessionRef = useRef(null), audioRef = useRef(null), beepRef = useRef(null);
  const alarmOnRef = useRef(true);

  const [running, setRunning] = useState(false);
  const [live, setLive] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  const beep = () => {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'square'; osc.frequency.value = 880; gain.gain.value = 0.15;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  };
  const startAlarm = () => { if (!beepRef.current) { beep(); beepRef.current = setInterval(beep, 600); } };
  const stopAlarm = () => { clearInterval(beepRef.current); beepRef.current = null; };

  const releaseResources = () => {
    clearInterval(timerRef.current); clearInterval(clockRef.current); stopAlarm();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const sendFrame = async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (busyRef.current || !sessionRef.current || !video || video.readyState < 2) return;
    busyRef.current = true;
    try {
      const w = 480, h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      const image = canvas.toDataURL('image/jpeg', 0.6);
      const { data } = await api.post(`/sessions/${sessionRef.current}/frame`, { image });
      setLive(data);
      setError('');
      if (data.drowsy && alarmOnRef.current) startAlarm(); else stopAlarm();
    } catch (e) {
      if (e.response?.status === 409) { releaseResources(); sessionRef.current = null; setRunning(false); }
      setError(errMsg(e));
    } finally { busyRef.current = false; }
  };

  const start = async () => {
    setError(''); setSummary(null); setLive(null);
    try {
      // AudioContext must be created from a user gesture so the browser allows the alarm.
      const AC = window.AudioContext || window.webkitAudioContext;
      audioRef.current = audioRef.current || new AC();
      await audioRef.current.resume();
      alarmOnRef.current = (await api.get('/settings')).data.alert_enabled;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      sessionRef.current = (await api.post('/sessions/start')).data.id;
      setElapsed(0); setRunning(true);
      timerRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS);
      const t0 = Date.now();
      clockRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    } catch (e) {
      releaseResources();
      setError(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera permission in your browser and try again.'
        : e.name === 'NotFoundError' ? 'No camera was found on this device.' : errMsg(e));
    }
  };

  const stop = async () => {
    const id = sessionRef.current;
    sessionRef.current = null;
    releaseResources();
    setRunning(false); setLive(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    try { if (id) setSummary((await api.post(`/sessions/${id}/stop`)).data); }
    catch (e) { setError(errMsg(e)); }
  };

  // Leaving the page ends the session so it is saved.
  useEffect(() => () => {
    const id = sessionRef.current;
    releaseResources();
    if (id) api.post(`/sessions/${id}/stop`).catch(() => {});
  }, []);

  const [label, tone] = STATUS[running ? live?.status || 'eyes_open' : 'idle'];
  const drowsy = running && live?.drowsy;

  return (
    <>
      <h1>Live monitoring</h1>
      {error && <div className="alert-box">{error}</div>}
      <div className="monitor-grid">
        <div className={`card video-card ${drowsy ? 'danger-glow' : ''}`}>
          <video ref={videoRef} playsInline muted className="video" />
          <canvas ref={canvasRef} hidden />
          {!running && <div className="video-empty">Camera preview appears here. Face the camera in good lighting.</div>}
          {drowsy && (
            <div className="drowsy-overlay" role="alert">
              <strong>Possible drowsiness detected</strong>
              <span>Open your eyes and find a safe place to take a break.</span>
            </div>
          )}
        </div>

        <div className="card side">
          <div className={`status ${tone}`}><span className="dot" />{label}</div>
          <dl className="metrics">
            <div><dt>Session time</dt><dd>{fmtDuration(elapsed)}</dd></div>
            <div><dt>Eye aspect ratio</dt><dd>{live?.ear ?? '—'}</dd></div>
            <div><dt>Eyes closed for</dt><dd>{live ? `${live.closed_seconds.toFixed(1)} s` : '—'}</dd></div>
            <div><dt>Blinks</dt><dd>{live?.blinks ?? 0}</dd></div>
            <div><dt>Alerts</dt><dd>{live?.alerts ?? 0}</dd></div>
          </dl>
          {running
            ? <button className="btn danger" onClick={stop}>Stop monitoring</button>
            : <button className="btn" onClick={start}>Start monitoring</button>}
          {summary && (
            <p className="ok-box small">Session saved: {fmtDuration(summary.duration)}, {summary.total_blinks} blinks, {summary.total_alerts} alerts.{' '}
              <Link to={`/history/${summary.id}`}>View details</Link></p>
          )}
          <p className="muted small">DriveSafe AI is a prototype aid, not a medical or safety device. It cannot guarantee that drowsiness is detected. If you feel tired, stop driving and rest.</p>
        </div>
      </div>
    </>
  );
}

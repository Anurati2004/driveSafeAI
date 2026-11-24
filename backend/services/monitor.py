"""Time-based drowsiness state machine, one instance per active monitoring session."""
import threading
import time

SENSITIVITY_SECONDS = {"low": 2.0, "medium": 1.5, "high": 1.0}  # continuous closure before alert
MAX_BLINK_SECONDS = 0.5   # closures shorter than this are normal blinks
_states = {}
_lock = threading.Lock()


class SessionState:
    def __init__(self, session_id, user_id, ear_threshold, sensitivity):
        self.session_id, self.user_id = session_id, user_id
        self.ear_threshold = ear_threshold
        self.closure_seconds = SENSITIVITY_SECONDS.get(sensitivity, 1.5)
        self.started = self.last_seen = time.time()
        self.closed_since = None
        self.blinks = 0
        self.alerts = 0
        self.alert_active = False

    def update(self, ear, now):
        self.last_seen = now
        new_alert = False

        if ear is None:  # no face: never count as closure (head turned / camera blocked)
            self.closed_since, self.alert_active = None, False
            return self._result("no_face", ear, 0.0, False)

        if ear < self.ear_threshold:
            if self.closed_since is None:
                self.closed_since = now
            closed_for = now - self.closed_since
            if closed_for >= self.closure_seconds:
                if not self.alert_active:      # one event per closure episode
                    self.alert_active, new_alert = True, True
                    self.alerts += 1
                return self._result("drowsy", ear, closed_for, new_alert)
            return self._result("eyes_closed", ear, closed_for, False)

        # eyes open: a short closure that just ended counts as a blink
        if self.closed_since is not None and not self.alert_active:
            if now - self.closed_since < MAX_BLINK_SECONDS:
                self.blinks += 1
        self.closed_since, self.alert_active = None, False
        return self._result("eyes_open", ear, 0.0, False)

    def _result(self, status, ear, closed_for, new_alert):
        return {"status": status, "face_detected": ear is not None,
                "ear": None if ear is None else round(ear, 3),
                "closed_seconds": round(closed_for, 2), "drowsy": status == "drowsy",
                "new_alert": new_alert, "blinks": self.blinks, "alerts": self.alerts}


def get(session_id):
    with _lock:
        return _states.get(session_id)


def create(session_id, user_id, settings):
    st = SessionState(session_id, user_id, settings.ear_threshold, settings.sensitivity)
    with _lock:
        _states[session_id] = st
    return st


def pop(session_id):
    with _lock:
        return _states.pop(session_id, None)

"""
Physical Movement Tracker — YOLO-based multi-person detection.

Detects and tracks every visible person using YOLOv8/v11 (class 0).
Enforces a configurable rectangular boundary inside the camera frame.

Alert rules (match the brief exactly):
  - Any person whose bbox centre is outside the boundary
      → alert_type = "BOUNDARY_VIOLATION"  (fires every frame; caller throttles)
  - Person disappears from frame entirely (was visible, now gone)
      → alert_type = "PERSON_MISSING"       (is_new_alert=True on first missing frame only)
      → subsequent missing frames            is_new_alert=False, alert_type="PERSON_STILL_MISSING"
  - Person reappears → missing state resets; next disappearance fires a NEW alert
  - Temporary failures (< MISSING_GRACE_FRAMES consecutive misses) are suppressed
    to avoid false alerts from brief detection glitches.

Fallback when YOLO model is absent:
  - OpenCV skin-tone + variance detection on the actual camera frame
  - Never uses random/simulated data
"""

import os
import base64
import time
import math
from typing import Optional, Dict, Any, List

# How many consecutive missed frames before we declare person MISSING
# (3 frames × 300 ms/frame ≈ 0.9 s grace period — absorbs brief detection glitches)
MISSING_GRACE_FRAMES = 3

DEFAULT_BOUNDARY = {
    "x1": 10.0,
    "y1":  5.0,
    "x2": 90.0,
    "y2": 95.0,
}


class MovementTracker:
    """YOLO-based physical movement and boundary enforcement tracker."""

    def __init__(self, model_path: str = None):
        # Resolve model path relative to this file so it works regardless of
        # which directory uvicorn / the caller is started from.
        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "models", "yolo11n.pt"
            )
        self.model_path = model_path
        self.model      = None
        self.status     = "INITIALIZING"
        self._load_model()

        # Per-session tracking state
        self._track_counter: int        = 0
        self._consecutive_misses: int   = 0   # frames in a row with no detection
        self._missing_alerted: bool     = False  # True while person absent & alert already sent
        self._last_track_id: int        = 1
        self._was_detected: bool        = False   # was anyone visible in the previous frame?

    # ── Model loading ──────────────────────────────────────────────────────────

    def _load_model(self):
        try:
            from ultralytics import YOLO
            if os.path.exists(self.model_path):
                self.model  = YOLO(self.model_path)
                self.status = "ACTIVE_YOLO"
                print(f"[MOVEMENT_TRACKER] YOLO model loaded: {self.model_path}")
            else:
                self.status = "ACTIVE_PIXEL_FALLBACK"
                print(f"[MOVEMENT_TRACKER] Model not found at '{self.model_path}'. "
                      "Using OpenCV pixel-based detection on real camera frames.")
        except Exception as exc:
            self.status = "ACTIVE_PIXEL_FALLBACK"
            print(f"[MOVEMENT_TRACKER] YOLO unavailable ({exc}). "
                  "Using OpenCV pixel-based detection.")

    # ── Public API ─────────────────────────────────────────────────────────────

    def process_frame(
        self,
        frame_data: Optional[Any] = None,
        boundary:   Optional[Dict[str, float]] = None,
        member_id:  str = "M001",
        seat_id:    str = "S01",
    ) -> Dict[str, Any]:
        """
        Analyse one camera frame.

        frame_data : BGR ndarray  OR  base64-encoded JPEG/PNG string.
                     None → returns a stable "person present, no violation" placeholder
                     (should not occur in production — the frontend always sends a frame).
        boundary   : optional override in 0-100 normalised % coordinates.
        """
        bnd = boundary or DEFAULT_BOUNDARY

        # Decode base64 → ndarray if needed
        frame = None
        if isinstance(frame_data, str):
            frame = self._decode_b64(frame_data)
        elif frame_data is not None:
            frame = frame_data

        if frame is None:
            # No frame supplied — return neutral placeholder (never fires an alert)
            return self._neutral_result(member_id, seat_id, bnd)

        if self.model is not None:
            return self._run_yolo(frame, bnd, member_id, seat_id)
        else:
            return self._pixel_detect(frame, bnd, member_id, seat_id)

    def reset_session(self):
        """Call when a new parliamentary session starts to clear all tracking state."""
        self._track_counter     = 0
        self._consecutive_misses = 0
        self._missing_alerted   = False
        self._last_track_id     = 1
        self._was_detected      = False

    # ── YOLO inference ─────────────────────────────────────────────────────────

    def _run_yolo(self, frame, bnd: Dict, member_id: str, seat_id: str) -> Dict[str, Any]:
        """Run YOLOv8/v11 person detection and return structured result."""
        h, w = frame.shape[:2]

        results = self.model.predict(frame, classes=[0], verbose=False, conf=0.40)[0]
        boxes   = results.boxes

        if boxes is None or len(boxes) == 0:
            return self._on_no_detection(member_id, seat_id, bnd)

        # Build a list of all detected persons
        detections: List[Dict] = []
        confs  = boxes.conf.cpu().tolist()
        xyxys  = boxes.xyxy.cpu().tolist()

        for idx, (xyxy, conf) in enumerate(zip(xyxys, confs)):
            x1, y1, x2, y2 = xyxy
            cx   = ((x1 + x2) / 2) / w * 100
            cy   = ((y1 + y2) / 2) / h * 100
            nx1  = x1 / w * 100
            ny1  = y1 / h * 100
            nx2  = x2 / w * 100
            ny2  = y2 / h * 100
            inside   = (bnd["x1"] <= cx <= bnd["x2"]) and (bnd["y1"] <= cy <= bnd["y2"])
            detections.append({
                "idx": idx, "cx": round(cx, 1), "cy": round(cy, 1),
                "nx1": round(nx1, 1), "ny1": round(ny1, 1),
                "nx2": round(nx2, 1), "ny2": round(ny2, 1),
                "conf": round(conf, 3), "inside": inside,
            })

        return self._on_detections(detections, bnd, member_id, seat_id)

    # ── Pixel-based fallback ───────────────────────────────────────────────────

    def _pixel_detect(self, frame, bnd: Dict, member_id: str, seat_id: str) -> Dict[str, Any]:
        """
        Detect person presence from raw pixels when YOLO is unavailable.
        Uses skin-tone HSV masking + image variance on the actual camera frame.
        No random data — every result is derived from the supplied frame.
        """
        try:
            import cv2
            import numpy as np

            h, w = frame.shape[:2]
            small = cv2.resize(frame, (160, 90))
            hsv   = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)

            # Skin-tone range 1 (yellow/olive → dark brown)
            m1 = cv2.inRange(hsv,
                             np.array([0,  20,  70],  dtype=np.uint8),
                             np.array([25, 255, 255], dtype=np.uint8))
            # Skin-tone range 2 (wrap-around red hue)
            m2 = cv2.inRange(hsv,
                             np.array([160, 20,  70],  dtype=np.uint8),
                             np.array([180, 255, 255], dtype=np.uint8))
            skin = cv2.bitwise_or(m1, m2)
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            skin   = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, kernel)

            skin_ratio = int(np.sum(skin > 0)) / (small.shape[0] * small.shape[1])
            # Use skin-ratio ONLY — do NOT fall back to variance, because any
            # indoor room background (walls, daylight, furniture) has variance > 200
            # even when no person is present, causing false "detected" results.
            present    = skin_ratio > 0.03

            if not present:
                return self._on_no_detection(member_id, seat_id, bnd)

            # Estimate bbox from largest skin contour
            contours, _ = cv2.findContours(skin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                largest   = max(contours, key=cv2.contourArea)
                x, y, cw, ch = cv2.boundingRect(largest)
                pad_x = cw * 1.2
                pad_y = ch * 3.5
                cx_px = x + cw / 2
                cy_px = y + ch / 2 + ch  # shift down to body midpoint
                nx1 = max(0,   (cx_px - pad_x / 2) / 160 * 100)
                ny1 = max(0,   (cy_px - pad_y / 2) / 90  * 100)
                nx2 = min(100, (cx_px + pad_x / 2) / 160 * 100)
                ny2 = min(100, (cy_px + pad_y / 2) / 90  * 100)
                cx  = (nx1 + nx2) / 2
                cy  = (ny1 + ny2) / 2
            else:
                cx, cy  = 50.0, 50.0
                nx1, ny1, nx2, ny2 = 30.0, 10.0, 70.0, 90.0

            conf = min(0.90, 0.60 + skin_ratio * 2)
            inside = (bnd["x1"] <= cx <= bnd["x2"]) and (bnd["y1"] <= cy <= bnd["y2"])
            det = {
                "idx": 0, "cx": round(cx, 1), "cy": round(cy, 1),
                "nx1": round(nx1, 1), "ny1": round(ny1, 1),
                "nx2": round(nx2, 1), "ny2": round(ny2, 1),
                "conf": round(conf, 3), "inside": inside,
            }
            return self._on_detections([det], bnd, member_id, seat_id)

        except Exception as exc:
            print(f"[MOVEMENT_TRACKER] Pixel detection error: {exc}")
            # On error assume present to avoid false NOT-SEATED
            return self._neutral_result(member_id, seat_id, bnd)

    # ── State machine helpers ──────────────────────────────────────────────────

    def _on_detections(self, dets: List[Dict], bnd: Dict, member_id: str, seat_id: str) -> Dict[str, Any]:
        """Called when ≥1 person detected.  Resets the missing counter."""
        # Someone appeared → reset missing state so next disappearance fires a fresh alert
        if not self._was_detected:
            self._missing_alerted    = False
            self._last_track_id     += 1
        self._was_detected       = True
        self._consecutive_misses = 0

        # Assign stable track IDs: first detection keeps _last_track_id; additional
        # detections get incremented IDs within this frame.
        track_id_base = self._last_track_id
        persons = []
        any_violation = False

        for i, det in enumerate(dets):
            tid = track_id_base + i
            violation = not det["inside"]
            if violation:
                any_violation = True
            persons.append({
                "track_id": tid,
                "cx": det["cx"], "cy": det["cy"],
                "bbox": {"x1": det["nx1"], "y1": det["ny1"],
                         "x2": det["nx2"], "y2": det["ny2"]},
                "confidence":       det["conf"],
                "inside_boundary":  det["inside"],
                "boundary_violation": violation,
            })

        # Use the primary (highest-conf) person for the top-level position fields
        primary = max(dets, key=lambda d: d["conf"])

        alert_type    = "BOUNDARY_VIOLATION" if any_violation else "NONE"
        alert_message = (
            "Warning: You have moved outside the designated boundary area. "
            "Please return to your assigned seat immediately."
            if any_violation else ""
        )

        return {
            "status":           self.status,
            "person_detected":  True,
            "person_count":     len(dets),
            "track_id":         self._last_track_id,
            "member_id":        member_id,
            "seat_id":          seat_id,
            "position": {
                "cx": primary["cx"], "cy": primary["cy"],
                "bbox": {
                    "x1": primary["nx1"], "y1": primary["ny1"],
                    "x2": primary["nx2"], "y2": primary["ny2"],
                },
            },
            "persons":          persons,
            "confidence":       round(primary["conf"], 3),
            "inside_boundary":  not any_violation,
            "boundary":         bnd,
            "alert_type":       alert_type,
            "alert_message":    alert_message,
            "is_new_alert":     any_violation,   # caller throttles boundary alerts
            "timestamp_ms":     int(time.time() * 1000),
        }

    def _on_no_detection(self, member_id: str, seat_id: str, bnd: Dict) -> Dict[str, Any]:
        """Called when zero persons detected in this frame."""
        self._consecutive_misses += 1

        # Suppress alerts for brief detection glitches
        if self._consecutive_misses < MISSING_GRACE_FRAMES:
            # Still within grace period — act as if still present
            return {
                "status":          self.status,
                "person_detected": True,   # suppressed
                "person_count":    0,
                "track_id":        self._last_track_id,
                "member_id":       member_id,
                "seat_id":         seat_id,
                "position":        None,
                "persons":         [],
                "confidence":      0.0,
                "inside_boundary": True,
                "boundary":        bnd,
                "alert_type":      "NONE",
                "alert_message":   "",
                "is_new_alert":    False,
                "timestamp_ms":    int(time.time() * 1000),
            }

        # Grace period exceeded — declare missing
        is_new_alert = False
        if self._was_detected and not self._missing_alerted:
            is_new_alert          = True
            self._missing_alerted = True

        self._was_detected = False

        alert_type = "PERSON_MISSING" if is_new_alert else (
            "PERSON_STILL_MISSING" if self._missing_alerted else "NONE"
        )
        alert_message = (
            "Warning: You are not visible in the camera frame. "
            "Please return to your seat and face the camera."
            if is_new_alert else ""
        )

        return {
            "status":          self.status,
            "person_detected": False,
            "person_count":    0,
            "track_id":        self._last_track_id,
            "member_id":       member_id,
            "seat_id":         seat_id,
            "position":        None,
            "persons":         [],
            "confidence":      0.0,
            "inside_boundary": False,
            "boundary":        bnd,
            "alert_type":      alert_type,
            "alert_message":   alert_message,
            "is_new_alert":    is_new_alert,
            "timestamp_ms":    int(time.time() * 1000),
        }

    def _neutral_result(self, member_id: str, seat_id: str, bnd: Dict) -> Dict[str, Any]:
        """Safe placeholder when no frame is provided (should not happen in production)."""
        return {
            "status":          self.status,
            "person_detected": True,
            "person_count":    1,
            "track_id":        self._last_track_id,
            "member_id":       member_id,
            "seat_id":         seat_id,
            "position":        {"cx": 50, "cy": 50,
                                "bbox": {"x1": 32, "y1": 10, "x2": 68, "y2": 90}},
            "persons":         [],
            "confidence":      0.0,
            "inside_boundary": True,
            "boundary":        bnd,
            "alert_type":      "NONE",
            "alert_message":   "",
            "is_new_alert":    False,
            "timestamp_ms":    int(time.time() * 1000),
        }

    # ── Utilities ──────────────────────────────────────────────────────────────

    @staticmethod
    def _decode_b64(b64: str):
        """Decode a base64 image string to an OpenCV BGR ndarray."""
        try:
            import numpy as np
            import cv2
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            raw   = base64.b64decode(b64)
            arr   = np.frombuffer(raw, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return frame
        except Exception as exc:
            print(f"[MOVEMENT_TRACKER] Frame decode error: {exc}")
            return None

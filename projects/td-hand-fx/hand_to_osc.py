"""
Hand tracking → OSC bridge for TouchDesigner.
Uses MediaPipe Tasks API (modern, works on Apple Silicon).

Run:
    python3 hand_to_osc.py

In TouchDesigner:
    Drop "OSC In CHOP", port 7000, Active On.
    Channels:
        /hand/0/0/x ... /hand/0/20/z
        /index_tip/x, /index_tip/y, /index_tip/z   (convenience: hand 0 landmark 8)
        /hand/count

Press Q in the preview window to quit.
"""
import os
import time
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from pythonosc.udp_client import SimpleUDPClient

TD_HOST = "127.0.0.1"
TD_PORT = 7000
MODEL_PATH = os.path.join(os.path.dirname(__file__), "hand_landmarker.task")


def main():
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: model not found at {MODEL_PATH}")
        return

    osc = SimpleUDPClient(TD_HOST, TD_PORT)

    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.VIDEO,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = mp_vision.HandLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: cannot open webcam. Grant Terminal camera permission in System Settings.")
        return

    print(f"Streaming OSC to {TD_HOST}:{TD_PORT} — press Q to quit")
    t0 = time.time()

    while cap.isOpened():
        ok, frame = cap.read()
        if not ok:
            break
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts_ms = int((time.time() - t0) * 1000)
        result = landmarker.detect_for_video(mp_image, ts_ms)

        num_hands = 0
        if result.hand_landmarks:
            num_hands = len(result.hand_landmarks)
            for hand_idx, hand_lm in enumerate(result.hand_landmarks):
                for lm_idx, lm in enumerate(hand_lm):
                    osc.send_message(f"/hand/{hand_idx}/{lm_idx}/x", float(lm.x))
                    osc.send_message(f"/hand/{hand_idx}/{lm_idx}/y", float(1.0 - lm.y))
                    osc.send_message(f"/hand/{hand_idx}/{lm_idx}/z", float(lm.z))
                    cx, cy = int(lm.x * frame.shape[1]), int(lm.y * frame.shape[0])
                    cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
                if hand_idx == 0:
                    tip = hand_lm[8]
                    osc.send_message("/index_tip/x", float(tip.x))
                    osc.send_message("/index_tip/y", float(1.0 - tip.y))
                    osc.send_message("/index_tip/z", float(tip.z))

        osc.send_message("/hand/count", num_hands)

        cv2.putText(frame, f"hands: {num_hands}  (Q to quit)",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("Hand -> OSC (TD :7000)", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

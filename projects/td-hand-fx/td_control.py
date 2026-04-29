"""
TouchDesigner external control bridge.

Sends OSC messages to a TD project that has an OSC In CHOP listening on port 7000.

Usage:
    python td_control.py burst       # trigger a particle burst
    python td_control.py count 80000 # set particle count
    python td_control.py color 1 0.4 0.9
    python td_control.py preset fire
    python td_control.py preset water
    python td_control.py preset lightning
"""
import sys
from pythonosc.udp_client import SimpleUDPClient

TD_HOST = "127.0.0.1"
TD_PORT = 7000

PRESETS = {
    "fire":      {"color": [1.0, 0.4, 0.05], "count": 60000, "life": 1.2, "force": 8.0},
    "water":     {"color": [0.2, 0.6, 1.0],  "count": 40000, "life": 2.5, "force": 3.0},
    "lightning": {"color": [0.7, 0.8, 1.0],  "count": 30000, "life": 0.4, "force": 15.0},
    "smoke":     {"color": [0.5, 0.5, 0.55], "count": 50000, "life": 4.0, "force": 1.5},
    "magic":     {"color": [0.9, 0.3, 1.0],  "count": 80000, "life": 2.0, "force": 5.0},
}


def main():
    client = SimpleUDPClient(TD_HOST, TD_PORT)
    args = sys.argv[1:]

    if not args:
        print(__doc__)
        return

    cmd = args[0]

    if cmd == "burst":
        client.send_message("/particles/burst", 1)
        print("→ burst")

    elif cmd == "count" and len(args) == 2:
        n = int(args[1])
        client.send_message("/particles/count", n)
        print(f"→ count {n}")

    elif cmd == "color" and len(args) == 4:
        rgb = [float(x) for x in args[1:4]]
        client.send_message("/particles/color", rgb)
        print(f"→ color {rgb}")

    elif cmd == "preset" and len(args) == 2:
        name = args[1]
        if name not in PRESETS:
            print(f"Unknown preset. Available: {list(PRESETS)}")
            return
        p = PRESETS[name]
        client.send_message("/particles/color", p["color"])
        client.send_message("/particles/count", p["count"])
        client.send_message("/particles/life", p["life"])
        client.send_message("/particles/force", p["force"])
        print(f"→ preset '{name}' applied")

    else:
        print(__doc__)


if __name__ == "__main__":
    main()

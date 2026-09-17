// ─────────────────────────────────────────────────────────────────────────
// "Tower of Pisa" — lifted VERBATIM from the Metalab Webkit preset library
// (github.com/enricodeia/metalab-webkit → .presets/cylinder.json, the
// CylinderCarousel component). Do not hand-edit: re-export it from the
// webkit panel and paste the new block in, so the two stay identical.
//
// The leaning spiral: 18 cards on 3 turns rising 19 units, shot from far
// left (camera.x -30) through a 12° long lens, with the drum itself tilted
// -10° on Z. That tilt is the whole gag — the tower leans.
// ─────────────────────────────────────────────────────────────────────────

export const TOWER_OF_PISA = {
  "layout": {
    "shape": "spiral",
    "perRow": 21,
    "rows": 4,
    "radius": 4.3,
    "rowGap": 3.1,
    "curve": -0.12,
    "faceCenter": true,
    "faceCamera": false,
    "spiralTurns": 3,
    "spiralRise": 19,
    "spiralGrow": 2.8
  },
  "images": {
    "source": "metalab",
    "count": 18,
    "seed": 67,
    "imgW": 700,
    "imgH": 1050
  },
  "geometry": {
    "planeW": 5.65,
    "aspect": 1.16,
    "segments": 20,
    "bend": 0.26,
    "borderRadius": 0.06
  },
  "camera": {
    "x": -30,
    "y": 15.5,
    "z": 60,
    "lookAtX": 0,
    "lookAtY": 1,
    "fov": 12,
    "tiltX": -4,
    "tiltZ": -10
  },
  "motion": {
    "autoSpin": 0.5,
    "dragToSpin": true,
    "invertDrag": false,
    "damping": 0.92,
    "useExternal": false
  },
  "itemMotion": {
    "loopSpeed": 1,
    "stagger": 0.35,
    "spinY": 0,
    "swing": 0,
    "flip": 0,
    "flipSpeed": 1,
    "tiltZ": 0,
    "tiltAnim": 0,
    "bob": 0,
    "bobSpeed": 1,
    "pulse": 0,
    "pulseSpeed": 1
  },
  "interaction": {
    "orbit": {
      "enabled": false,
      "damping": 0.08,
      "zoom": true,
      "autoRotate": false,
      "autoRotateSpeed": 0.6,
      "minDist": 3,
      "maxDist": 40
    },
    "parallax": {
      "enabled": true,
      "strengthX": 2.3,
      "strengthY": 5.8,
      "ease": 0.06
    },
    "momentum": {
      "enabled": true,
      "decay": 0.92
    },
    "focus": {
      "enabled": true,
      "fill": 0.72,
      "duration": 1.1,
      "ease": "power4.inOut"
    }
  },
  "reveal": {
    "enabled": false,
    "startPct": 0.12,
    "stagger": 0.04,
    "duration": 1.1,
    "ease": "expo.out",
    "from": "center",
    "distance": 3.5,
    "once": false,
    "scrollLen": 220
  },
  "scroll": {
    "cameraEnabled": false,
    "direction": "topDown",
    "travel": 24,
    "dolly": 0,
    "lerp": 0.08,
    "length": 320
  },
  "look": {
    "bgColor": "#0c0c0c",
    "opacity": 0.96
  },
  "smooothy": {
    "enabled": false,
    "infinite": true,
    "snap": false,
    "lerpFactor": 0.085,
    "dragSensitivity": 0.005,
    "speedDecay": 0.85,
    "scrollSensitivity": 1,
    "bounceLimit": 1,
    "rotationFactor": 1
  }
};

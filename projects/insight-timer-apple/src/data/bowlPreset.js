// The bowl, as HE dialled it (his JSON, 2026-09-21 — "utilizzassi questi
// valori per il materiale della bowl per entrambe le due esperienze"): the
// Bowl panel's own export, verbatim, merged over `CONFIG.bowl` at the end of
// config.js. Both experiences share the one bowl, so both get it. Edit this
// file to re-import a new export; the annotated defaults in config.js stay
// as the record of what each number means.
export const BOWL_PRESET = {
  "show": true,
  "model": {
    "source": "glb",
    "glb": "/models/bowl-option-c.glb",
    "rotX": 16,
    "rotZ": 0,
    "noiseSpace": 8,
    "reliefAA": 0,
    "wireframe": false
  },
  "cam": {
    "fov": 26,
    "dist": 5
  },
  "poses": {
    "hero": { "x": 0, "y": 0, "size": 0.3, "opacity": 1, "tilt": 0, "tiltZ": 0 },
    "until": { "x": 0, "y": 0.02, "size": 0.46, "opacity": 1, "tilt": 9, "tiltZ": 11 },
    "hand": { "x": 0, "y": 0, "size": 0.11, "opacity": 1, "tilt": 0, "tiltZ": 0 },
    "pin": { "x": 0, "y": 0, "size": 0.11, "opacity": 1, "tilt": 0, "tiltZ": 0 },
    "end": { "x": 0, "y": 0, "size": 0.11, "opacity": 0, "tilt": 0, "tiltZ": 0 }
  },
  "riseAt": 0.34,
  "fallAt": 0.7,
  "lockLast": true,
  "fadeAfter": 0.6,
  "handEase": "expo",
  "fallEase": "smooth",
  "parkIn": 1,
  "endFrom": 0.96,
  "endTo": 1,
  "spin": { "start": 38, "turns": 0.55, "pinTurns": 0.85, "idle": 0.05 },
  "intro": { "fromVh": 0.55, "fromScale": 0.84, "dur": 1.6, "delay": 1.15, "ease": "expo.out" },
  "render": { "toneMapping": "aces", "exposure": 1 },
  "post": { "enabled": true, "vignette": 0.14 },
  "lookCursor": { "enabled": true, "strengthX": 6, "strengthY": 4, "ease": 0.06 },
  "material": {
    "A": {
      "label": "outer shell",
      "color": "#e2af73",
      "roughness": 0.555,
      "metalness": 1,
      "ior": 1.5,
      "specularIntensity": 1.05,
      "envMapIntensity": 0.53,
      "clearcoat": 0,
      "clearcoatRoughness": 0.21,
      "side": "front",
      "relief": { "enabled": true, "strength": 0.0065, "source": "image", "imageScale": 5.7, "imageRepeat": [1, 1] },
      "reliefNoise": {
        "type": "Voronoi 1", "seed": 143, "octaves": 3.77, "lacunarity": 1.75, "gain": 0.17,
        "exponent": 2.298, "absolute": false, "oscale": 9.67,
        "scale": [1, 1, 1], "offset": [0, 0, 0], "rotation": [0, 0, 0],
        "cycles": 1, "lowClip": 0, "highClip": 1, "brightness": -0.366, "contrast": -0.955
      },
      "colorNoise": { "enabled": false },
      "ramp": { "mix": 0, "pos": 0.5, "soft": 0.9, "a": "#ffffff", "b": "#ffffff" },
      "rampNoise": {
        "type": "Perlin", "seed": 0, "octaves": 3, "lacunarity": 2, "gain": 0.5,
        "exponent": 1, "absolute": false, "oscale": 100,
        "scale": [1, 1, 1], "offset": [0, 0, 0], "rotation": [0, 0, 0],
        "cycles": 1, "lowClip": 0, "highClip": 1, "brightness": 0, "contrast": 0
      }
    },
    "B": {
      "label": "inner surface",
      "color": "#c2856b",
      "roughness": 0.455,
      "metalness": 0.97,
      "ior": 1,
      "specularIntensity": 0,
      "envMapIntensity": 0,
      "clearcoat": 0.09,
      "clearcoatRoughness": 0.11,
      "side": "front",
      "relief": { "enabled": false, "strength": 0, "source": "noise", "imageScale": 1.8, "imageRepeat": [1, 1] },
      "reliefNoise": {
        "type": "Perlin", "seed": 0, "octaves": 3, "lacunarity": 2, "gain": 0.5,
        "exponent": 1, "absolute": false, "oscale": 287.48,
        "scale": [1, 1, 1], "offset": [0, 0, 0], "rotation": [0, 0, 0],
        "cycles": 1, "lowClip": 0, "highClip": 1, "brightness": 0, "contrast": 0
      },
      "colorNoise": { "enabled": false },
      "ramp": { "mix": 0.34, "pos": 0.32, "soft": 0.51, "a": "#c9974e", "b": "#eacd91" },
      "rampNoise": {
        "type": "Gaseous", "seed": 248, "octaves": 8, "lacunarity": 2.1, "gain": 0.5,
        "exponent": 2.3265, "absolute": false, "oscale": 267.83,
        "scale": [1, 0.38, 1], "offset": [-1.33, -1.55, -5.7], "rotation": [-50, 90, 20],
        "cycles": 1, "lowClip": 0, "highClip": 1, "brightness": 0.751, "contrast": 0.764
      }
    }
  },
  "studio": {
    "hdr": {
      "on": false,
      "files": ["/hdr/creative_office.exr", "/hdr/gsg_prostudiosmetal_vol2_31_env.exr"],
      "mix": 0.5, "intensity": 1, "rotation": 0
    },
    "preset": "Studio warm",
    "intensity": 1.93,
    "rotation": 176,
    "domeTop": "#8a7a60",
    "domeBottom": "#1d1913",
    "domeIntensity": 0.88,
    "domeGradient": 1.5,
    "sceneLightScale": 0.055,
    "pmremSigma": 0.028,
    "isolate": -1,
    "lights": [
      { "name": "key", "on": true, "color": "#fff2dc", "intensity": 11, "w": 21, "h": 17, "soft": 0.62, "az": -54, "el": 28, "dist": 13, "roll": 0, "toEnv": 1, "toScene": 1 },
      { "name": "fill", "on": true, "color": "#dfe8ff", "intensity": 5.9, "w": 22, "h": 16, "soft": 0.9, "az": 78, "el": 10, "dist": 16, "roll": 0, "toEnv": 1, "toScene": 1 },
      { "name": "rim", "on": true, "color": "#ffd9a4", "intensity": 7, "w": 11, "h": 7, "soft": 0.45, "az": 166, "el": 24, "dist": 12, "roll": 0, "toEnv": 1, "toScene": 1 }
    ]
  }
};

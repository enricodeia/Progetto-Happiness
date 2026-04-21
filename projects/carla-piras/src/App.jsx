import { useControls, folder, button, Leva } from "leva";
import { useEffect, useState } from "react";
import Hero from "./components/Hero.jsx";
import MeshlineCursor from "./components/MeshlineCursor.jsx";
import PointerDot from "./components/PointerDot.jsx";

const EASE_OUT = [
  "none",
  "power1.out",
  "power2.out",
  "power3.out",
  "power4.out",
  "back.out(1.7)",
  "bounce.out",
  "circ.out",
  "elastic.out(1,0.3)",
  "expo.out",
  "sine.out",
];

const EASE_IN = [
  "power1.in",
  "power2.in",
  "power3.in",
  "power4.in",
  "back.in(1.7)",
  "bounce.in",
  "circ.in",
  "elastic.in(1,0.3)",
  "expo.in",
  "sine.in",
];

const EASE_INOUT = [
  "power1.inOut",
  "power2.inOut",
  "power3.inOut",
  "power4.inOut",
  "back.inOut(1.7)",
  "bounce.inOut",
  "circ.inOut",
  "elastic.inOut(1,0.3)",
  "expo.inOut",
  "sine.inOut",
];

const FONT_OPTIONS = {
  Fraunces: "Fraunces, Georgia, serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "DM Serif Display": "'DM Serif Display', Georgia, serif",
  "Instrument Serif": "'Instrument Serif', Georgia, serif",
  "Cormorant Garamond": "'Cormorant Garamond', Georgia, serif",
  "EB Garamond": "'EB Garamond', Georgia, serif",
  "Young Serif": "'Young Serif', Georgia, serif",
  Italiana: "Italiana, Georgia, serif",
  Prata: "Prata, Georgia, serif",
  "Bodoni Moda": "'Bodoni Moda', Georgia, serif",
  "Ibarra Real Nova": "'Ibarra Real Nova', Georgia, serif",
  "Crimson Pro": "'Crimson Pro', Georgia, serif",
  "Libre Caslon Text": "'Libre Caslon Text', Georgia, serif",
};

export default function App() {
  const [replayKey, setReplayKey] = useState(0);

  const typography = useControls("Typography", {
    titleFont: {
      value: "'Instrument Serif', Georgia, serif",
      options: FONT_OPTIONS,
    },
    titleWeight: { value: 250, min: 200, max: 700, step: 50 },
    titleTracking: { value: 0, min: -0.08, max: 0.04, step: 0.005 },
    titleSizeVw: { value: 11.1, min: 4, max: 20, step: 0.1 },
    titleColorCarla: "#1f3a78",
    titleColorPiras: "#1f3a78",
  });

  const preloader = useControls("Preloader", {
    charsDuration: { value: 1.55, min: 0.4, max: 4, step: 0.05 },
    charsEase: { value: "power4.out", options: EASE_OUT },
    charsStagger: { value: 0.08, min: 0, max: 0.2, step: 0.005 },
    charsYFrom: { value: 70, min: 10, max: 200, step: 1 },
    gapBetweenWords: { value: 0.55, min: 0, max: 2, step: 0.05 },
    holdDuration: { value: 0.4, min: 0, max: 1.5, step: 0.05 },
    percentageDuration: { value: 1.2, min: 0.3, max: 3, step: 0.05 },
    percentageFadeDuration: { value: 0.45, min: 0.1, max: 1.2, step: 0.05 },
    maskDuration: { value: 1.4, min: 0.5, max: 3, step: 0.05 },
    maskEase: { value: "power3.inOut", options: EASE_INOUT },
    photoScaleFrom: { value: 1.15, min: 0.8, max: 1.5, step: 0.01 },
    lettersSideOffset: { value: 17, min: 8, max: 40, step: 0.5 },
    letterTopOffset: { value: 11.0, min: 4, max: 25, step: 0.5 },
    letterBottomOffset: { value: 7.5, min: 4, max: 25, step: 0.5 },
    letterFinalYVh: { value: 0, min: -20, max: 20, step: 0.5 },
    imageHeightVh: { value: 72, min: 40, max: 90, step: 1 },
    imageAspect: { value: 0.68, min: 0.4, max: 1.2, step: 0.005 },
    uiFadeDelay: { value: 0.1, min: 0, max: 1, step: 0.05 },
    replay: button(() => setReplayKey((k) => k + 1)),
  });

  const chisono = useControls("Sections", {
    exitDuration: { value: 0.45, min: 0.2, max: 1.2, step: 0.05 },
    exitEase: { value: "circ.in", options: EASE_IN },
    exitStagger: { value: 0.025, min: 0, max: 0.15, step: 0.005 },
    parallaxScale: { value: 1.12, min: 1, max: 1.4, step: 0.01 },
    bioEnterDuration: { value: 0.9, min: 0.3, max: 2, step: 0.05 },
    bioEnterEase: { value: "power3.out", options: EASE_OUT },
  });

  const tilt = useControls("Photo tilt", {
    enabled: true,
    angle: { value: 5, min: 0, max: 15, step: 0.5 },
    drift: { value: 8, min: 0, max: 30, step: 0.5 },
    smoothing: { value: 0.7, min: 0.1, max: 2, step: 0.05 },
  });

  const meta = useControls("Meta position", {
    leftX: { value: 25.7, min: 0, max: 50, step: 0.1 },
    leftY: { value: 14.0, min: 0, max: 95, step: 0.1 },
    rightX: { value: 75.6, min: 50, max: 100, step: 0.1 },
    rightY: { value: 25.3, min: 0, max: 95, step: 0.1 },
  });

  const roundness = useControls("Roundness", {
    photo: { value: 0, min: 0, max: 80, step: 1 },
    card: { value: 65, min: 0, max: 80, step: 1 },
    form: { value: 65, min: 0, max: 80, step: 1 },
    inputs: { value: 31, min: 0, max: 40, step: 1 },
  });

  const pointer = useControls("Pointer", {
    enabled: true,
    size: { value: 6, min: 2, max: 24, step: 1 },
    color: "#3b5fcc",
    ring: false,
    ringSize: { value: 18, min: 6, max: 60, step: 1 },
  });

  const cursor = useControls("Cursor trail", {
    enabled: true,
    numLines: { value: 4, min: 1, max: 8, step: 1 },
    numPoints: { value: 36, min: 6, max: 60, step: 1 },
    spring: { value: 0.04, min: 0.01, max: 0.25, step: 0.005 },
    friction: { value: 0.9, min: 0.5, max: 0.98, step: 0.01 },
    lerp: { value: 0.99, min: 0.5, max: 0.99, step: 0.01 },
    lineWidth: { value: 0.01, min: 0.002, max: 0.12, step: 0.001 },
    radius: { value: 0.03, min: 0, max: 0.6, step: 0.01 },
    speedMultiplier: { value: 0.55, min: 0.1, max: 3, step: 0.05 },
    colors: folder({
      c1: "#1f3a78",
      c2: "#4a6cb8",
      c3: "#7b98d8",
      c4: "#b5c8ea",
    }),
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-display", typography.titleFont);
    root.style.setProperty("--display-weight", typography.titleWeight);
    root.style.setProperty("--display-tracking", `${typography.titleTracking}em`);
  }, [typography.titleFont, typography.titleWeight, typography.titleTracking]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--r-photo", `${roundness.photo}px`);
    root.style.setProperty("--r-card", `${roundness.card}px`);
    root.style.setProperty("--r-form", `${roundness.form}px`);
    root.style.setProperty("--r-input", `${roundness.inputs}px`);
  }, [roundness.photo, roundness.card, roundness.form, roundness.inputs]);

  return (
    <>
      <Leva hidden />
      <MeshlineCursor params={cursor} />
      <PointerDot params={pointer} />
      <Hero
        key={replayKey}
        preloader={preloader}
        typography={typography}
        chisono={chisono}
        tilt={tilt}
        meta={meta}
      />
    </>
  );
}

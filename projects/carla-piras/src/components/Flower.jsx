import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import "./Flower.css";

export const VARIANTS = {
  wave: {
    stem: "M 50 150 Q 46 118 50 90 T 52 68",
    leaves: [
      "M 50 122 Q 32 116 24 124 Q 36 130 46 122",
      "M 51 98 Q 68 92 76 102 Q 65 106 54 98",
    ],
    cx: 52,
    cy: 62,
    r: 3,
    count: 6,
    petalLen: 22,
    petalW: 8,
  },
  taper: {
    stem: "M 50 150 L 50 125 Q 52 98 53 72",
    leaves: ["M 53 110 Q 68 104 74 114 Q 63 118 55 110"],
    cx: 53,
    cy: 66,
    r: 2.5,
    count: 5,
    petalLen: 20,
    petalW: 6,
  },
  twist: {
    stem: "M 50 150 C 40 135 60 115 50 95 C 40 80 60 72 52 62",
    leaves: ["M 46 110 Q 30 104 24 114 Q 34 120 44 112"],
    cx: 52,
    cy: 56,
    r: 3,
    count: 6,
    petalLen: 22,
    petalW: 8,
  },
  knot: {
    stem:
      "M 50 150 Q 48 130 46 115 C 58 112 60 100 48 102 C 38 105 44 90 50 84 Q 52 74 52 62",
    leaves: [],
    cx: 52,
    cy: 56,
    r: 3,
    count: 8,
    petalLen: 20,
    petalW: 6,
  },
  lean: {
    stem: "M 50 150 Q 48 124 42 98 T 36 66",
    leaves: ["M 40 104 Q 56 98 64 108 Q 53 114 44 106"],
    cx: 36,
    cy: 60,
    r: 3,
    count: 6,
    petalLen: 22,
    petalW: 8,
  },
  zigzag: {
    stem: "M 50 150 Q 42 135 50 120 Q 58 105 50 90 Q 42 78 52 64",
    leaves: [],
    cx: 52,
    cy: 58,
    r: 2.5,
    count: 5,
    petalLen: 20,
    petalW: 7,
  },
};

export function makePetal(cx, cy, len, w) {
  return `M ${cx} ${cy} Q ${cx - w} ${cy - len / 2} ${cx} ${cy - len} Q ${cx + w} ${cy - len / 2} ${cx} ${cy} Z`;
}

export default function Flower({
  animate,
  size = 46,
  delay = 0,
  variant = "wave",
  style,
  className = "",
}) {
  const ref = useRef(null);
  const v = VARIANTS[variant] || VARIANTS.wave;
  const petalPath = makePetal(v.cx, v.cy, v.petalLen, v.petalW);

  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const paths = svg.querySelectorAll(
      ".fl-stem, .fl-leaf, .fl-petal, .fl-center"
    );
    paths.forEach((p) => {
      const len = p.getTotalLength ? p.getTotalLength() : 0;
      if (len > 0) {
        p.style.strokeDasharray = String(len);
        p.style.strokeDashoffset = String(len);
      }
    });
  }, [variant]);

  useEffect(() => {
    if (!animate) return;
    const svg = ref.current;
    if (!svg) return;

    const stem = svg.querySelector(".fl-stem");
    const leaves = Array.from(svg.querySelectorAll(".fl-leaf"));
    const petals = Array.from(svg.querySelectorAll(".fl-petal"));
    const center = svg.querySelector(".fl-center");

    const tl = gsap.timeline({ delay });

    if (stem) {
      tl.to(
        stem,
        { strokeDashoffset: 0, duration: 1.3, ease: "power2.out" },
        0
      );
    }
    if (leaves.length) {
      tl.to(
        leaves,
        {
          strokeDashoffset: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.2,
        },
        0.55
      );
    }
    if (center) {
      tl.to(
        center,
        { strokeDashoffset: 0, duration: 0.45, ease: "power2.out" },
        1.3
      );
    }
    if (petals.length) {
      tl.to(
        petals,
        {
          strokeDashoffset: 0,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.09,
        },
        1.45
      );
    }

    return () => tl.kill();
  }, [animate, delay]);

  return (
    <svg
      ref={ref}
      className={`flower ${className}`.trim()}
      viewBox="0 0 100 150"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: `${size}px`, ...style }}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="fl-stem" d={v.stem} />
        {v.leaves.map((d, i) => (
          <path key={i} className="fl-leaf" d={d} />
        ))}
        <circle className="fl-center" cx={v.cx} cy={v.cy} r={v.r} />
        {Array.from({ length: v.count }).map((_, i) => (
          <path
            key={i}
            className="fl-petal"
            d={petalPath}
            transform={`rotate(${(360 / v.count) * i} ${v.cx} ${v.cy})`}
          />
        ))}
      </g>
    </svg>
  );
}

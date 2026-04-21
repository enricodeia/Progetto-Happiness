import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { VARIANTS, makePetal } from "./Flower.jsx";
import "./FlowerBurst.css";

const VARIANT_KEYS = Object.keys(VARIANTS);
const rand = (min, max) => min + Math.random() * (max - min);

function generateConfigs(count) {
  return Array.from({ length: count }, () => ({
    variantKey: VARIANT_KEYS[Math.floor(Math.random() * VARIANT_KEYS.length)],
    size: Math.round(rand(26, 82)),
    left: rand(2, 96),
    bottom: rand(0, 82),
    rotation: rand(-18, 18),
    opacity: rand(0.6, 1),
    delay: rand(0, 1.3),
  }));
}

export default function FlowerBurst({ active, count = 36 }) {
  const svgsRef = useRef([]);
  const timelinesRef = useRef([]);
  const configs = useMemo(() => generateConfigs(count), [count]);

  useLayoutEffect(() => {
    svgsRef.current.forEach((svg) => {
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
    });
  }, [configs]);

  useEffect(() => {
    svgsRef.current.forEach((svg, i) => {
      if (!svg) return;
      const cfg = configs[i];
      const stem = svg.querySelector(".fl-stem");
      const leaves = Array.from(svg.querySelectorAll(".fl-leaf"));
      const center = svg.querySelector(".fl-center");
      const petals = Array.from(svg.querySelectorAll(".fl-petal"));
      const all = [stem, ...leaves, center, ...petals].filter(Boolean);

      // Kill any running timeline for this flower (prevents race on
      // rapid enter/leave). Tweens inside the killed timeline stop at
      // their current strokeDashoffset — that value becomes the
      // starting point for the new timeline.
      const prev = timelinesRef.current[i];
      if (prev) prev.kill();

      if (active) {
        const tl = gsap.timeline({ delay: cfg.delay });
        if (stem) {
          tl.to(
            stem,
            {
              strokeDashoffset: 0,
              duration: 0.85,
              ease: "power2.out",
              overwrite: "auto",
            },
            0
          );
        }
        if (leaves.length) {
          tl.to(
            leaves,
            {
              strokeDashoffset: 0,
              duration: 0.55,
              ease: "power2.out",
              stagger: 0.12,
              overwrite: "auto",
            },
            0.35
          );
        }
        if (center) {
          tl.to(
            center,
            {
              strokeDashoffset: 0,
              duration: 0.3,
              ease: "power2.out",
              overwrite: "auto",
            },
            0.85
          );
        }
        if (petals.length) {
          tl.to(
            petals,
            {
              strokeDashoffset: 0,
              duration: 0.6,
              ease: "power2.out",
              stagger: 0.06,
              overwrite: "auto",
            },
            0.95
          );
        }
        timelinesRef.current[i] = tl;
      } else {
        const tl = gsap.timeline({ delay: cfg.delay * 0.2 });
        all.forEach((p) => {
          const len = p.getTotalLength ? p.getTotalLength() : 0;
          tl.to(
            p,
            {
              strokeDashoffset: len,
              duration: 0.4,
              ease: "power2.in",
              overwrite: "auto",
            },
            0
          );
        });
        timelinesRef.current[i] = tl;
      }
    });

    return () => {
      timelinesRef.current.forEach((tl) => {
        if (tl) tl.kill();
      });
    };
  }, [active, configs]);

  return (
    <div className="flower-burst" aria-hidden="true">
      {configs.map((cfg, i) => {
        const v = VARIANTS[cfg.variantKey];
        const petalPath = makePetal(v.cx, v.cy, v.petalLen, v.petalW);
        return (
          <svg
            key={i}
            ref={(el) => (svgsRef.current[i] = el)}
            className="fb-flower"
            viewBox="0 0 100 150"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              left: `${cfg.left}vw`,
              bottom: `${cfg.bottom}vh`,
              width: `${cfg.size}px`,
              transform: `translateX(-50%) rotate(${cfg.rotation}deg)`,
              opacity: cfg.opacity,
            }}
          >
            <g
              stroke="currentColor"
              strokeWidth="1.1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="fl-stem" d={v.stem} />
              {v.leaves.map((d, j) => (
                <path key={j} className="fl-leaf" d={d} />
              ))}
              <circle className="fl-center" cx={v.cx} cy={v.cy} r={v.r} />
              {Array.from({ length: v.count }).map((_, j) => (
                <path
                  key={j}
                  className="fl-petal"
                  d={petalPath}
                  transform={`rotate(${(360 / v.count) * j} ${v.cx} ${v.cy})`}
                />
              ))}
            </g>
          </svg>
        );
      })}
    </div>
  );
}

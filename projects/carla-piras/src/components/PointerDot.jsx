import { useEffect, useRef } from "react";

export default function PointerDot({ params }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!params.enabled) return;
    let rx = window.innerWidth / 2;
    let ry = window.innerHeight / 2;
    let tx = rx;
    let ty = ry;

    const dot = dotRef.current;
    const ring = ringRef.current;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dot) {
        dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      }
    };

    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      rx += (tx - rx) * 0.22;
      ry += (ty - ry) * 0.22;
      if (ring) {
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [params.enabled]);

  if (!params.enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: `${params.size}px`,
          height: `${params.size}px`,
          borderRadius: "50%",
          background: params.color,
          pointerEvents: "none",
          zIndex: 60,
          willChange: "transform",
        }}
      />
      {params.ring && (
        <div
          ref={ringRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: `${params.ringSize}px`,
            height: `${params.ringSize}px`,
            borderRadius: "50%",
            border: `1px solid ${params.color}`,
            opacity: 0.4,
            pointerEvents: "none",
            zIndex: 59,
            willChange: "transform",
          }}
        />
      )}
    </>
  );
}

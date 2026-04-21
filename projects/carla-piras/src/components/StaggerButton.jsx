import { useEffect, useRef } from "react";
import gsap from "gsap";
import SplitType from "split-type";

export default function StaggerButton({
  children,
  as: Tag = "button",
  className = "",
  stagger = 0.014,
  duration = 0.42,
  ease = "power3.out",
  triggerSelector,
  ...rest
}) {
  const rootRef = useRef(null);
  const stateRef = useRef({ tl: null, origChars: [], cloneChars: [] });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const orig = root.querySelector("[data-stagger-layer='a']");
    const clone = root.querySelector("[data-stagger-layer='b']");
    if (!orig || !clone) return;
    const trigger = triggerSelector
      ? root.closest(triggerSelector) || root
      : root;

    const a = new SplitType(orig, { types: "chars" });
    const b = new SplitType(clone, { types: "chars" });

    gsap.set(b.chars, { yPercent: 100 });

    stateRef.current.origChars = a.chars;
    stateRef.current.cloneChars = b.chars;

    const onEnter = () => {
      const { tl: prev } = stateRef.current;
      if (prev) prev.kill();
      const tl = gsap.timeline({ defaults: { duration, ease } });
      tl.to(a.chars, { yPercent: -100, stagger }, 0);
      tl.to(b.chars, { yPercent: 0, stagger }, 0);
      stateRef.current.tl = tl;
    };

    const onLeave = () => {
      const { tl: prev } = stateRef.current;
      if (prev) prev.kill();
      const tl = gsap.timeline({ defaults: { duration, ease } });
      tl.to(a.chars, { yPercent: 0, stagger }, 0);
      tl.to(b.chars, { yPercent: 100, stagger }, 0);
      stateRef.current.tl = tl;
    };

    trigger.addEventListener("pointerenter", onEnter);
    trigger.addEventListener("pointerleave", onLeave);

    return () => {
      trigger.removeEventListener("pointerenter", onEnter);
      trigger.removeEventListener("pointerleave", onLeave);
      if (stateRef.current.tl) stateRef.current.tl.kill();
      a.revert();
      b.revert();
    };
  }, [children, stagger, duration, ease, triggerSelector]);

  return (
    <Tag ref={rootRef} className={`stagger-btn ${className}`} {...rest}>
      <span className="stagger-btn__mask">
        <span className="stagger-btn__layer" data-stagger-layer="a">
          {children}
        </span>
        <span
          className="stagger-btn__layer stagger-btn__layer--clone"
          data-stagger-layer="b"
          aria-hidden="true"
        >
          {children}
        </span>
      </span>
    </Tag>
  );
}

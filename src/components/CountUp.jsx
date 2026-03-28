import { useEffect, useRef, useState } from 'react';

const CountUp = ({ target, suffix = '', duration = 2000, delay = 0 }) => {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (started.current) return;
      started.current = true;

      // Parse target: "2.7" → 2.7, "50" → 50, "900" → 900
      const num = parseFloat(target);
      const isDecimal = target.includes('.');
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = num * eased;

        if (isDecimal) {
          setDisplay(current.toFixed(1));
        } else {
          setDisplay(Math.round(current).toString());
        }

        if (progress < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }, delay);

    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return <span ref={ref}>{display}{suffix}</span>;
};

export default CountUp;

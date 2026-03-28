import { useState, useEffect } from 'react';

// Calculate if it's daytime based on real sun position
// Uses a simplified solar calculation for the user's timezone
function getSunProgress() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;

  // Simplified: sunrise ~6, sunset ~20 (adjustable)
  const sunrise = 6;
  const sunset = 20;
  const dayLength = sunset - sunrise;

  if (hours < sunrise || hours > sunset) {
    // Night: 0
    return 0;
  }

  // Day progress: 0 at sunrise, 1 at solar noon, 0 at sunset
  const dayProgress = (hours - sunrise) / dayLength;
  // Convert to a 0-1 where 1 = full day, using sine for realistic curve
  return Math.sin(dayProgress * Math.PI);
}

// Returns 'day' or 'night' with the actual sun intensity (0-1)
export function useDayNight() {
  const [state, setState] = useState(() => {
    const intensity = getSunProgress();
    return {
      mode: intensity > 0.2 ? 'day' : 'night', // 80% threshold = 20% from edges
      intensity,
    };
  });

  useEffect(() => {
    const tick = () => {
      const intensity = getSunProgress();
      const mode = intensity > 0.2 ? 'day' : 'night';
      setState((prev) => {
        if (prev.mode !== mode || Math.abs(prev.intensity - intensity) > 0.01) {
          return { mode, intensity };
        }
        return prev;
      });
    };

    // Update every minute
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return state;
}

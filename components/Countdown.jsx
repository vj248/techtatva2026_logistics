'use client';

import { useState, useEffect } from 'react';

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const targetDate = new Date('2026-10-14T00:00:00');
    const endDate = new Date('2026-10-16T23:59:59');

    const updateTimer = () => {
      const now = new Date();
      
      if (now > endDate) {
        setTimeLeft(null);
        return;
      }

      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m to TechTatva 2026`);
      } else {
        setTimeLeft('TechTatva 2026 is here!');
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 60000);

    return () => clearInterval(timer);
  }, []);

  // Initial render (SSR/Hydration) - Render a placeholder to prevent CLS
  if (!timeLeft) {
    return (
      <div className="text-sm font-medium text-muted-foreground animate-pulse">
        Loading countdown...
      </div>
    );
  }

  return (
    <div className="text-sm font-medium text-muted-foreground">
      {timeLeft}
    </div>
  );
}

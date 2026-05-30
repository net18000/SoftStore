import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ expiryDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiryDate).getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setIsActive(false);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryDate]);

  if (!isActive) return null;

  return (
    <div className="flex gap-2">
      {[
        { label: 'd', val: timeLeft.days },
        { label: 'h', val: timeLeft.hours },
        { label: 'm', val: timeLeft.minutes },
        { label: 's', val: timeLeft.seconds }
      ].map((t, i) => (
        <div key={i} className="flex flex-col items-center bg-red-600 text-white min-w-[32px] p-1 rounded-lg shadow-lg">
          <span className="text-sm font-black leading-none">{t.val}</span>
          <span className="text-[8px] font-bold uppercase">{t.label}</span>
        </div>
      ))}
    </div>
  );
};

export default CountdownTimer;

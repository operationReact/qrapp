import { useState, useEffect, useRef } from "react";

export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetDate) return;

    const update = () => setTimeLeft(calcTimeLeft(targetDate));
    update();
    intervalRef.current = setInterval(update, 1000);
    return () => clearInterval(intervalRef.current);
  }, [targetDate]);

  return timeLeft;
}

function calcTimeLeft(targetDate) {
  if (!targetDate)
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0)
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

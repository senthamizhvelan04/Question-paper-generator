import { useEffect, useState, useRef } from 'react';

export default function AnimatedNumber({ value, duration = 350 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const targetValueRef = useRef(value);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startValueRef.current = displayValue;
    targetValueRef.current = value;
    startTimeRef.current = null;

    let animFrame;
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing: cubic-bezier(0.16, 1, 0.3, 1) approximation
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.round(
        startValueRef.current + (targetValueRef.current - startValueRef.current) * easeProgress
      );
      
      setDisplayValue(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

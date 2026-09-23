import { useEffect, useState } from 'react';

export default function NotificationBanner({ message, type = 'error', onClose, autoDismissMs = 6000 }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (message) {
      setVisible(true);
      setProgress(100);
    } else {
      setVisible(false);
    }
  }, [message]);

  useEffect(() => {
    if (!visible || !onClose || !autoDismissMs) return;

    const intervalTime = 50;
    const steps = autoDismissMs / intervalTime;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount++;
      const nextProgress = Math.max(100 - (stepCount / steps) * 100, 0);
      setProgress(nextProgress);

      if (stepCount >= steps) {
        clearInterval(timer);
        setVisible(false);
        // Delay callback slightly to allow exit transition
        setTimeout(() => onClose(), 150);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [visible, onClose, autoDismissMs]);

  if (!message || !visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      default: // error
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
    }
  };

  return (
    <div 
      className={`notification notification-${type}`} 
      style={{ 
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideDown var(--dur-base) var(--ease-snappy) forwards',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left', lineHeight: '1.4', paddingBottom: '4px' }}>
        {getIcon()}
        <span>{message}</span>
      </div>
      {onClose && (
        <button 
          type="button" 
          onClick={() => {
            setVisible(false);
            setTimeout(() => onClose(), 150);
          }}
          aria-label="Dismiss notification"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1.2rem', display: 'inline-flex', alignItems: 'center', padding: '0 4px', lineHeight: 1, zIndex: 10 }}
        >
          ×
        </button>
      )}
      
      {/* Visual countdown shrink bar */}
      {autoDismissMs > 0 && onClose && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            width: `${progress}%`,
            backgroundColor: 'currentColor',
            opacity: 0.25,
            transition: 'width 0.05s linear'
          }}
        />
      )}
    </div>
  );
}

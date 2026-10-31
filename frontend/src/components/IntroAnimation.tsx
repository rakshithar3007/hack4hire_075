import React, { useState, useEffect, useRef, useCallback } from 'react';

interface IntroAnimationProps {
  /** Playback duration in seconds before initiating fade out (default: 5) */
  durationSeconds?: number;
  /** Optional callback fired when the intro is completely removed from the DOM */
  onComplete?: () => void;
}

/**
 * Isolated, self-contained Intro Animation Overlay for InvoiceGuard AI.
 * Plays the provided logo animation inline and silently for 5 seconds,
 * then smoothly fades out and completely unmounts from the DOM.
 */
export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  durationSeconds = 5,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const isDismissingRef = useRef<boolean>(false);

  // Smoothly trigger fadeout and unmount
  const triggerDismiss = useCallback(() => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    setIsFadingOut(true);

    // After 600ms fade transition, unmount completely from DOM
    dismissTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 600);
  }, [onComplete]);

  useEffect(() => {
    // 1. Accessibility: Respect prefers-reduced-motion
    try {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (motionQuery.matches) {
        setIsVisible(false);
        onComplete?.();
        return;
      }
    } catch {
      // Ignore environments without matchMedia support
    }

    // 2. Safety Watchdog Timer:
    // Guarantees the overlay never traps the user or blocks interaction,
    // even if video buffering, decoding, or autoplay fails silently.
    const watchdogTimer = window.setTimeout(() => {
      triggerDismiss();
    }, (durationSeconds + 1.2) * 1000);

    return () => {
      window.clearTimeout(watchdogTimer);
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, [durationSeconds, triggerDismiss, onComplete]);

  // Video time update listener: dismiss at exactly durationSeconds (5s)
  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= durationSeconds) {
      triggerDismiss();
    }
  };

  // Video loading or decode error: show graceful fallback logo and dismiss
  const handleVideoError = () => {
    setHasError(true);
    // Show static logo for 1.8 seconds then gracefully dismiss
    window.setTimeout(() => {
      triggerDismiss();
    }, 1800);
  };

  // Once dismissed, remove completely from DOM
  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-label="InvoiceGuard AI Intro"
      aria-hidden={isFadingOut}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      {!hasError ? (
        <video
          ref={videoRef}
          src="/intro-animation.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={triggerDismiss}
          onError={handleVideoError}
          onTimeUpdate={handleTimeUpdate}
          style={{
            maxWidth: 'min(90vw, 960px)',
            maxHeight: '85vh',
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '12px',
          }}
        />
      ) : (
        /* Graceful static fallback if video fails to load */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            animation: 'ig-fade-in 400ms ease-out',
          }}
        >
          <img
            src="/logo.png"
            alt="InvoiceGuard AI Logo"
            style={{
              width: '180px',
              height: '180px',
              objectFit: 'contain',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#111827',
                letterSpacing: '-0.02em',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              InvoiceGuard AI
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


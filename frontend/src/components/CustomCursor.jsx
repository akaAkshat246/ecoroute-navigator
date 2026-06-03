import React, { useEffect, useState, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const trailPos = useRef({ x: -100, y: -100 });
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if the device is a mobile or touch screen to disable the custom cursor
    const checkDevice = () => {
      setIsMobile(
        window.innerWidth < 768 || 
        navigator.maxTouchPoints > 0
      );
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (hidden) setHidden(false);

      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }
    };

    const handleMouseLeave = () => {
      setHidden(true);
    };

    const handleMouseEnter = () => {
      setHidden(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isMobile, hidden]);

  // Eased animation trail loop
  useEffect(() => {
    if (isMobile) return;

    let animationFrameId;

    const updateTrail = () => {
      const dx = mousePos.current.x - trailPos.current.x;
      const dy = mousePos.current.y - trailPos.current.y;

      // Adjust the 0.15 factor to speed up or slow down the trailing lag
      trailPos.current = {
        x: trailPos.current.x + dx * 0.15,
        y: trailPos.current.y + dy * 0.15
      };

      if (ringRef.current) {
        ringRef.current.style.left = `${trailPos.current.x}px`;
        ringRef.current.style.top = `${trailPos.current.y}px`;
      }

      animationFrameId = requestAnimationFrame(updateTrail);
    };

    animationFrameId = requestAnimationFrame(updateTrail);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isMobile]);

  // Handle hover indicators for interactive anchors
  useEffect(() => {
    if (isMobile) return;

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;

      const isClickable = 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'SELECT' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') || 
        target.closest('a') ||
        target.closest('.cursor-pointer') ||
        target.classList.contains('cursor-pointer') ||
        target.closest('.portfolios-btn'); // matching wlt layouts

      setHovered(!!isClickable);
    };

    window.addEventListener('mouseover', handleMouseOver);
    return () => window.removeEventListener('mouseover', handleMouseOver);
  }, [isMobile]);

  if (isMobile || hidden) return null;

  return (
    <>
      {/* Tiny solid dot pointer */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-[#1d1d16] rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2"
        style={{ left: '-100px', top: '-100px' }}
      />
      {/* Trailing hover ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full border border-[#1d1d16]/30 pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ease-out ${
          hovered 
            ? 'w-10 h-10 bg-[#1d1d16]/5 border-[#1d1d16]/60 scale-110' 
            : 'w-6 h-6 scale-100'
        }`}
        style={{ left: '-100px', top: '-100px' }}
      />
    </>
  );
}

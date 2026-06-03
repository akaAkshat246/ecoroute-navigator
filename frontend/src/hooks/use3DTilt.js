import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to apply an interactive 3D tilt effect on elements on hover.
 * 
 * @param {number} maxTilt - Maximum tilt angle in degrees (default 10).
 * @param {number} scale - Hover scale factor (default 1.02).
 * @returns {Object} - { ref, style } to spread on elements.
 */
export default function use3DTilt(maxTilt = 10, scale = 1.02) {
  const ref = useRef(null);
  const [style, setStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s'
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      
      // Calculate coordinates of the cursor relative to the center of the element
      const x = e.clientX - rect.left; // x coordinate within the element
      const y = e.clientY - rect.top;  // y coordinate within the element
      
      const width = rect.width;
      const height = rect.height;
      
      const xPercent = x / width;
      const yPercent = y / height;
      
      // Compute tilt angles
      // rotateX depends on y axis delta (tilt up/down)
      // rotateY depends on x axis delta (tilt left/right)
      const tiltX = -((yPercent - 0.5) * maxTilt).toFixed(2);
      const tiltY = ((xPercent - 0.5) * maxTilt).toFixed(2);
      
      setStyle({
        transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${scale}, ${scale}, ${scale})`,
        transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
      });
    };

    const handleMouseLeave = () => {
      setStyle({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s'
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [maxTilt, scale]);

  return { ref, style };
}

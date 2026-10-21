import { useEffect, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useScrollContext } from "../Scroll";

export function Eye() {
  const { lenis } = useScrollContext();
  const eyeRef = useRef();
  const irisRef = useRef();

  const eye = {
    x: useMotionValue(0),
    y: useMotionValue(0),
  };

  const size = window.innerWidth >= 1100 ? 68 : 40; // Adjust as needed

  useEffect(() => {
    const updateEyePosition = () => {
      if (!eyeRef.current) return;

      eye.x.set(eyeRef.current.offsetLeft + eyeRef.current.offsetWidth / 2);
      eye.y.set(eyeRef.current.offsetTop + eyeRef.current.offsetHeight / 2);
    };

    updateEyePosition();

    window.addEventListener("resize", updateEyePosition);

    return () => {
      window.removeEventListener("resize", updateEyePosition);
    };
  }, [eyeRef]);

  // Pointer tracking is registered inside an effect so the listeners are
  // cleaned up with the component (the previous version left them attached
  // globally and crashed on an unmounted ref).
  useEffect(() => {
    const setIrisClass = (value) => {
      if (irisRef.current) irisRef.current.setAttribute("class", value);
    };

    const handleMove = (event) => {
      const point = event.touches ? event.touches[0] : event;
      if (!point || !irisRef.current || !eyeRef.current) return;

      setIrisClass("iris");

      const m = {
        x: point.clientX - eye.x.get(),
        y: point.clientY - eye.y.get(),
      };
      const dist = Math.min(
        60,
        Math.max(-60, Math.sqrt(m.x ** 2 + m.y ** 2) / 6)
      );
      const dir = Math.atan2(m.x, m.y);
      const rx = dist * -Math.cos(dir);
      const ry = dist * Math.sin(dir);

      irisRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${size}px) scale(0.8)`;
    };

    const handleLeave = () => setIrisClass("iris anim");

    const handleTouchEnd = (event) => {
      if (event.touches.length === 0) handleLeave();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseout", handleLeave);
    window.addEventListener("touchstart", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleLeave);
      window.removeEventListener("touchstart", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [size, eye.x, eye.y]);

  return (
    <motion.div ref={eyeRef} className="eye">
      <motion.div
        ref={irisRef}
        className="iris anim"
        style={{ transformStyle: "preserve-3d", pointerEvents: "auto" }}
        onClick={() => lenis && lenis.scrollTo("top", { lerp: 0.02 })}
      />
    </motion.div>
  );
}

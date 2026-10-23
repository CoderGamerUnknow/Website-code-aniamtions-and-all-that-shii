import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useScrollContext } from "../useScrollContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function Eye() {
  const { lenis } = useScrollContext();
  const reducedMotion = useReducedMotion();
  const eyeRef = useRef();
  const irisRef = useRef();

  const eye = {
    x: useMotionValue(0),
    y: useMotionValue(0),
  };

  // Shared by the pointer and the keyboard paths, so both take the same trip
  // and the reduced-motion preference is honoured in one place.
  const scrollToTop = useCallback(() => {
    if (!lenis) return;
    lenis.scrollTo(
      "top",
      reducedMotion ? { immediate: true } : { lerp: 0.02 }
    );
  }, [lenis, reducedMotion]);

  // The depth of the iris follows the size of the eye, which changes with
  // the viewport. Reading the width while rendering left the iris at the old
  // depth after the window was resized. The values match the iris keyframes
  // in index.css.
  const [size, setSize] = useState(() =>
    window.innerWidth >= 1100 ? 68 : 45
  );

  useEffect(() => {
    const updateSize = () => {
      setSize(window.innerWidth >= 1100 ? 68 : 45);
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

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
  }, [eyeRef, eye.x, eye.y]);

  // Pointer tracking is registered inside an effect so the listeners are
  // cleaned up with the component (the previous version left them attached
  // globally and crashed on an unmounted ref).
  useEffect(() => {
    const setIrisClass = (value) => {
      // Writing the attribute on every mouse move made the browser recalc
      // the style of the iris dozens of times a second for no reason.
      if (irisRef.current && irisRef.current.getAttribute("class") !== value) {
        irisRef.current.setAttribute("class", value);
      }
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

    const handleLeave = () =>
      setIrisClass(reducedMotion ? "iris" : "iris anim");

    // The idle "breathing" animation is only restored when the pointer
    // leaves the window. A plain `mouseout` also fires every time the
    // pointer crosses an element boundary, so listening to it restarted the
    // animation on every crossing and left the iris without it for good
    // after the very first move.
    const handleWindowLeave = (event) => {
      if (!event.relatedTarget) handleLeave();
    };

    const handleTouchEnd = (event) => {
      if (event.touches.length === 0) handleLeave();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseout", handleWindowLeave);
    document.addEventListener("mouseleave", handleLeave);
    window.addEventListener("touchstart", handleMove, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleWindowLeave);
      document.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("touchstart", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [size, eye.x, eye.y, reducedMotion]);

  return (
    <motion.div ref={eyeRef} className="eye">
      {/* A pointer-only control is invisible to anyone on a keyboard, so the
          iris is announced as a button and answers the keys a button does. */}
      <motion.div
        ref={irisRef}
        role="button"
        tabIndex={0}
        aria-label="Scroll back to top"
        className={reducedMotion ? "iris" : "iris anim"}
        style={{ transformStyle: "preserve-3d", pointerEvents: "auto" }}
        // The eased scroll back to the top is a long trip across the page.
        onClick={scrollToTop}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          scrollToTop();
        }}
      />
    </motion.div>
  );
}

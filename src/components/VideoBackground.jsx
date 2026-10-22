import { useEffect, useRef } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "../hooks/useReducedMotion";

// Scroll-scrubbed canvas scene that replaces the original video background:
// a perspective grid flying through a green data-scape, driven by scroll
// progress. Also sizes the scroll container exactly like the original
// video-duration-driven layout (10120px).

export const SCENE_SCROLL_HEIGHT = 10120;

const GREEN = [118, 185, 0];

function makeStars(count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.6,
      depth: Math.random() * 0.8 + 0.2,
    });
  }
  return stars;
}

function drawScene(ctx, width, height, time, progress) {
  const horizon = height * 0.42;

  // stars / data motes (parallax with scroll)
  ctx.fillStyle = `rgba(${GREEN.join(",")},0.9)`;
  for (const star of makeStars.cache) {
    const y = ((star.y + progress * star.depth * 2) % 1) * height;
    ctx.globalAlpha = 0.25 + star.depth * 0.5;
    ctx.fillRect(star.x * width, y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // perspective grid — horizontal lines
  const travel = time * 0.00018 + progress * 6;
  ctx.lineWidth = 1.5;
  const rows = 26;
  for (let i = 0; i < rows; i++) {
    const z = (i + (travel % 1)) / rows;
    const y = horizon + (height - horizon) * Math.pow(z, 2.4);
    const alpha = Math.min(1, z * 2.6) * 0.7;
    ctx.strokeStyle = `rgba(${GREEN.join(",")},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // perspective grid — vertical lines converging on the vanishing point
  const vpX = width / 2;
  const cols = 16;
  for (let i = -cols; i <= cols; i++) {
    const bottomX = width / 2 + (i / cols) * width * 1.6;
    ctx.strokeStyle = `rgba(${GREEN.join(",")},0.3)`;
    ctx.beginPath();
    ctx.moveTo(vpX, horizon);
    ctx.lineTo(bottomX, height);
    ctx.stroke();
  }

  // horizon line
  ctx.strokeStyle = `rgba(${GREEN.join(",")},0.85)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(width, horizon);
  ctx.stroke();

  // mid-scroll watermarks
  const watermark = (text, center, spread, size) => {
    const d = Math.abs(progress - center);
    if (d > spread) return;
    const alpha = (1 - d / spread) * 0.16;
    ctx.font = `900 ${size}px Orbitron, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(234,255,208,${alpha.toFixed(3)})`;
    ctx.fillText(text, width / 2, height * 0.5);
  };
  watermark("RTX ON", 0.32, 0.14, Math.min(width * 0.14, 180));
  watermark("DLSS 4 · REFLEX · RAY TRACING", 0.55, 0.13, Math.min(width * 0.045, 56));
}

// stable star cache (created once)
makeStars.cache = makeStars(140);

// The background gradient and the horizon glow never change between frames,
// so they are rendered once into an offscreen canvas and blitted afterwards.
function buildBackground(width, height) {
  const background = document.createElement("canvas");
  background.width = width;
  background.height = height;
  const ctx = background.getContext("2d");
  if (!ctx) return background;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#010301");
  bg.addColorStop(0.55, "#04120a");
  bg.addColorStop(1, "#081a04");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const horizon = height * 0.42;
  const glow = ctx.createRadialGradient(
    width / 2,
    horizon,
    0,
    width / 2,
    horizon,
    height * 0.55
  );
  glow.addColorStop(0, `rgba(${GREEN.join(",")},0.38)`);
  glow.addColorStop(0.35, `rgba(${GREEN.join(",")},0.12)`);
  glow.addColorStop(1, `rgba(${GREEN.join(",")},0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  return background;
}

export function VideoBackground({ videoRef, scroll }) {
  const canvasRef = useRef(null);
  const { ref: contentRef, progressRef } = scroll;
  const reducedMotion = useReducedMotion();

  // Size the scroll container like the original video-duration-driven layout.
  useEffect(() => {
    const scrollSection = contentRef;
    if (!scrollSection) return;

    // The disclaimer sits after the scene, so reserve its height as well;
    // otherwise the end of the footer is unreachable on shorter viewports.
    const footer = document.querySelector("[data-footer]");
    scrollSection.style.height = `${SCENE_SCROLL_HEIGHT + (footer?.offsetHeight || 0)}px`;
    ScrollTrigger.refresh();
    return () => {
      scrollSection.style.height = "auto";
    };
  }, [contentRef]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId;
    let dpr = 1;
    let background = null;

    const draw = (time) => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Blit the cached gradient layer 1:1 in device pixels, then draw the
      // animated parts in CSS pixels.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(background, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawScene(ctx, width, height, time, progressRef?.current ?? 0);
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      background = buildBackground(canvas.width, canvas.height);
      // A still frame has to be redrawn when the canvas is resized.
      if (reducedMotion) draw(0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (time) => {
      draw(time);
      frameId = requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      // The scene runs on its own, without the visitor asking for it. With
      // reduced motion a single frame is drawn and the loop stays stopped.
      draw(0);
    } else {
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [progressRef, reducedMotion]);

  return (
    <div
      ref={videoRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: 0,
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      />
    </div>
  );
}

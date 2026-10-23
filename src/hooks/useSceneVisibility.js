import { useEffect, useState } from "react";

// The opaque layers that can hide the whole scene. Each one is marked where
// it is defined - the disclaimer panel and the "rotate your device" prompt -
// so a new full-screen layer joins the list from its own markup instead of
// from a second list that can drift out of sync.
const OCCLUDER_SELECTOR = "[data-scene-occluder]";

/**
 * Whether the pixels of the scene can actually be seen.
 *
 * The scene is a fixed canvas that draws on its own, so every frame it
 * produces is either shown to somebody or wasted. A frame is wasted while the
 * tab is in the background, while the canvas has no size at all, and while an
 * opaque layer covers the viewport completely. A partial cover does not
 * count: on a viewport taller than the disclaimer a strip of the scene stays
 * visible above it, and the scene has to keep drawing there.
 */
export function isSceneSeen(canvas) {
  if (document.hidden) return false;

  const box = canvas.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return false;

  for (const occluder of document.querySelectorAll(OCCLUDER_SELECTOR)) {
    const cover = occluder.getBoundingClientRect();
    const coversViewport =
      cover.top <= 0 &&
      cover.bottom >= window.innerHeight &&
      cover.left <= 0 &&
      cover.right >= window.innerWidth;
    if (coversViewport) return false;
  }

  return true;
}

/**
 * Whether the scene is visible right now, kept fresh while it is mounted.
 *
 * `content` is the scrolling content element itself, not a ref to one: its
 * parent is the scroller Lenis drives, and the scene is only reached by
 * scrolling that, so that is where a change of position announces itself.
 *
 * The three things that can change the answer are a scroll (the disclaimer
 * crosses the fixed scene), a resize (a shorter window can be covered, the
 * rotate prompt appears below 600px) and the tab being hidden or shown again.
 * A change of the occluding layers themselves is caught by observing them.
 */
export function useSceneVisibility(canvasRef, content) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    // The content element is published by Scroll one tick after mount, so a
    // missing one means there is nothing to watch yet and the effect runs
    // again when it arrives.
    const scroller = content?.parentElement;

    // setState with the same value does not re-render, but it still schedules
    // the check; the ref keeps the scroll handler down to a read.
    let current = isSceneSeen(canvas);
    const sync = () => {
      const seen = isSceneSeen(canvas);
      if (seen === current) return;
      current = seen;
      setVisible(seen);
    };

    scroller?.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    document.addEventListener("visibilitychange", sync);

    const observer = new ResizeObserver(sync);
    for (const occluder of document.querySelectorAll(OCCLUDER_SELECTOR)) {
      observer.observe(occluder);
    }

    return () => {
      scroller?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", sync);
      observer.disconnect();
    };
  }, [canvasRef, content]);

  return visible;
}

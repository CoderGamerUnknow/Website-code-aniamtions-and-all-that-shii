import { useRef, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRouterState } from "@tanstack/react-router";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ScrollContext } from "./useScrollContext";

gsap.registerPlugin(ScrollTrigger);

// The animation audit inspects GSAP and ScrollTrigger from the running page.
// They are always available in development. In a production build they are
// only exposed when the page is opened with ?audit=1, so the audit can check
// the real bundle without handing the handles to every visitor.
const AUDIT_ENABLED =
  import.meta.env.DEV ||
  (typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("audit"));

if (AUDIT_ENABLED) {
  window.__gsap = gsap;
  window.__ScrollTrigger = ScrollTrigger;
  window.__loadNonce = Date.now();
}


export function Scroll({ children }) {
  const [scroll, setScroll] = useState({
    ref: null,
    lenis: null,
  });
  const wrapper = useRef(null);
  const content = useRef(null);
  // Scroll progress changes on every animation frame. Holding it in a ref
  // instead of state keeps the whole tree from re-rendering on every tick —
  // consumers (the canvas scene) read it inside their own render loop.
  const progressRef = useRef(0);
  const lenisRef = useRef(null);
  const reducedMotion = useReducedMotion();
  // The smooth scroll is decided once, when Lenis is created. Reading the
  // preference through a ref keeps a later change from tearing the scroller
  // down and losing the scroll position.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const previousPathname = useRef(pathname);

  // Function to update the 'ref' property
  const updateRef = (newRef) => {
    setScroll((prevScroll) => ({ ...prevScroll, ref: newRef }));
  };

  // Function to update the 'lenis' property
  const updateLenis = (newLenis) => {
    setScroll((prevScroll) => ({ ...prevScroll, lenis: newLenis }));
  };

  const resize = () => {
    ScrollTrigger.refresh();
  };

  useEffect(() => {
    const reduced = reducedMotionRef.current;
    const lenis = new Lenis({
      wrapper: wrapper.current,
      content: content.current,
      direction: "vertical", // vertical, horizontal
      gestureDirection: "vertical", // vertical, horizontal, both
      duration: reduced ? 0 : 5,
      // The eased scroll is the main source of motion on the site, so it is
      // switched off completely when less motion was asked for.
      smoothWheel: !reduced,
      smoothTouch: !reduced,
      touchMultiplier: 1,
      infinite: false,
    });

    updateRef(content.current);
    updateLenis(lenis);
    lenisRef.current = lenis;
    if (AUDIT_ENABLED) window.__lenis = lenis;

    lenis.on("scroll", ({ progress }) => {
      ScrollTrigger.update(); // Update ScrollTrigger first
      progressRef.current = progress; // Then publish the custom progress
    });

    const raf = (time) => lenis.raf(time * 4000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.defaults({ scroller: wrapper.current });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      // The ticker callback kept driving a destroyed Lenis instance.
      gsap.ticker.remove(raf);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  // Every route is a page of its own, so a client-side navigation has to
  // start at the top. The nav links scroll to the top themselves, but the
  // browser's back and forward buttons do not: the new route kept the
  // previous scroll offset and landed the visitor at the bottom of a short
  // page instead of its start.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    // Every page has its own scroll height, so the triggers that are measured
    // against the content (the nav and the scroll-to-top eye) still hold the
    // geometry of the page that was left behind. Without a refresh they keep
    // the old start and end, which leaves them pointing past the end of the
    // new page.
    ScrollTrigger.refresh();
  }, [pathname]);

  // Stable context value: it only changes when Lenis or the scroll element
  // are published, never on scroll.
  const value = useMemo(() => ({ ...scroll, progressRef }), [scroll]);

  return (
    <div
      ref={wrapper}
      style={{
        position: "absolute",
        zIndex: 5,
        overflowY: "scroll",
        overflowX: "hidden",
        width: "100%",
        height: "100%",
        top: 0,
        left: 0,
      }}
    >
      <div
        ref={content}
        style={{
          position: "relative",
          top: 0,
          left: 0,
          width: "100%",
        }}
      >
        <ScrollContext.Provider value={value}>
          {children}
        </ScrollContext.Provider>
      </div>
    </div>
  );
}

Scroll.propTypes = {
  children: PropTypes.node.isRequired,
};

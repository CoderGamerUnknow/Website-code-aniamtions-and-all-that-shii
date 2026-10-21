import {
  createContext,
  useRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Lenis from "@studio-freight/lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Dev-only debug hook (stripped from production builds).
if (import.meta.env.DEV) {
  window.__gsap = gsap;
  window.__ScrollTrigger = ScrollTrigger;
  window.__loadNonce = Date.now();
}

const scrollContext = createContext();
export const useScrollContext = () => useContext(scrollContext);

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
    const lenis = new Lenis({
      wrapper: wrapper.current,
      content: content.current,
      direction: "vertical", // vertical, horizontal
      gestureDirection: "vertical", // vertical, horizontal, both
      duration: 5,
      smoothWheel: true,
      smoothTouch: true,
      touchMultiplier: 1,
      infinite: false,
    });

    updateRef(content.current);
    updateLenis(lenis);
    if (import.meta.env.DEV) window.__lenis = lenis;

    lenis.on("scroll", ({ progress }) => {
      ScrollTrigger.update(); // Update ScrollTrigger first
      progressRef.current = progress; // Then publish the custom progress
    });

    gsap.ticker.add((time) => lenis.raf(time * 4000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.defaults({ scroller: wrapper.current });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      lenis.destroy();
    };
  }, []);

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
        <scrollContext.Provider value={value}>
          {children}
        </scrollContext.Provider>
      </div>
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// Imported from its own module rather than the pages barrel: the barrel
// re-exports the routes, and pulling it in here would put the lazy routes back
// into the first download.
import { Loader } from "../pages/loader/Loader";
import { StickyCursor } from "./StickyCursor/StickyCursor";
import { NavBar } from "./NavBar";
import { ScrollToTopButton } from "./scrollToTopButton/ScrollToTopButton";
import { LandscapePrompt } from "./LandscapePrompt";
import { useScrollContext } from "./useScrollContext";
import { SCENE_SCROLL_HEIGHT } from "./VideoBackground";
import { useReducedMotion } from "../hooks/useReducedMotion";

// Below this width the custom cursor is more in the way than it helps.
const CURSOR_MIN_WIDTH = 1280;

export function Layout({ children }) {
  const [loaderFinished, setLoaderFinished] = useState(false);
  const [timeline, setTimeline] = useState(null);
  const reducedMotion = useReducedMotion();
  const { ref: scrollRef } = useScrollContext();
  // The custom cursor is only meant for wide screens. The width used to be
  // read while rendering, so a window that was resized below the threshold
  // kept the cursor on screen.
  const [isWideViewport, setIsWideViewport] = useState(
    () => window.innerWidth >= CURSOR_MIN_WIDTH
  );

  useEffect(() => {
    const onResize = () => {
      setIsWideViewport(window.innerWidth >= CURSOR_MIN_WIDTH);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setLoaderFinished(true),
      });
      setTimeline(tl);
    });

    return () => context.revert();
  }, []);

  // The intro is decoration, not a gate: anyone who has seen it once, or who
  // came back for something else, can dismiss it with a click or any key.
  useEffect(() => {
    if (!timeline) return undefined;
    const skip = () => {
      if (timeline.progress() < 1) timeline.progress(1);
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [timeline]);

  // With reduced motion the animated intro loader is skipped. The page is
  // still mounted through the same gate, because the scroll context publishes
  // its element from an effect: mounting the page before that happens would
  // build the scroll triggers against the wrong element.
  useEffect(() => {
    if (!reducedMotion || !scrollRef) return undefined;
    const id = setTimeout(() => setLoaderFinished(true), 40);
    return () => clearTimeout(id);
  }, [reducedMotion, scrollRef]);

  return (
    <>
      {loaderFinished ? (
        <>
          {/* The custom cursor is a decorative motion effect, so it is left
              out entirely when less motion was asked for. */}
          {isWideViewport && !reducedMotion && <StickyCursor />}
          <ScrollToTopButton />
          <NavBar />
          {children}
          <Footer />
        </>
      ) : reducedMotion ? null : (
        <Loader timeline={timeline} />
      )}
      <LandscapePrompt />
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

const CONTACT_EMAIL = "sharmaprayaagraj@gmail.com";

function Footer() {
  const footerRef = useRef(null);
  const { ref: contentRef } = useScrollContext();

  // The scene is a fixed 10120px tall scroll track; the disclaimer sits after
  // it, so the track has to grow by the footer's height for the whole block to
  // stay reachable on every viewport.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer || !contentRef) return;

    const syncHeight = () => {
      // Only the home route owns the tall scroll scene; on /technology or
      // /products the content should keep its natural height.
      const hasScene = !!document.querySelector("[data-image]");
      contentRef.style.height = hasScene
        ? `${SCENE_SCROLL_HEIGHT + footer.offsetHeight}px`
        : "auto";
      ScrollTrigger.refresh();
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(footer);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [contentRef]);

  return (
    <footer
      // Opaque and full-width, so on a viewport shorter than it is, the panel
      // covers the canvas scene completely; this attribute is what tells the
      // scene to stop drawing in that case.
      ref={footerRef}
      data-footer
      data-scene-occluder
      className="footer"
    >
      <div className="footer__inner">
        <p className="footer__eyebrow">Disclaimer</p>

        <div className="footer__grid">
          <section className="footer__block">
            <h2 className="footer__blockTitle">Fan-made concept</h2>
            <p>
              This is an independent, non-commercial front-end project built to
              celebrate NVIDIA, GeForce RTX and the technology behind modern
              gaming and AI. It is not a store, product page or official
              website, and nothing on it is for sale.
            </p>
          </section>

          <section className="footer__block">
            <h2 className="footer__blockTitle">Trademarks &amp; copyright</h2>
            <p>
              NVIDIA, the NVIDIA logo, GeForce, RTX, DLSS, Reflex, Frame
              Generation, CUDA and related names are trademarks or registered
              trademarks of NVIDIA Corporation in the United States and other
              countries. They appear here for identification and commentary
              only. All other product names and marks belong to their
              respective owners.
            </p>
          </section>

          <section className="footer__block">
            <h2 className="footer__blockTitle">No affiliation</h2>
            <p>
              This project is not affiliated with, authorized, sponsored,
              endorsed or approved by NVIDIA Corporation or any of its
              partners, resellers or studios. Links to nvidia.com are provided
              for convenience only and do not imply a partnership.
            </p>
          </section>

          <section className="footer__block">
            <h2 className="footer__blockTitle">Artwork &amp; typefaces</h2>
            <p>
              No official NVIDIA marketing material, product renders, logos or
              brand fonts are hosted here. The perspective grid, glows and
              product illustrations are generated in the browser with canvas,
              SVG and CSS. Text is set in Orbitron and Rajdhani, both released
              under the SIL Open Font License.
            </p>
          </section>

          <section className="footer__block">
            <h2 className="footer__blockTitle">Built with</h2>
            <p>
              React 18, Vite, GSAP with ScrollTrigger, Lenis, Framer Motion and
              Sass, each used under its own open-source license. Their authors
              and maintainers do not endorse, sponsor or support this site.
            </p>
          </section>

          <section className="footer__block">
            <h2 className="footer__blockTitle">Privacy</h2>
            <p>
              No accounts, cookies, analytics or tracking of any kind. Every
              animation runs locally in your browser, no personal data is
              collected, stored or shared, and no third-party scripts are
              loaded at runtime.
            </p>
          </section>
        </div>

        <p className="footer__note">
          Last updated October 2026 · Non-commercial fan project · If you own
          the rights to any content shown here and would like it removed or
          credited differently, email{" "}
          <a className="footer__link" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          and it will be addressed within seven days.
        </p>
      </div>
    </footer>
  );
}

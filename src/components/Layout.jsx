import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Loader } from "../pages";
import { StickyCursor } from "./StickyCursor/StickyCursor";
import { NavBar } from "./NavBar";
import { ScrollToTopButton } from "./scrollToTopButton/ScrollToTopButton";
import { LandscapePrompt } from "./LandscapePrompt";
import { useScrollContext } from "./Scroll";
import { SCENE_SCROLL_HEIGHT } from "./VideoBackground";

export function Layout({ children }) {
  const [loaderFinished, setLoaderFinished] = useState(false);
  const [timeline, setTimeline] = useState(null);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setLoaderFinished(true),
      });
      setTimeline(tl);
    });

    return () => context.revert();
  }, []);

  return (
    <>
      {loaderFinished ? (
        <>
          {window.innerWidth >= 1280 && <StickyCursor />}
          <ScrollToTopButton />
          <NavBar />
          {children}
          <Footer />
        </>
      ) : (
        <Loader timeline={timeline} />
      )}
      <LandscapePrompt />
    </>
  );
}

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
    <footer ref={footerRef} data-footer className="footer">
      <div className="footer__inner">
        <p className="footer__eyebrow">Disclaimer</p>

        <div className="footer__grid">
          <section className="footer__block">
            <h3 className="footer__blockTitle">Fan-made concept</h3>
            <p>
              This is an independent, non-commercial front-end project built to
              celebrate NVIDIA, GeForce RTX and the technology behind modern
              gaming and AI. It is not a store, product page or official
              website, and nothing on it is for sale.
            </p>
          </section>

          <section className="footer__block">
            <h3 className="footer__blockTitle">Trademarks &amp; copyright</h3>
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
            <h3 className="footer__blockTitle">No affiliation</h3>
            <p>
              This project is not affiliated with, authorised, sponsored,
              endorsed or approved by NVIDIA Corporation or any of its
              partners, resellers or studios. Links to nvidia.com are provided
              for convenience only and do not imply a partnership.
            </p>
          </section>

          <section className="footer__block">
            <h3 className="footer__blockTitle">Artwork &amp; typefaces</h3>
            <p>
              No official NVIDIA marketing material, product renders, logos or
              brand fonts are hosted here. The perspective grid, glows and
              product illustrations are generated in the browser with canvas,
              SVG and CSS. Text is set in Orbitron and Rajdhani, both released
              under the SIL Open Font License.
            </p>
          </section>

          <section className="footer__block">
            <h3 className="footer__blockTitle">Built with</h3>
            <p>
              React 18, Vite, GSAP with ScrollTrigger, Lenis, Framer Motion and
              Sass, each used under its own open-source licence. Their authors
              and maintainers do not endorse, sponsor or support this site.
            </p>
          </section>

          <section className="footer__block">
            <h3 className="footer__blockTitle">Privacy</h3>
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

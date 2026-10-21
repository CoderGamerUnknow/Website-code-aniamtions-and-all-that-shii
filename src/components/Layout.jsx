import { useLayoutEffect, useState } from "react";
import gsap from "gsap";
import { Loader } from "../pages";
import { StickyCursor } from "./StickyCursor/StickyCursor";
import { NavBar } from "./NavBar";
import { ScrollToTopButton } from "./scrollToTopButton/ScrollToTopButton";
import { LandscapePrompt } from "./LandscapePrompt";

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

function Footer() {
  return (
    <footer data-footer className="footer">
      <p className="footer__title">Disclaimer:</p>
      <p className="footer__paragraph">
        This website is a fan-made promotional concept built to celebrate
        NVIDIA, GeForce RTX and the technology behind modern gaming and AI.
      </p>
      <p className="footer__paragraph">
        I do not own the copyrights or any intellectual property associated with
        NVIDIA, GeForce, RTX, DLSS or CUDA. All trademarks, logos, product names
        and imagery are the property of their respective owners, including
        NVIDIA Corporation.
      </p>
      <p className="footer__paragraph">
        This project is not affiliated with, endorsed by or sponsored by NVIDIA
        — it exists purely as a front-end animation exercise. If you are the
        rightful owner of any content featured here and wish for it to be
        removed or credited differently, please contact me and I will promptly
        address your concerns.
      </p>
    </footer>
  );
}

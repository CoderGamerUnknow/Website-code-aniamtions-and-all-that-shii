import gsap from "gsap";
import { useEffect, useRef } from "react";
import {
  animateOutNow,
  animateImage,
  revealVideo,
  animateSeriesSubtitle,
  animateShopNow,
} from "./animations";
import styles from "./home.module.scss";
import { useScrollContext } from "../../components/Scroll";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { VideoBackground } from "../../components";

export function Home() {
  const timeline = useRef(gsap.timeline());
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const outNowRef = useRef(null);
  const shopNowRef = useRef(null);
  const seriesRef = useRef(null);
  const scroll = useScrollContext();
  const reducedMotion = useReducedMotion();
  // The scrub eases the animation into place over a second. With reduced
  // motion it follows the scroll directly instead of trailing behind it.
  const scrub = reducedMotion ? true : 1;

  useEffect(() => {
    const context = gsap.context(() => {
      const tl = timeline.current;
      tl.add(animateSeriesSubtitle(seriesRef, scroll.ref, scrub));
      tl.add(animateOutNow(outNowRef, scroll.ref, scrub));
      tl.add(animateShopNow(shopNowRef, scroll.ref, scrub));

      tl.add(animateImage(reducedMotion), 0).add(
        revealVideo(videoRef, reducedMotion)
      );
    }, heroRef);

    return () => context.revert();
  }, []);

  return (
    <>
      <div className={styles.hero} ref={heroRef}>
        {/* The loader's wordmark leaves with the intro, so without this the
            page had no h1 at all and its outline started at h2. */}
        <h1 className={styles.hero__title}>
          NVIDIA GeForce RTX 50 Series — a fan-made concept site
        </h1>
        <div data-image-overlay className={styles.hero__imageOverlay} />
        <div data-image className={styles.hero__image} />
      </div>
      <VideoBackground videoRef={videoRef} scroll={scroll} />
      <SeriesSubtitle seriesRef={seriesRef} />
      <OutNowSubtitle outNowRef={outNowRef} />
      <ShopNowSubtitle shopNowRef={shopNowRef} />
    </>
  );
}

function SeriesSubtitle({ seriesRef }) {
  return (
    <div ref={seriesRef} className={styles.seriesSubtitle__container}>
      <h2 style={{ fontFamily: "Orbitron" }} className={styles.seriesSubtitle}>
        GeForce RTX 50 Series
      </h2>
    </div>
  );
}

function OutNowSubtitle({ outNowRef }) {
  return (
    <div ref={outNowRef} className={styles.outNowSubtitle}>
      <div>
        <div className={styles.outNowSubtitle__decoration} aria-hidden="true" />
        <h2 className={styles.outNowSubtitle__text}>OUT NOW</h2>
      </div>
    </div>
  );
}

function ShopNowSubtitle({ shopNowRef }) {
  return (
    <div ref={shopNowRef} className={styles.shopNowSubtitle__container}>
      <div className={styles.shopNowSubtitle}>
        <div className={styles.shopNowSubtitle__primaryText}>SHOP</div>
        <div className={styles.shopNowSubtitle__secondaryText}>NOW</div>
        <div className={styles.promoButtonsContainer}>
          <a
            href="https://www.nvidia.com/en-us/geforce/buy/"
            target="_blank"
            rel="noreferrer"
            className={styles.promoButtonsContainer__buyButton}
          >
            BUY NOW
          </a>
          <a
            href="https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/"
            target="_blank"
            rel="noreferrer"
            className={styles.promoButtonsContainer__exploreButton}
          >
            EXPLORE RTX
          </a>
        </div>
      </div>
    </div>
  );
}

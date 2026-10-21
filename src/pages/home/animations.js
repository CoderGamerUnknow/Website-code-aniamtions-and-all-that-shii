import { gsap } from "gsap";

// Fixed scroll choreography for the home page.
// Scroll length is set by VideoBackground (10120px), mirroring the original
// video-duration-driven layout.

export const animateSeriesSubtitle = (seriesRef, scrollRef) => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scrollRef,
      start: "700px",
      end: "+=550px",
      scrub: 1,
    },
  });
  tl.addLabel("start")
    .to(seriesRef.current, {
      autoAlpha: 1,
      duration: 1,
      ease: "expo.inOut",
    })
    .addLabel("end")
    .to(seriesRef.current, {
      autoAlpha: 0,
      duration: 1,
      ease: "expo.inOut",
    })
    .pause();

  return tl;
};

export const animateOutNow = (outNowRef, scrollRef) => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scrollRef,
      start: "6800px",
      end: "+=500px",
      scrub: 1,
    },
  });
  tl.addLabel("start")
    .to(outNowRef.current, {
      display: "block",
      autoAlpha: 1,
      duration: 1,
      ease: "expo.inOut",
    })
    .addLabel("end")
    .to(outNowRef.current, {
      autoAlpha: 0,
      duration: 1,
      ease: "expo.inOut",
    })
    .pause();

  return tl;
};

export const animateShopNow = (shopNowRef, scrollRef) => {
  // CTA: rises in at 7400px, holds through the last stretch of the grid scene
  // and fades just as the disclaimer panel slides up over it. Keeping it on
  // screen until the opaque footer arrives avoids a long empty gap at the end.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scrollRef,
      start: "7400px",
      // Ends exactly as the disclaimer panel scrolls into view, so the overlay
      // is never left ghosting on top of the footer text on any viewport.
      endTrigger: () => document.querySelector("[data-footer]"),
      end: "top bottom",
      scrub: 1,
    },
  });
  tl.to(shopNowRef.current, {
    display: "block",
    autoAlpha: 1,
    duration: 1,
    ease: "expo.out",
  })
    .to(shopNowRef.current, { autoAlpha: 1, duration: 2 })
    .to(shopNowRef.current, {
      autoAlpha: 0,
      duration: 1,
      ease: "power2.inOut",
    });

  return tl;
};

export const animateScrollToTop = (scrollToTopRef, scrollRef) => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: scrollRef,
      start: "0px",
      // The trigger is the scroll content, so "bottom bottom" is the last
      // reachable scroll position. A hard-coded pixel value used to sit
      // beyond the maximum scroll on short viewports, which froze the
      // show/hide handling once the user scrolled past it.
      end: "bottom bottom",
      onUpdate: (self) => {
        const scrollDirection = self.direction;

        if (scrollDirection === 1) {
          gsap.to(scrollToTopRef.current, {
            autoAlpha: 1,
            duration: 1,
            delay: 0.5,
            ease: "expo.out",
          });
        } else {
          gsap.to(scrollToTopRef.current, {
            autoAlpha: 0,
            duration: 1,
            delay: 0.5,
            ease: "expo.out",
          });
        }
      },
    },
  });
  tl.to(scrollToTopRef.current, {
    autoAlpha: 0,
  });
};

export const animateImage = () => {
  const tl = gsap.timeline({
    defaults: {
      ease: "expo.inOut",
      duration: 1.5,
    },
  });

  tl.from(
    "[data-image-overlay]",
    {
      "clip-path": "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      duration: 1,
    },
    ">"
  )
    .to(
      "[data-image-overlay]",
      {
        "clip-path": "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
        transformOrigin: "top bottom",
        duration: 1,
      },
      ">"
    )
    .to(
      "[data-image]",
      {
        "clip-path": "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        transformOrigin: "top bottom",
        duration: 1,
      },
      "<"
    );

  return tl;
};

export const revealVideo = (videoRef) => {
  const tl = gsap.timeline();

  tl.fromTo(
    videoRef.current,
    {
      autoAlpha: 0,
    },
    {
      autoAlpha: 1,
      ease: "expo.out",
      duration: 2,
    }
  );

  return tl;
};

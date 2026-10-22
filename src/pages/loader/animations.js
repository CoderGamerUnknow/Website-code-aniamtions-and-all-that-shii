import { gsap } from "gsap";

// The intro is authored as one continuous piece rather than a set of gaps.
// The earlier version handed `animateTitleIn` to the timeline uncalled (`add`
// received the function, not the timeline it returns), so the title played on
// the global timeline while the loader timeline still started with a four
// second hole: the screen sat frozen and then jumped straight to the exit.

export const TITLE_IN_DURATION = 1.8;
export const PROGRESS_DURATION = 3;
export const INTRO_START = 2.8;
export const INTRO_DURATION = 1.7;

export const animateTitleIn = () => {
  const tl = gsap.timeline({
    defaults: { ease: "expo.out", duration: 1.1 },
  });

  tl.fromTo(
    "[data-title-first]",
    { x: 90, autoAlpha: 0 },
    { x: 0, autoAlpha: 1, duration: 1.2 },
    0
  )
    .fromTo(
      "[data-title-second]",
      { x: -90, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 1.2 },
      0
    )
    .fromTo(
      "[data-title-last]",
      { y: -60, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 1.2 },
      0.18
    )
    .fromTo(
      "[data-flames]",
      { opacity: 0 },
      { opacity: 1, duration: 1.4, ease: "power1.out" },
      0.2
    );

  return tl;
};

export const introAnimation = (wordGroupsRef) => {
  const tl = gsap.timeline();

  // The second copy of the title starts one screen below, so the slide lifts
  // the first copy out and brings the second one through: the wordmark reads
  // as endless rather than as a single block sliding off.
  tl.to(wordGroupsRef.current, {
    y: "-120vh",
    duration: INTRO_DURATION,
    ease: "power3.inOut",
  });

  return tl;
};

export const animateLoaderOut = (loaderRef) => {
  const tl = gsap.timeline();

  tl.to(loaderRef.current, {
    clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
    duration: 0.9,
    ease: "expo.inOut",
  });

  return tl;
};

export const progressAnimation = (progressRef, progressNumberRef) => {
  const tl = gsap.timeline();

  tl.fromTo(
    progressRef.current,
    { x: "-100vw" },
    { x: "0vw", duration: PROGRESS_DURATION, ease: "power2.inOut" },
    0
  )
    .fromTo(
      progressNumberRef.current,
      { x: "-5vw" },
      { x: "100vw", duration: PROGRESS_DURATION, ease: "power2.inOut" },
      0
    )
    .fromTo(
      progressNumberRef.current,
      { textContent: 0 },
      {
        textContent: 100,
        duration: PROGRESS_DURATION,
        ease: "power2.inOut",
        roundProps: "textContent",
      },
      0
    )
    .to(progressNumberRef.current, { y: 20, autoAlpha: 0, duration: 0.4 }, ">")
    .to(progressRef.current, { y: "100%", duration: 0.8 }, "<");

  return tl;
};

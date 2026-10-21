import { useEffect, useRef } from "react";
import { Eye } from "./Eye";
import { animateScrollToTop } from "../../pages/home/animations";
import { useScrollContext } from "../Scroll";
import gsap from "gsap";
import styles from "./scrollToTopButton.module.scss";

export function ScrollToTopButton() {
  const timeline = useRef(gsap.timeline());
  const scrollToTopRef = useRef();
  // The scroll element is published by Scroll after Lenis mounts, so wait for
  // it instead of relying on the (undefined) global `scroll.ref`.
  const { ref: scrollRef } = useScrollContext();

  useEffect(() => {
    if (!scrollRef) return undefined;

    const context = gsap.context(() => {
      const tl = timeline.current;
      tl.add(animateScrollToTop(scrollToTopRef, scrollRef));
    });

    return () => context.revert();
  }, [scrollRef]);

  return (
    <div
      ref={scrollToTopRef}
      style={{ opacity: 0, visibility: "hidden" }}
      className={styles.button}
    >
      <Eye />
    </div>
  );
}

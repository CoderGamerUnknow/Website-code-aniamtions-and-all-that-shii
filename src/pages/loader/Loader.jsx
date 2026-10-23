import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  animateTitleIn,
  introAnimation,
  animateLoaderOut,
  progressAnimation,
} from "./animations";
import styles from "./loader.module.scss";

export function Loader({ timeline }) {
  const loaderRef = useRef(null);
  const wordGroupsRef = useRef(null);
  const progressRef = useRef(null);
  const progressNumberRef = useRef(null);

  useEffect(() => {
    if (!timeline) return;
    // Every child is placed at an absolute position so the intro runs as one
    // continuous piece. The exit overlaps the end of the slide instead of
    // waiting for it, which used to leave a stretch of frozen screen.
    timeline
      .add(animateTitleIn(), 0)
      .add(progressAnimation(progressRef, progressNumberRef), 0)
      .add(introAnimation(wordGroupsRef), 2.8)
      .add(animateLoaderOut(loaderRef), 4.3);
  }, [timeline]);

  return (
    <div className={styles.loader__wrapper}>
      <div className={styles.loader__progressWrapper}>
        <div
          className={styles.loader__progress}
          ref={progressRef}
          aria-hidden="true"
        />
        <span
          className={styles.loader__progressNumber}
          ref={progressNumberRef}
          aria-hidden="true"
        >
          0
        </span>
      </div>
      <div className={styles.loader} ref={loaderRef}>
        <div className={styles.loader__wheel} aria-hidden="true">
          <div data-flames className={styles.loader__wheel__flames}>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
            <div>
              <img src="/blueFireball.gif" width="343" height="488" alt="" />
            </div>
          </div>
        </div>

        <div className={styles.loader__titleWrapper} ref={wordGroupsRef}>
          {/* The wordmark on its way out. Announced once: the copy that
              follows is the same text, duplicated purely for the slide. */}
          <h1 className={styles.loader__title}>
            <span className={styles.loader__titleEnglish}>
              <span data-title-first>GeForce</span>
              <span data-title-second>RTX</span>
            </span>
            <span data-title-last>NVIDIA</span>
          </h1>
          <div className={styles.loader__titleSecond} aria-hidden="true">
            <span className={styles.loader__titleEnglishSecond}>
              <span>GeForce</span>
              <span>RTX</span>
            </span>
            <span>NVIDIA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Loader.propTypes = {
  // The intro timeline built by Layout; the loader only appends to it.
  timeline: PropTypes.shape({
    add: PropTypes.func.isRequired,
  }),
};

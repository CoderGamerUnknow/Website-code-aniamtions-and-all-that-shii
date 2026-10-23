import { useCallback, useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useStickyContext } from "../../components/StickyCursor/useStickyContext";
import { ProductArt } from "../../components/artifacts/ProductArt";
import { productsData } from "../../const/data";
import { SecondaryLoader } from "../../components";
import styles from "./characters.module.scss";
import gsap from "gsap";
import {
  animateCharacter,
  animateSelectedCharacterOverlay,
} from "./animations";

export function Characters() {
  const timeline = useRef(gsap.timeline());
  const characterRef = useRef();
  const [selectedCategory, setSelectedCategory] = useState(
    productsData[0].content
  );
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const { addStickyElement, removeStickyElement } = useStickyContext();
  // One stable ref callback per category button, so the element registry does
  // not collect duplicates (and stale nodes) on every render.
  const stickyRefs = useRef(new Map());
  const getStickyElementRef = (key) => {
    if (!stickyRefs.current.has(key)) {
      let element = null;
      stickyRefs.current.set(key, (el) => {
        if (el) {
          element = el;
          addStickyElement(el);
        } else if (element) {
          removeStickyElement(element);
          element = null;
        }
      });
    }
    return stickyRefs.current.get(key);
  };

  useEffect(() => {
    const context = gsap.context(() => {
      const tl = timeline.current;
      tl.add(animateCharacter(characterRef));
    }, characterRef);

    return () => context.revert();
  }, []);

  return (
    <>
      {/* The key has to change whenever the product set changes, otherwise
          React keeps the same element and the animation never replays. The
          previous key was the array itself, which stringifies to the same
          value for two categories of the same size. */}
      <SecondaryLoader
        key={selectedCategory?.map((product) => product.name).join("|")}
      />
      <div className={styles.characters}>
        <div ref={characterRef} className={styles.characters__wrapper}>
          <h1
            style={{ fontFamily: "Orbitron" }}
            className={styles.characters__wrapper__title}
          >
            Products
          </h1>
          <div className={styles.characters__wrapper__categories}>
            {productsData.map((data, index) => {
              return (
                <button
                  key={index}
                  ref={getStickyElementRef(data.category)}
                  className={styles.characters__wrapper__categories__single}
                  onClick={() => setSelectedCategory(data.content)}
                >
                  {data.category}
                </button>
              );
            })}
          </div>
          <div className={styles.characters__container}>
            {selectedCategory?.map((character) => {
              return (
                <button
                  onClick={() => setSelectedCharacter(character)}
                  key={character.name}
                  className={styles.characters__container__individualCharacter}
                >
                  <div
                    className={
                      styles.characters__container__individualCharacter__background
                    }
                  />
                  <div
                    className={
                      styles.characters__container__individualCharacter__title
                    }
                  >
                    {character.name}
                  </div>
                  <ProductArt
                    art={character.art}
                    name={character.name}
                    className={
                      styles.characters__container__individualCharacter__img
                    }
                  />
                </button>
              );
            })}
          </div>
        </div>
        {selectedCharacter && (
          <IndividualCharacterOverlay
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
          />
        )}
      </div>
    </>
  );
}

function IndividualCharacterOverlay({
  selectedCharacter,
  setSelectedCharacter,
}) {
  const timeline = useRef(gsap.timeline());
  const selectedCharacterRef = useRef();
  const closeButtonRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const tl = timeline.current;
    tl.add(animateSelectedCharacterOverlay(selectedCharacterRef));

    return () => tl.revert();
  }, []);

  const handleCloseButtonClick = useCallback(() => {
    const tl = timeline.current;
    // A timeline that has not played yet runs forward, a played one rewinds,
    // and both are waited on before the overlay is unmounted.
    if (tl.progress() === 0) tl.play();
    else tl.reverse();
    tl.then(() => setSelectedCharacter(null));
  }, [setSelectedCharacter]);

  useEffect(() => {
    // The overlay covers the page, so it takes focus while it is open and
    // gives it back to the card that opened it on the way out.
    const opener = document.activeElement;
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      handleCloseButtonClick();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [handleCloseButtonClick]);

  return (
    <div
      ref={selectedCharacterRef}
      className={styles.selectedCharacter}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        ref={closeButtonRef}
        onClick={handleCloseButtonClick}
        className={styles.selectedCharacter__closeButton}
      >
        <img
          className={styles.selectedCharacter__closeButton__img}
          src="/closeIcon.png"
          alt="Close"
          width="450"
          height="450"
        />
      </button>
      <div className={styles.selectedCharacter__content}>
        <ProductArt
          art={selectedCharacter.art}
          name={selectedCharacter.name}
          className={styles.selectedCharacter__content__thumbnail}
        />
        <div className={styles.selectedCharacter__content__description}>
          <h2
            id={titleId}
            className={styles.selectedCharacter__content__description__title}
          >
            {selectedCharacter.name}
          </h2>
          <p>{selectedCharacter.description}</p>
        </div>
      </div>
    </div>
  );
}

IndividualCharacterOverlay.propTypes = {
  selectedCharacter: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    art: PropTypes.object,
  }).isRequired,
  setSelectedCharacter: PropTypes.func.isRequired,
};

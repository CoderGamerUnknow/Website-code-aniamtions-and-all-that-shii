import { useRef } from "react";
import PropTypes from "prop-types";
import { StickyContext } from "./useStickyContext";

export const StickyProvider = ({ children }) => {
  const stickyElementsRef = useRef([]);

  // Ref callbacks are re-created on every render, so the same element used to
  // be pushed again and again and never removed when it unmounted. Registering
  // an element twice is a no-op and unregistered elements are dropped, which
  // keeps the list free of stale DOM nodes.
  const addStickyElement = (element) => {
    if (!element || stickyElementsRef.current.includes(element)) return;
    stickyElementsRef.current.push(element);
  };

  const removeStickyElement = (element) => {
    if (!element) return;
    const index = stickyElementsRef.current.indexOf(element);
    if (index !== -1) {
      stickyElementsRef.current.splice(index, 1);
    }
  };

  return (
    <StickyContext.Provider
      value={{ addStickyElement, removeStickyElement, stickyElementsRef }}
    >
      {children}
    </StickyContext.Provider>
  );
};

StickyProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const readPreference = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(QUERY).matches;

// The setting is read synchronously on the first render, so a visitor who
// asked for less motion never gets a frame of the animated intro loader.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const list = window.matchMedia(QUERY);
    const onChange = (event) => setReduced(event.matches);
    setReduced(list.matches);

    if (list.addEventListener) list.addEventListener("change", onChange);
    else list.addListener(onChange);

    return () => {
      if (list.removeEventListener) list.removeEventListener("change", onChange);
      else list.removeListener(onChange);
    };
  }, []);

  return reduced;
}

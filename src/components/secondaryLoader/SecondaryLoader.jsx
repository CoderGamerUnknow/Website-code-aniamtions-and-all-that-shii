import { useReducedMotion } from "../../hooks/useReducedMotion";
import styles from "./secondaryLoader.module.scss";

export function SecondaryLoader() {
  const reducedMotion = useReducedMotion();

  // The overlay wipes itself across the screen. With reduced motion the
  // route change is shown without it.
  if (reducedMotion) return null;

  return <div className={styles.transition_loader} />;
}

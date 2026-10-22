import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useScrollContext } from "./Scroll";
import { Link } from "@tanstack/react-router";
import { useStickyContext } from "./StickyCursor/StickyContext";
import { useReducedMotion } from "../hooks/useReducedMotion";

export function NavBar() {
  const { lenis } = useScrollContext();
  const timeline = useRef(gsap.timeline());
  const scroll = useScrollContext();
  const navRef = useRef();
  const { addStickyElement, removeStickyElement } = useStickyContext();
  const reducedMotion = useReducedMotion();
  // Read through a ref: the bar reacts to every change of the scroll
  // direction, and it should pick up a later change of the preference
  // without the trigger having to be rebuilt.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);
  // One stable ref callback per link: a callback that is re-created on every
  // render makes React detach and re-attach the element, which used to leave
  // the element registry full of duplicates and stale nodes.
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

  const animateNav = (navRef, scrollRef) => {
    // The bar only has to react when the direction of the scroll changes.
    // Reacting to every tick created a tween per tick, and GSAP does not
    // overwrite by default, so they piled up (168 of them on a short scroll)
    // and all of them kept writing the same two properties of the bar.
    let lastDirection = 0;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollRef,
        start: "0px",
        // The trigger is the scroll content, so "bottom bottom" is the last
        // reachable scroll position. A hard-coded pixel value used to end the
        // trigger long before the bottom of the page, which left the nav
        // stuck in its hidden state while scrolling up through the last
        // stretch of the scene.
        end: "bottom bottom",
        onUpdate: (self) => {
          const scrollDirection = self.direction;
          if (!scrollDirection || scrollDirection === lastDirection) return;
          lastDirection = scrollDirection;

          const reduced = reducedMotionRef.current;
          const hide = scrollDirection === 1;
          const vars = {
            autoAlpha: hide ? 0 : 1,
            duration: reduced ? 0.2 : hide ? 5 : 3,
            ease: "expo.out",
            overwrite: "auto",
          };
          // The bar slides out of the screen in the normal case. With reduced
          // motion it only fades, so nothing travels across the viewport.
          if (!reduced) vars.y = hide ? -200 : 0;

          gsap.to(navRef.current, vars);
        },
      },
    });
    return tl;
  };

  useEffect(() => {
    const context = gsap.context(() => {
      const tl = timeline.current;
      tl.add(animateNav(navRef, scroll.ref), 0);
    });

    return () => context.revert();
  }, []);

  const routes = [
    { name: "Home", path: "/" },
    { name: "Technology", path: "/technology" },
    { name: "Products", path: "/products" },
  ];

  return (
    // The bar itself is what slides away, so the ref belongs to the header.
    // It used to be attached to the inner nav as well, where the second
    // assignment silently decided which of the two was animated.
    <header ref={navRef} className="navbar__wrapper">
      <nav className="navbar" style={{ fontFamily: "Rajdhani" }}>
        {routes.map((route) => {
          return (
            <Link
              onClick={() => lenis.scrollTo("top", { duration: 0 })}
              to={route.path}
              key={route.name}
              style={{ position: "relative" }}
            >
              {route.name}
              <div
                className="navbar__pseudoElement"
                ref={getStickyElementRef(route.path)}
              ></div>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useScrollContext } from "./Scroll";
import { Link } from "@tanstack/react-router";
import { useStickyContext } from "./StickyCursor/StickyContext";

export function NavBar() {
  const { lenis } = useScrollContext();
  const timeline = useRef(gsap.timeline());
  const scroll = useScrollContext();
  const navRef = useRef();
  const { addStickyElement, removeStickyElement } = useStickyContext();
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

          if (scrollDirection === 1) {
            gsap.to(navRef.current, {
              y: -200,
              autoAlpha: 0,
              duration: 5,
              ease: "expo.out",
            });
          } else {
            gsap.to(navRef.current, {
              y: 0,
              autoAlpha: 1,
              duration: 3,
              ease: "expo.out",
            });
          }
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
    <header ref={navRef} className="navbar__wrapper">
      <nav
        className="navbar"
        ref={navRef}
        style={{ fontFamily: "Rajdhani" }}
      >
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

import { useEffect, useState } from "react";

export function LandscapePrompt() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", updateWindowWidth);

    return () => {
      window.removeEventListener("resize", updateWindowWidth);
    };
  }, []);

  if (windowWidth <= 600)
    return (
      // A black panel over the whole viewport: the scene behind it cannot be
      // seen, so it is marked as an occluder and the canvas stops drawing.
      <div className="landscapePrompt" data-scene-occluder>
        <p>
          For an optimal experience please use your device in landscape mode.
        </p>
      </div>
    );
}

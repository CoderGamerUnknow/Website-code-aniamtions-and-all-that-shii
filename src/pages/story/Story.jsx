import { useEffect, useRef } from "react";
import { SecondaryLoader } from "../../components";
import styles from "./story.module.scss";
import gsap from "gsap";
import { animateStory } from "./animations";

export function Story() {
  const timeline = useRef(gsap.timeline());
  const storyRef = useRef();

  useEffect(() => {
    const context = gsap.context(() => {
      const tl = timeline.current;
      tl.add(animateStory(storyRef));
    }, storyRef);

    return () => context.revert();
  }, []);

  return (
    <>
      <SecondaryLoader />
      <div className={styles.storyWrapper}>
        <div ref={storyRef} className={styles.storyContainer}>
          <h1
            style={{ fontFamily: "Orbitron" }}
            className={styles.storyTitle}
          >
            Technology
          </h1>
          <div className={styles.textContainer}>
            <p>
              NVIDIA Corporation was founded in 1993 by Jensen Huang, Chris
              Malachowsky and Curtis Priem on a single bet: that accelerated
              computing would define the future of graphics — and eventually
              everything else. The name, taken from the Latin invidia
              (&quot;envy&quot;), paired with the green eye logo, became
              shorthand for raw graphics power.
            </p>
            <p>
              In 1999, NVIDIA shipped the first GeForce and coined the term
              &quot;GPU&quot; — a processor purpose-built for real-time
              graphics. Decades of relentless performance doubling followed,
              turning the graphics card from an optional peripheral into the
              heart of the modern PC.
            </p>
            <p>
              In 2018 the GeForce RTX 20 series made real-time ray tracing a
              consumer reality: RT cores traced light through the scene while
              tensor cores ran AI models like DLSS. Rendering stopped being
              pure rasterization and started being simulated physics plus
              neural networks.
            </p>
            <p>
              Today, the same CUDA foundation that started with gaming GPUs
              powers the modern AI era. NVIDIA data center systems — DGX, the
              Grace Hopper Superchip and the GB200 NVL72 rack — train and serve
              the largest models in the world, while GeForce RTX puts that same
              AI silicon on millions of desktops for DLSS 4, creative work and
              gaming.
            </p>
            <p>
              The current chapter: the GeForce RTX 50 series, built on the
              Blackwell architecture, pairs GDDR7 memory with DLSS 4 Multi
              Frame Generation — pushing path-traced 4K beyond what seemed
              possible only one generation ago.
            </p>
            <p>The green era of accelerated computing is only accelerating.</p>
          </div>
        </div>
      </div>
    </>
  );
}

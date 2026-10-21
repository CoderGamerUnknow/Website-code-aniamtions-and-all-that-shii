# NVIDIA — GeForce RTX Promo

A fan-made, animation-rich promotional website celebrating **NVIDIA**, **GeForce RTX**
and the technology behind modern gaming and AI (ray tracing, DLSS 4, CUDA and the
AI data center era).

> Not affiliated with, endorsed by or sponsored by NVIDIA. All trademarks and product
> names belong to their respective owners.

## What's inside

- **Home** — loader with progress bar and fire wheel, clip-reveal hero, a scroll-scrubbed
  canvas scene (green perspective grid + data motes), timed subtitle choreography and
  CTA buttons.
- **Technology** — the NVIDIA story page with reveal animations.
- **Products** — filterable product gallery (RTX 50 / RTX 40 / AI & Data Center / The Tech
  Inside) with parametric SVG artwork (spinning GPU fans, racks, chips) and an animated
  detail overlay.
- Custom **magnetic cursor**, **eye scroll-to-top button**, Lenis smooth scrolling,
  GSAP ScrollTrigger timelines, Framer Motion springs.

## Stack

Vite · React 18 · SCSS modules · Tailwind · GSAP (+ ScrollTrigger) · Framer Motion ·
Lenis · TanStack Router · Orbitron + Rajdhani (self-hosted, OFL)

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

## Credits

Based on the animation starter [JJK-promo](https://github.com/EduardStroescu/JJK-promo)
by **Eduard Stroescu** — all animation architecture (loader, magnetic cursor, scroll
choreography) originates from that project. Content and theming reworked for this NVIDIA
concept site.

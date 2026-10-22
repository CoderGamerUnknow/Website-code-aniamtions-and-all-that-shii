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

## The animation audit

The site is mostly motion, so its behaviour is checked by a real browser instead of by
reading the code. The audit builds the site, serves the production bundle, opens it in
headless Chrome and asserts what a visitor actually gets: the intro counts to 100 and
gets out of the way, the bar fades and slides, the iris comes back to life, the scene
beats land on their own point of the scroll, the product grid renders and switches, a
client-side navigation starts at the top, and nothing is written to the console.

It runs the whole suite twice: once with the normal motion and once with
`prefers-reduced-motion: reduce` emulated, so the reduced-motion path is held to the
same standard as the rest.

```bash
npm run audit:anim        # build, serve the production bundle and audit it
npm run audit:anim:dist   # audit the dist/ folder that is already there
node tools/anim-audit/index.mjs --url http://localhost:5173   # audit a running server
node tools/anim-audit/index.mjs --only nav                   # a single check or group
```

The run ends with a pass/fail line per check and exits with `1` when a check failed, so
it can be used as a CI gate. A JSON report is written to `.freebuff/audit/report.json`.
The workflow in `.github/workflows/anim-audit.yml` runs it on every push and pull
request.

The audit drives Chrome over the DevTools Protocol, so it needs no extra packages; it
finds Chrome or Edge by itself and `CHROME_PATH` overrides the search. A check that
needs to look inside GSAP opens the page with `?audit=1`, which exposes the GSAP,
ScrollTrigger and Lenis handles in a production build as well. Without that parameter
nothing extra is exposed to a visitor.

## Credits

Based on the animation starter [JJK-promo](https://github.com/EduardStroescu/JJK-promo)
by **Eduard Stroescu** — all animation architecture (loader, magnetic cursor, scroll
choreography) originates from that project. Content and theming reworked for this NVIDIA
concept site.

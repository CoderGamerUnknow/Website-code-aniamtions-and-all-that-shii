// The animation audit.
//
// Every check states a behaviour the site is supposed to have and reports
// pass or fail. The checks are deliberately written against what the visitor
// can observe (computed styles, the DOM, the pixels of the canvas) so they
// hold for the production bundle and not only for a development build.
//
// The suite runs twice: once with the normal motion and once with
// `prefers-reduced-motion: reduce` emulated.

import { sleep } from "./cdp.mjs";

// ---------------------------------------------------------------- helpers

/** Finds the element that scrolls the page (the Lenis wrapper). */
const findScroller = `(() => {
  for (const el of document.querySelectorAll('div')) {
    if (getComputedStyle(el).overflowY === 'scroll') return el;
  }
  return null;
})()`;

/**
 * Moves the scroller to an offset and waits until it is really there.
 *
 * The scroll is set the same way a mouse wheel moves the page - natively on
 * the scroller - and Lenis is told about it, so the normal and the reduced
 * motion path end up in the same place. The browser that runs the audit
 * does not perform the default action of a wheel event, which is why the
 * scroll is driven directly.
 */
async function scrollTo(client, y) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await client.evaluate(`(() => {
      const scroller = ${findScroller};
      if (!scroller) return false;
      scroller.scrollTop = ${y};
      if (window.__lenis) window.__lenis.scrollTo(${y}, { immediate: true, force: true });
      return true;
    })()`);
    await sleep(250);
    const landed = await currentScroll(client);
    if (landed !== null && Math.abs(landed - y) <= 4) return landed;
  }
  return currentScroll(client);
}

const currentScroll = (client) =>
  client.evaluate(`(() => {
    const scroller = ${findScroller};
    return scroller ? Math.round(scroller.scrollTop) : null;
  })()`);

/** The Lenis scroller and how far it can go. */
const scrollGeometry = (client) =>
  client.evaluate(`(() => {
    const scroller = ${findScroller};
    if (!scroller) return null;
    return {
      scrollTop: Math.round(scroller.scrollTop),
      maxScroll: Math.round(scroller.scrollHeight - scroller.clientHeight),
      viewportHeight: window.innerHeight,
    };
  })()`);

/** The opacity / visibility / transform of the nav bar. */
const navState = (client) =>
  client.evaluate(`(() => {
    const el = document.querySelector('.navbar__wrapper');
    if (!el) return null;
    const s = getComputedStyle(el);
    const matrix = new DOMMatrixReadOnly(s.transform === 'none' ? '' : s.transform);
    return {
      opacity: Number(s.opacity),
      visibility: s.visibility,
      translateY: Math.round(matrix.m42),
    };
  })()`);

/** Waits until the intro loader is gone and the page is interactive. */
export async function waitForApp(client, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await client.evaluate(`(() => {
      const loader = document.querySelector('[class*="loader__wrapper"]');
      const nav = document.querySelector('.navbar__wrapper');
      return !loader && !!nav;
    })()`);
    if (ready) return true;
    await sleep(250);
  }
  return false;
}

/**
 * Waits until the page stops moving on its own.
 *
 * The router resolves its first location a moment after the page loaded and
 * resets the scroll when it does. A check that scrolls before that happens
 * would be dragged back to the top, so the audit waits for the page to be
 * quiet first.
 */
export async function waitForSettled(client, timeoutMs = 20000) {
  const start = Date.now();
  let stableSince = null;
  while (Date.now() - start < timeoutMs) {
    const top = await currentScroll(client);
    if (top === 0) {
      if (stableSince === null) stableSince = Date.now();
      else if (Date.now() - stableSince >= 700) return true;
    } else {
      stableSince = null;
    }
    await sleep(150);
  }
  return false;
}

/** Polls an expression until it returns a truthy value. */
async function waitFor(client, expression, timeoutMs = 20000, step = 200) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await client.evaluate(expression);
    if (value) return value;
    await sleep(step);
  }
  return null;
}

const pass = (detail, data) => ({ pass: true, detail, data });
const fail = (detail, data) => ({ pass: false, detail, data });

/** Console errors, ignoring the requests the browser makes on its own. */
function consoleErrors(client) {
  return client.consoleMessages.filter((message) => {
    if (message.type !== "error" && message.type !== "exception") return false;
    // The browser asks for the favicon on its own. A missing favicon is not
    // a defect of the page.
    if (/favicon/i.test(message.text || "") || /favicon/i.test(message.url || "")) {
      return false;
    }
    return true;
  });
}

/**
 * A fingerprint of the canvas pixels, downscaled to 32x32.
 *
 * The whole scene rather than one corner of it: the top of the canvas only
 * holds the stars, which move with the scroll and stand still while the page
 * does. The grid below the horizon sweeps with time, so a scene that keeps
 * drawing keeps changing this value and a paused one does not.
 */
const CANVAS_HASH = `(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const off = document.createElement('canvas');
  off.width = 32;
  off.height = 32;
  const octx = off.getContext('2d');
  octx.drawImage(c, 0, 0, 32, 32);
  const d = octx.getImageData(0, 0, 32, 32).data;
  let h = 0;
  for (let i = 0; i < d.length; i++) { h = (h * 31 + d[i]) | 0; }
  return h;
})()`;

/**
 * Resizes the viewport the way a real window would, or restores the real one
 * when `size` is null.
 *
 * A viewport changed through the protocol does not reach the page as a resize
 * event, so the one a real window would send is dispatched and the scroll
 * measurements are refreshed after it.
 */
async function resizeTo(client, size) {
  if (size) {
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: size.width,
        height: size.height,
        deviceScaleFactor: 1,
        mobile: false,
      },
      client.sessionId
    );
  } else {
    await client.send("Emulation.clearDeviceMetricsOverride", {}, client.sessionId);
  }
  await client.evaluate(`(() => {
    window.dispatchEvent(new Event('resize'));
    if (window.__ScrollTrigger) window.__ScrollTrigger.refresh();
    return true;
  })()`);
  await sleep(900);
}

/**
 * Presses and releases a key the way a keyboard would.
 *
 * Tab is the interesting one: focus traversal only happens for a real key
 * press, so reachability cannot be checked by setting focus in a script.
 */
async function pressKey(client, key, keyCode) {
  const event = {
    key,
    code: key === " " ? "Space" : key,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  };
  await client.send(
    "Input.dispatchKeyEvent",
    { type: "keyDown", ...event },
    client.sessionId
  );
  await client.send(
    "Input.dispatchKeyEvent",
    { type: "keyUp", ...event },
    client.sessionId
  );
}

/**
 * What a screen reader and a keyboard user can get out of the page.
 *
 * Only the rules that catch real defects are checked: every control has a
 * name, every image has an alt (empty when it is decoration), the page has one
 * h1, the headings do not skip a level, and the document declares its
 * language.
 */
const A11Y_SNAPSHOT = `(() => {
  const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return Number(style.opacity) > 0.05;
  };
  const nameOf = (el) => {
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const joined = labelledby
        .split(/\\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((node) => clean(node.textContent))
        .join(' ');
      if (joined) return joined;
    }
    const label = clean(el.getAttribute('aria-label'));
    if (label) return label;
    const image = el.querySelector('img[alt]');
    if (image) {
      const alt = clean(image.getAttribute('alt'));
      if (alt) return alt;
    }
    return clean(el.textContent);
  };

  const controls = [...document.querySelectorAll("a[href], button, [role='button']")].filter(visible);
  const unnamed = controls.filter((el) => !nameOf(el)).map((el) => el.tagName.toLowerCase());

  const images = [...document.querySelectorAll('img')].filter(visible);
  const missingAlt = images
    .filter((el) => !el.hasAttribute('alt'))
    .map((el) => el.getAttribute('src'));

  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter(visible)
    .map((el) => Number(el.tagName[1]));

  const skips = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      skips.push(headings[i - 1] + '->' + headings[i]);
    }
  }

  return {
    lang: clean(document.documentElement.lang),
    controls: controls.length,
    unnamed,
    images: images.length,
    missingAlt,
    h1: headings.filter((level) => level === 1).length,
    skips,
  };
})()`;

// ---------------------------------------------------------------- checks

export const normalChecks = [
  {
    id: "loader",
    group: "Intro loader",
    title: "The intro counts up to 100, shows the title and gets out of the way",
    route: "/",
    waitForApp: false,
    async run(client) {
      // The loader mounts right after the page loads. Give it a moment to
      // appear before the sampling starts, otherwise the first sample would
      // catch a page that has not rendered yet.
      let appeared = false;
      for (let i = 0; i < 40; i++) {
        const present = await client.evaluate(
          `!!document.querySelector('[class*="loader__wrapper"]')`
        );
        if (present) {
          appeared = true;
          break;
        }
        await sleep(50);
      }
      if (!appeared) {
        return fail("the intro loader was never rendered");
      }
      const samples = [];
      for (let i = 0; i < 90; i++) {
        const sample = await client.evaluate(`(() => {
          const wrap = document.querySelector('[class*="loader__wrapper"]');
          const num = document.querySelector('[class*="progressNumber"]');
          const title = document.querySelector('[data-title-first]');
          return {
            present: !!wrap,
            number: num ? num.textContent.trim() : null,
            titleOpacity: title ? Number(getComputedStyle(title).opacity) : null,
          };
        })()`);
        samples.push(sample);
        if (!sample.present) break;
        await sleep(250);
      }
      if (samples.length === 0 || !samples[0].present) {
        return fail("the intro loader was never rendered");
      }
      const numbers = samples
        .filter((s) => s.number !== null)
        .map((s) => Number(s.number))
        .filter((n) => !Number.isNaN(n));
      const last = numbers[numbers.length - 1];
      if (last !== 100) {
        return fail(`the counter stopped at ${last} instead of 100`, { numbers });
      }
      const titleSeen = samples.some((s) => (s.titleOpacity || 0) > 0.9);
      if (!titleSeen) {
        return fail("the title never became visible", { samples });
      }
      if (samples[samples.length - 1].present) {
        return fail("the counter reached 100 but the loader stayed on screen");
      }
      return pass(`counted to ${last}, showed the title and unmounted`, {
        numbers,
      });
    },
  },

  {
    id: "loader.skip",
    group: "Intro loader",
    title: "A click or a key dismisses the intro instead of holding the visitor",
    route: "/",
    waitForApp: false,
    async run(client) {
      let appeared = false;
      for (let i = 0; i < 40; i++) {
        const present = await client.evaluate(
          `!!document.querySelector('[class*="loader__wrapper"]')`
        );
        if (present) {
          appeared = true;
          break;
        }
        await sleep(50);
      }
      if (!appeared) return fail("the intro loader was never rendered");

      // Dismiss it while it is still playing, then wait well short of the
      // time the intro takes on its own.
      await client.evaluate(`(() => {
        window.dispatchEvent(new Event("pointerdown"));
        return true;
      })()`);
      await sleep(900);

      const after = await client.evaluate(`(() => {
        const loader = document.querySelector('[class*="loader__wrapper"]');
        return {
          gone: !loader,
          pageUp: !!document.querySelector('[data-image]'),
        };
      })()`);
      if (!after.gone) {
        return fail("the intro ignored the click and kept playing", { after });
      }
      if (!after.pageUp) {
        return fail("the page did not mount after the intro was dismissed", {
          after,
        });
      }
      return pass("the intro was dismissed on demand and the page came up", {
        after,
      });
    },
  },

  {
    id: "nav.fade",
    group: "Navigation",
    title: "The bar fades out on the way down and comes back on the way up",
    route: "/",
    async run(client) {
      await scrollTo(client, 0);
      await sleep(800);

      // Scroll down with real wheel events, because the bar reacts to the
      // direction of the scroll, not to its position.
      const samples = [];
      for (let i = 0; i < 14; i++) {
        await client.wheel(150, 3, 40);
        await sleep(300);
        const state = await navState(client);
        if (state) samples.push(state);
      }
      const hidden = samples[samples.length - 1];
      if (!hidden || hidden.opacity > 0.05) {
        return fail(
          `the bar is still visible after scrolling down (opacity ${hidden?.opacity})`,
          { samples }
        );
      }
      if (!samples.some((s) => s.opacity < 0.5)) {
        return fail(
          "the bar never faded gradually - it jumped from visible to hidden",
          { samples }
        );
      }
      if (hidden.visibility !== "hidden") {
        return fail("the hidden bar is still marked visible");
      }

      // Now scroll back up: the bar has to return.
      for (let i = 0; i < 12; i++) {
        await client.wheel(-150, 3, 40);
        await sleep(300);
      }
      const back = await navState(client);
      if (!back || back.opacity < 0.9) {
        return fail(
          `the bar did not come back after scrolling up (opacity ${back?.opacity})`,
          { back }
        );
      }
      return pass("faded out on the way down, faded back in on the way up", {
        down: hidden,
        up: back,
      });
    },
  },

  {
    id: "nav.slide",
    group: "Navigation",
    title: "The bar slides out of the viewport instead of only fading",
    route: "/",
    async run(client) {
      await scrollTo(client, 0);
      await sleep(800);
      await client.wheel(150, 10, 40);
      await sleep(2600);
      const hidden = await navState(client);
      if (!hidden) return fail("the bar is not on the page");
      if (hidden.translateY > -100) {
        return fail(
          `the bar faded but did not slide (translateY ${hidden.translateY}px)`,
          { hidden }
        );
      }
      await client.wheel(-150, 10, 40);
      await sleep(2600);
      const back = await navState(client);
      if (!back || Math.abs(back.translateY) > 20) {
        return fail(
          `the bar did not slide back in (translateY ${back?.translateY}px)`,
          { back }
        );
      }
      return pass(`slid to ${hidden.translateY}px and back`, {
        hidden,
        back,
      });
    },
  },

  {
    id: "eye.idle",
    group: "Scroll-to-top eye",
    title: "The idle iris animation comes back when the pointer leaves the window",
    route: "/",
    async run(client) {
      // Move the pointer over the page: the iris follows it.
      for (let i = 0; i < 20; i++) {
        await client.mouseMove(200 + i * 40, 500 + (i % 3) * 60);
        await sleep(40);
      }
      const whileMoving = await client.evaluate(`(() => {
        const el = document.querySelector('.iris');
        if (!el) return null;
        return { className: el.className };
      })()`);
      if (!whileMoving) return fail("the iris is not on the page");

      // Now leave the window entirely: the idle animation has to be restored.
      await client.mouseMove(-20, -20);
      await sleep(700);
      const afterLeaving = await client.evaluate(`(() => {
        const el = document.querySelector('.iris');
        if (!el) return null;
        return {
          className: el.className,
          anims: el.getAnimations().map((a) => ({
            name: a.animationName,
            state: a.playState,
          })),
        };
      })()`);
      if (!afterLeaving) return fail("the iris disappeared");
      const idle = afterLeaving.anims.find((a) => a.name === "iris");
      if (!idle) {
        return fail(
          "the idle iris animation did not come back after the pointer left",
          { whileMoving, afterLeaving }
        );
      }
      if (idle.state !== "running") {
        return fail(`the idle iris animation is ${idle.state}, not running`, {
          afterLeaving,
        });
      }
      return pass("the idle animation resumed after the pointer left", {
        whileMoving,
        afterLeaving,
      });
    },
  },

  {
    id: "eye.churn",
    group: "Scroll-to-top eye",
    title: "Moving the pointer does not rewrite the iris on every event",
    route: "/",
    async run(client) {
      await client.evaluate(`(() => {
        window.__irisClassWrites = 0;
        const iris = document.querySelector('.iris');
        if (!iris) return false;
        const observer = new MutationObserver(() => { window.__irisClassWrites++; });
        observer.observe(iris, { attributes: true, attributeFilter: ['class'] });
        window.__irisObserver = observer;
        return true;
      })()`);
      for (let i = 0; i < 20; i++) {
        await client.mouseMove(200 + i * 40, 500 + (i % 3) * 60);
        await sleep(40);
      }
      const writes = await client.evaluate(
        `(() => { window.__irisObserver?.disconnect(); return window.__irisClassWrites; })()`
      );
      // One write per pointer move is what the class churn looked like: the
      // same attribute was written 20 times for 20 moves.
      if (writes > 3) {
        return fail(
          `the iris class was rewritten ${writes} times for 20 pointer moves`,
          { writes }
        );
      }
      return pass(`the iris class was rewritten ${writes} times for 20 moves`, {
        writes,
      });
    },
  },

  {
    id: "eye.click",
    group: "Scroll-to-top eye",
    title: "Clicking the iris scrolls back to the top",
    route: "/",
    async run(client) {
      await scrollTo(client, 3000);
      await sleep(1500);
      const box = await client.evaluate(`(() => {
        const el = document.querySelector('.iris');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
      })()`);
      if (!box) return fail("the iris is not on the page");
      await client.click(box.x, box.y);
      await sleep(6000);
      const top = await currentScroll(client);
      if (top === null || top > 50) {
        return fail(`the page is still at ${top}px after the click`, { top });
      }
      return pass(`the page scrolled back to ${top}px`);
    },
  },

  {
    id: "gsap.tweens",
    group: "GSAP",
    title: "Scrolling does not pile up tweens on the bar",
    route: "/",
    async run(client) {
      await scrollTo(client, 0);
      await sleep(800);
      for (let i = 0; i < 8; i++) {
        await client.wheel(150, 6, 30);
        await sleep(200);
      }
      await sleep(2500);
      const state = await client.evaluate(`(() => {
        const g = window.__gsap;
        if (!g) return null;
        const nav = document.querySelector('.navbar__wrapper');
        const kids = g.globalTimeline.getChildren(true, true, true);
        const active = kids.filter((k) => k.isActive && k.isActive());
        const onNav = active.filter((k) => {
          const t = k.targets && k.targets()[0];
          return t === nav;
        });
        return {
          total: kids.length,
          active: active.length,
          activeOnNav: onNav.length,
        };
      })()`);
      if (!state) return fail("the audit hooks are not available on this build");
      if (state.activeOnNav > 1) {
        return fail(
          `${state.activeOnNav} tweens are running against the bar at the same time`,
          { state }
        );
      }
      if (state.active > 12) {
        return fail(`${state.active} tweens are running at once`, { state });
      }
      return pass(`at most ${state.activeOnNav} tween on the bar`, { state });
    },
  },

  {
    id: "gsap.triggers",
    group: "GSAP",
    title: "Every scroll trigger is bound to the Lenis scroller",
    route: "/",
    async run(client) {
      const state = await client.evaluate(`(() => {
        const ST = window.__ScrollTrigger;
        if (!ST) return null;
        const scroller = ${findScroller};
        const all = ST.getAll();
        return {
          count: all.length,
          scrollerIsLenis: all.every((t) => t.scroller === scroller),
          ends: all.map((t) => Math.round(t.end)),
        };
      })()`);
      if (!state) return fail("the audit hooks are not available on this build");
      if (state.count === 0) return fail("no scroll triggers were created");
      if (!state.scrollerIsLenis) {
        return fail("a trigger is bound to something other than the scroller", {
          state,
        });
      }
      return pass(`${state.count} triggers, all on the Lenis scroller`, { state });
    },
  },

  {
    id: "scroll.choreography",
    group: "Scroll choreography",
    title: "Every scene beat appears at its own point of the scroll",
    route: "/",
    async run(client) {
      const beats = [
        {
          name: "series",
          selector: '[class*="seriesSubtitle"]',
          from: 700,
          to: 1250,
        },
        {
          name: "outNow",
          selector: '[class*="outNowSubtitle"]',
          from: 6800,
          to: 7300,
        },
        {
          name: "shopNow",
          selector: '[class*="shopNowSubtitle"]',
          from: 7400,
          to: 9000,
        },
      ];
      const results = [];
      for (const beat of beats) {
        let best = 0;
        let bestAt = null;
        for (let y = beat.from; y <= beat.to; y += 50) {
          await scrollTo(client, y);
          await sleep(240);
          const opacity = await client.evaluate(`(() => {
            const el = document.querySelector(${JSON.stringify(
              beat.selector
            )});
            if (!el) return null;
            return Number(getComputedStyle(el).opacity);
          })()`);
          if (opacity !== null && opacity > best) {
            best = opacity;
            bestAt = y;
          }
        }
        results.push({ name: beat.name, peak: Number(best.toFixed(3)), at: bestAt });
        if (best < 0.8) {
          return fail(`the "${beat.name}" beat never became visible`, { results });
        }
      }
      return pass(
        results.map((r) => `${r.name} at ${r.at}px (${r.peak})`).join(", "),
        { results }
      );
    },
  },

  {
    id: "scroll.reachable",
    group: "Scroll choreography",
    title: "The disclaimer at the end of the page can be scrolled to",
    route: "/",
    async run(client) {
      const geometry = await scrollGeometry(client);
      if (!geometry) return fail("no scroll container was found");
      if (geometry.maxScroll < 9000) {
        return fail(`the page only scrolls ${geometry.maxScroll}px`, { geometry });
      }
      await scrollTo(client, geometry.maxScroll);
      await sleep(1500);
      const footer = await client.evaluate(`(() => {
        const el = document.querySelector('[data-footer]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
      })()`);
      if (!footer) return fail("the disclaimer is not on the page");
      if (footer.bottom > geometry.viewportHeight + 8) {
        return fail(
          `the disclaimer still runs ${footer.bottom - geometry.viewportHeight}px past the bottom of the viewport`,
          { geometry, footer }
        );
      }
      return pass(`the disclaimer is fully visible at ${geometry.maxScroll}px`, {
        geometry,
        footer,
      });
    },
  },

  {
    id: "canvas.pause",
    group: "Performance",
    title: "The scene stops drawing while it cannot be seen",
    route: "/",
    async run(client) {
      // The scene is the only thing on the site that animates on its own, so
      // every frame it draws has to be one a visitor can see: it must stop
      // for a hidden tab and for an opaque layer over the whole viewport, and
      // it must keep drawing for a partial cover, which is most of the page.
      const sample = async () => {
        const first = await client.evaluate(CANVAS_HASH);
        await sleep(600);
        const second = await client.evaluate(CANVAS_HASH);
        return { first, second, still: first === second };
      };

      const geometry = await scrollGeometry(client);
      if (!geometry) return fail("the scroll container was not found");

      // A fifth of the way down, on the window the audit really runs in: the
      // grid sweeps, so the scene is drawing.
      await scrollTo(client, Math.round(geometry.maxScroll * 0.2));
      await sleep(600);
      const visible = await sample();
      if (visible.first === null) return fail("there is no canvas on the page");
      if (visible.still) {
        return fail("the scene is not drawing while it is visible", { visible });
      }

      // The end of the page on that same window. The disclaimer is shorter
      // than the screen here, so a strip of the scene stays visible above it
      // and the scene has to keep drawing — freezing would be the bug, and it
      // is the case a check written only against a short viewport misses.
      await scrollTo(client, geometry.maxScroll);
      await sleep(900);
      const atBottom = await sample();
      if (atBottom.still) {
        return fail(
          "the scene froze while a strip of it was still visible above the disclaimer",
          { atBottom, geometry }
        );
      }

      // A window the disclaimer is taller than: at the bottom the panel covers
      // the scene completely, so the drawing has to stop.
      await resizeTo(client, { width: 1280, height: 400 });
      const shortGeometry = await scrollGeometry(client);
      await scrollTo(client, shortGeometry.maxScroll);
      await sleep(1000);
      const covered = await sample();
      if (!covered.still) {
        return fail("the scene keeps drawing while the disclaimer covers it", {
          covered,
        });
      }

      // A portrait phone: the rotate prompt is opaque and fills the viewport,
      // so the scene behind it cannot be seen either.
      await resizeTo(client, { width: 420, height: 800 });
      await sleep(1200);
      const behindPrompt = await sample();
      if (!behindPrompt.still) {
        return fail("the scene keeps drawing behind the rotate prompt", {
          behindPrompt,
        });
      }

      // Back to the real window: everything is visible again.
      await resizeTo(client, null);
      await sleep(900);
      const resumed = await sample();
      if (resumed.still) {
        return fail("the scene did not resume when it became visible again", {
          resumed,
        });
      }

      // A background tab cannot be produced from the DevTools protocol, so the
      // flag the handler reads is shadowed for the length of one event.
      await client.evaluate(`(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        return true;
      })()`);
      await sleep(700);
      const hiddenTab = await sample();
      await client.evaluate(`(() => {
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
        return true;
      })()`);
      if (!hiddenTab.still) {
        return fail("the scene keeps drawing while the tab is hidden", {
          hiddenTab,
        });
      }

      await sleep(700);
      const shownAgain = await sample();
      if (shownAgain.still) {
        return fail("the scene did not resume when the tab came back", {
          shownAgain,
        });
      }

      return pass(
        "drew while visible and above the disclaimer, froze under it, behind the rotate prompt and in a hidden tab, and resumed every time",
        { visible, atBottom, covered, behindPrompt, resumed, hiddenTab, shownAgain }
      );
    },
  },

  {
    id: "products.cards",
    group: "Products",
    title: "The product grid renders one card per product",
    route: "/products",
    async run(client) {
      const state = await client.evaluate(`(() => {
        const cards = [...document.querySelectorAll('button[class*="individualCharacter"]')];
        const titles = [...document.querySelectorAll('[class*="individualCharacter__title"]')]
          .map((t) => t.textContent.trim())
          .filter(Boolean);
        const ids = [...document.querySelectorAll('svg linearGradient')].map((g) => g.id);
        return {
          cards: cards.length,
          titles,
          gradientIds: ids.length,
          uniqueGradientIds: new Set(ids).size,
          fanAnimations: document
            .getAnimations()
            .filter((a) => a.animationName === 'gpuFanSpin').length,
        };
      })()`);
      if (state.cards === 0) return fail("no product cards were rendered");
      if (state.titles.length !== state.cards) {
        return fail(
          `${state.cards} cards but ${state.titles.length} titles`,
          { state }
        );
      }
      if (state.gradientIds !== state.uniqueGradientIds) {
        return fail(
          `${state.gradientIds - state.uniqueGradientIds} gradient ids are used more than once`,
          { state }
        );
      }
      if (state.fanAnimations === 0) {
        return fail("the fans of the product art are not spinning", { state });
      }
      return pass(
        `${state.cards} cards, ${state.uniqueGradientIds} unique gradient ids, ${state.fanAnimations} spinning fans`,
        { state }
      );
    },
  },

  {
    id: "products.category",
    group: "Products",
    title: "Switching the category replaces the products",
    route: "/products",
    async run(client) {
      const before = await client.evaluate(
        `[...document.querySelectorAll('[class*="individualCharacter__title"]')].map((t) => t.textContent.trim())`
      );
      const clicked = await client.evaluate(`(() => {
        const cats = [...document.querySelectorAll('button[class*="categories__single"]')];
        const el = cats[1];
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!clicked) return fail("there is no second category to switch to");
      await sleep(2500);
      const after = await client.evaluate(
        `[...document.querySelectorAll('[class*="individualCharacter__title"]')].map((t) => t.textContent.trim())`
      );
      if (after.length === 0) return fail("the grid is empty after the switch");
      if (JSON.stringify(before) === JSON.stringify(after)) {
        return fail("the products did not change after switching category", {
          before,
          after,
        });
      }
      return pass(`${before.length} products replaced by ${after.length}`, {
        before,
        after,
      });
    },
  },

  {
    id: "products.overlay",
    group: "Products",
    title: "The product detail overlay opens and closes again",
    route: "/products",
    async run(client) {
      const opened = await client.evaluate(`(() => {
        const card = document.querySelector('button[class*="individualCharacter"]');
        if (!card) return false;
        card.click();
        return true;
      })()`);
      if (!opened) return fail("there is no product card to open");
      await sleep(1500);
      const openState = await client.evaluate(`(() => {
        const el = document.querySelector('[class*="selectedCharacter"]');
        if (!el) return null;
        const s = getComputedStyle(el);
        return { opacity: Number(s.opacity), clipPath: s.clipPath };
      })()`);
      if (!openState) return fail("the overlay is not on the page");
      if (!/100%/.test(openState.clipPath || "")) {
        return fail(
          `the overlay did not open (clip-path ${openState.clipPath})`,
          { openState }
        );
      }

      const closed = await client.evaluate(`(() => {
        const btn = document.querySelector('button[class*="closeButton"]');
        if (!btn) return false;
        btn.click();
        return true;
      })()`);
      if (!closed) return fail("the overlay has no close button");
      await sleep(2500);
      const closeState = await client.evaluate(`(() => {
        const el = document.querySelector('[class*="selectedCharacter"]');
        if (!el) return { gone: true };
        return { gone: false, clipPath: getComputedStyle(el).clipPath };
      })()`);
      if (!closeState.gone && !/0%/.test(closeState.clipPath || "")) {
        return fail(`the overlay is still open (clip-path ${closeState.clipPath})`, {
          closeState,
        });
      }

      // Escape is the way out a keyboard user reaches for first.
      const reopened = await client.evaluate(`(() => {
        const card = document.querySelector('button[class*="individualCharacter"]');
        if (!card) return false;
        card.click();
        return true;
      })()`);
      if (!reopened) return fail("the overlay could not be opened a second time");
      await sleep(1200);
      const escaped = await client.send(
        "Input.dispatchKeyEvent",
        { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
        client.sessionId
      );
      void escaped;
      await sleep(2500);
      const escapeState = await client.evaluate(`(() => {
        const el = document.querySelector('[class*="selectedCharacter"]');
        return el ? { gone: false, clipPath: getComputedStyle(el).clipPath } : { gone: true };
      })()`);
      if (!escapeState.gone) {
        return fail("Escape did not close the overlay", { escapeState });
      }

      return pass("the overlay opened, closed with the button and closed with Escape", {
        openState,
        closeState,
      });
    },
  },

  {
    id: "routing",
    group: "Routing",
    title: "A client-side navigation opens the new page at the top",
    route: "/",
    async run(client) {
      await scrollTo(client, 4000);
      await sleep(800);
      const before = await currentScroll(client);

      const navigated = await client.evaluate(`(() => {
        const link = [...document.querySelectorAll('.navbar a')].find(
          (a) => a.getAttribute('href') === '/products'
        );
        if (!link) return false;
        link.click();
        return true;
      })()`);
      if (!navigated) return fail("there is no link to the products page");
      await sleep(3500);
      const after = await currentScroll(client);
      const path = await client.evaluate("window.location.pathname");
      if (path !== "/products") {
        return fail(`the navigation went to ${path} instead of /products`);
      }
      if (after === null || after > 50) {
        return fail(
          `the new page opened at ${after}px instead of the top (came from ${before}px)`,
          { before, after }
        );
      }

      // The triggers of the new page have to be measured against the new
      // page, not against the page that was left behind.
      const state = await client.evaluate(`(() => {
        const ST = window.__ScrollTrigger;
        if (!ST) return null;
        const all = ST.getAll();
        return {
          count: all.length,
          maxEnd: Math.max(0, ...all.map((t) => Math.round(t.end))),
        };
      })()`);
      if (state) {
        const geometry = await scrollGeometry(client);
        if (geometry && state.maxEnd > geometry.maxScroll + 500) {
          return fail(
            `a trigger ends at ${state.maxEnd}px but the new page only scrolls ${geometry.maxScroll}px`,
            { state, geometry }
          );
        }
        if (state.count === 0) {
          return fail("the new page has no scroll triggers");
        }
      }
      return pass(`the new page opened at ${after}px with ${state?.count} triggers`, {
        before,
        after,
        state,
      });
    },
  },

  {
    id: "a11y.document",
    group: "Accessibility",
    title: "The document is described: language, headings, names and alt text",
    route: "/",
    async run(client) {
      const home = await client.evaluate(A11Y_SNAPSHOT);
      if (!home.lang) return fail("the document does not declare its language", { home });
      if (home.h1 !== 1) return fail(`${home.h1} h1 headings on the landing page`, { home });
      if (home.skips.length) {
        return fail(`headings skip a level (${home.skips.join(", ")})`, { home });
      }
      if (home.unnamed.length) {
        return fail(`${home.unnamed.length} controls have no accessible name`, { home });
      }
      if (home.missingAlt.length) {
        return fail(`${home.missingAlt.length} images have no alt attribute`, { home });
      }

      // The product page is the other shape of page: a grid of buttons and a
      // dialog that only exists once a card is opened.
      await client.navigate(`${client.base}/products?audit=1`);
      const ready = await waitForApp(client);
      if (!ready) return fail("the products page never became ready");
      await waitForSettled(client);

      const products = await client.evaluate(A11Y_SNAPSHOT);
      if (products.h1 !== 1) {
        return fail(`${products.h1} h1 headings on the products page`, { products });
      }
      if (products.skips.length) {
        return fail(
          `the products page skips a heading level (${products.skips.join(", ")})`,
          { products }
        );
      }
      if (products.unnamed.length) {
        return fail(
          `${products.unnamed.length} controls on the products page have no accessible name`,
          { products }
        );
      }
      if (products.missingAlt.length) {
        return fail(
          `${products.missingAlt.length} images on the products page have no alt attribute`,
          { products }
        );
      }

      return pass(
        `landing page: ${home.controls} named controls, ${home.images} described images, one h1; products page: ${products.controls} controls, one h1`,
        { home, products }
      );
    },
  },

  {
    id: "a11y.keyboard",
    group: "Accessibility",
    title: "Every control can be reached with Tab, and the eye answers Enter",
    route: "/",
    async run(client) {
      await scrollTo(client, 0);
      await sleep(800);

      // Tagging the controls before the walk gives each one a stable name to
      // report, whatever it is called on screen.
      const controlCount = await client.evaluate(`(() => {
        const visible = (el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') return false;
          return Number(style.opacity) > 0.05;
        };
        const controls = [...document.querySelectorAll("a[href], button, [role='button']")].filter(visible);
        controls.forEach((el, index) => el.setAttribute('data-a11y-index', String(index)));
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
        return controls.length;
      })()`);
      if (!controlCount) return fail("the landing page has no controls at all");

      const reached = new Set();
      for (let i = 0; i < controlCount + 2; i++) {
        await pressKey(client, "Tab", 9);
        const index = await client.evaluate(`(() => {
          const el = document.activeElement;
          if (!el || !el.getAttribute) return null;
          return el.getAttribute('data-a11y-index');
        })()`);
        if (index !== null && index !== undefined) reached.add(index);
      }

      const missing = [];
      for (let i = 0; i < controlCount; i++) {
        if (!reached.has(String(i))) missing.push(i);
      }
      if (missing.length) {
        return fail(
          `${missing.length} of ${controlCount} controls can never be reached with Tab`,
          { missing }
        );
      }

      // The eye was the one control that only answered a pointer. It has to be
      // announced as a button and work from the keyboard to stay reachable.
      const eye = await client.evaluate(`(() => {
        const el = document.querySelector('.eye .iris');
        if (!el) return null;
        return {
          role: el.getAttribute('role'),
          tabIndex: el.tabIndex,
          label: (el.getAttribute('aria-label') || '').trim(),
        };
      })()`);
      if (!eye) return fail("the eye is not on the page");
      if (eye.role !== "button" || eye.tabIndex < 0 || !eye.label) {
        return fail("the eye cannot be operated from the keyboard", { eye });
      }

      // The eye only appears on the way down, so the page is scrolled back to
      // the top first: arriving from the footer would be an upward scroll and
      // leave the control hidden while the check tries to focus it.
      await scrollTo(client, 0);
      await sleep(800);
      await scrollTo(client, 3000);
      await sleep(2500);

      const focused = await client.evaluate(`(() => {
        const el = document.querySelector('.eye .iris');
        if (!el) return null;
        el.focus();
        const wrapper = el.parentElement;
        const style = getComputedStyle(wrapper);
        return {
          isActive: document.activeElement === el,
          visibility: style.visibility,
          opacity: Number(style.opacity),
        };
      })()`);
      if (!focused || !focused.isActive) {
        return fail("the eye cannot take focus", { focused });
      }

      await pressKey(client, "Enter", 13);
      await sleep(6000);
      const top = await currentScroll(client);
      if (top === null || top > 50) {
        return fail(`Enter on the eye left the page at ${top}px`, { top });
      }

      return pass(
        `${controlCount} controls reached with Tab, and Enter on the eye scrolled back to ${top}px`,
        { eye }
      );
    },
  },

  {
    id: "console.errors",
    group: "Console",
    title: "Nothing was written to the console as an error",
    route: "/",
    async run(client) {
      const errors = consoleErrors(client);
      if (errors.length > 0) {
        return fail(`${errors.length} console errors`, {
          errors: errors.slice(0, 5),
        });
      }
      return pass("the console is clean");
    },
  },
];

export const reducedChecks = [
  {
    id: "reduced.loader",
    group: "Reduced motion",
    title: "The animated intro loader is skipped",
    route: "/",
    waitForApp: false,
    async run(client) {
      let seen = false;
      for (let i = 0; i < 80; i++) {
        const present = await client.evaluate(
          `!!document.querySelector('[class*="loader__wrapper"]')`
        );
        if (present) {
          seen = true;
          break;
        }
        await sleep(50);
      }
      if (seen) {
        return fail(
          "the intro loader was rendered even though less motion was asked for"
        );
      }
      const ready = await waitFor(
        client,
        `!!document.querySelector('.navbar__wrapper')`,
        10000,
        100
      );
      if (!ready) {
        return fail("the page never came up without the loader");
      }
      return pass("the loader never mounted and the page came up directly");
    },
  },

  {
    id: "reduced.canvas",
    group: "Reduced motion",
    title: "The canvas scene draws one still frame instead of animating",
    route: "/",
    async run(client) {
      // The page is still arranging itself for the first second: the webfonts
      // arrive and the disclaimer is measured, and every reflow resizes the
      // canvas, which correctly redraws the still frame for the new size.
      // Sameness is measured once that has stopped, so a single resize cannot
      // be mistaken for an animation.
      await client.evaluate(
        `document.fonts ? document.fonts.ready.then(() => true) : true`
      );
      await sleep(1200);

      // One still frame is the whole point: the hash of the downscaled scene
      // has to stay identical, exactly as it does for a paused scene.
      const first = await client.evaluate(CANVAS_HASH);
      if (first === null) return fail("there is no canvas on the page");
      await sleep(700);
      const second = await client.evaluate(CANVAS_HASH);
      if (first !== second) {
        return fail("the canvas is still being redrawn", { first, second });
      }
      return pass(`the canvas is unchanged over 700ms (hash ${first})`);
    },
  },

  {
    id: "reduced.css",
    group: "Reduced motion",
    title: "No animation that runs on its own is still running",
    route: "/",
    async run(client) {
      const findEndless = `(() => {
        return document.getAnimations()
          .filter((a) => {
            if (a.playState !== 'running') return false;
            const timing = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
            return !timing || timing.iterations === Infinity;
          })
          .map((a) => a.animationName);
      })()`;

      // The home page and the products page carry different art, so both are
      // looked at: the fans of the product art only exist on the second one.
      const home = await client.evaluate(findEndless);
      await client.navigate(`${client.base}/products?audit=1`);
      await waitForApp(client);
      await sleep(2500);
      const products = await client.evaluate(findEndless);

      const running = [...home, ...products];
      if (running.length > 0) {
        return fail(
          `${running.length} animations are still running: ${[...new Set(running)].join(", ")}`,
          { home, products }
        );
      }
      return pass("nothing is animating on its own on either page", {
        home,
        products,
      });
    },
  },

  {
    id: "reduced.cursor",
    group: "Reduced motion",
    title: "The custom cursor is not rendered",
    route: "/",
    async run(client) {
      const present = await client.evaluate(
        `!!document.querySelector('[data-sticky-cursor]')`
      );
      if (present) {
        return fail("the custom cursor is on the page");
      }
      return pass("the custom cursor was left out");
    },
  },

  {
    id: "reduced.nav",
    group: "Reduced motion",
    title: "The bar fades without sliding across the viewport",
    route: "/",
    async run(client) {
      await scrollTo(client, 0);
      await sleep(800);
      const samples = [];
      for (const y of [600, 1200, 1800, 2400]) {
        await scrollTo(client, y);
        await sleep(450);
        const state = await navState(client);
        if (state) samples.push(state);
      }
      const hidden = samples[samples.length - 1];
      if (!hidden) return fail("the bar is not on the page");
      if (hidden.opacity > 0.05) {
        return fail(`the bar is still visible (opacity ${hidden.opacity})`, {
          hidden,
          samples,
        });
      }
      if (hidden.translateY < -50) {
        return fail(
          `the bar slid ${hidden.translateY}px - with less motion it should only fade`,
          { hidden }
        );
      }
      await scrollTo(client, 0);
      await sleep(700);
      const back = await navState(client);
      if (!back || back.opacity < 0.9) {
        return fail(`the bar did not come back (opacity ${back?.opacity})`, { back });
      }
      return pass("the bar faded in place and came back", { hidden, back });
    },
  },

  {
    id: "reduced.products",
    group: "Reduced motion",
    title: "The products page still works",
    route: "/products",
    async run(client) {
      // Give the one-off reveals of the page time to finish, so only the
      // animations that run on their own are counted.
      await sleep(2500);
      const state = await client.evaluate(`(() => {
        const cards = [...document.querySelectorAll('button[class*="individualCharacter"]')];
        const endless = document.getAnimations().filter((a) => {
          if (a.playState !== 'running') return false;
          const timing = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
          return !timing || timing.iterations === Infinity;
        });
        return {
          cards: cards.length,
          endless: endless.map((a) => a.animationName),
          transitionLoader: !!document.querySelector('[class*="transition_loader"]'),
        };
      })()`);
      if (state.cards === 0) return fail("no product cards were rendered", { state });
      if (state.endless.length > 0) {
        return fail(
          `${state.endless.length} animations run on their own: ${state.endless.join(", ")}`,
          { state }
        );
      }
      if (state.transitionLoader) {
        return fail("the route transition overlay is still on the page", { state });
      }
      return pass(`${state.cards} product cards and nothing animating`, { state });
    },
  },

  {
    id: "reduced.console",
    group: "Console",
    title: "Nothing was written to the console as an error",
    route: "/",
    async run(client) {
      const errors = consoleErrors(client);
      if (errors.length > 0) {
        return fail(`${errors.length} console errors`, {
          errors: errors.slice(0, 5),
        });
      }
      return pass("the console is clean");
    },
  },
];

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { isSceneSeen } from "./useSceneVisibility.js";

// The predicate reads `document` and `window` when it is called, so a DOM only
// has to exist by then. jsdom supplies one, and the viewport is set per test
// because jsdom's default 1024x768 is not the size anything is measured at.
const dom = new JSDOM("<!doctype html><html><body></body></html>");

globalThis.window = dom.window;
globalThis.document = dom.window.document;

const setViewport = (width, height) => {
  Object.defineProperty(dom.window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(dom.window, "innerHeight", {
    value: height,
    configurable: true,
  });
};

const setHidden = (hidden) => {
  Object.defineProperty(dom.window.document, "hidden", {
    value: hidden,
    configurable: true,
  });
};

const withBox = (element, { top = 0, left = 0, width, height }) => {
  element.getBoundingClientRect = () => ({
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  });
  return element;
};

const canvasFilling = ({ width = 1000, height = 800 } = {}) =>
  withBox(dom.window.document.createElement("canvas"), { width, height });

const occluderWith = (box) => {
  const element = dom.window.document.createElement("div");
  element.setAttribute("data-scene-occluder", "");
  withBox(element, box);
  dom.window.document.body.appendChild(element);
  return element;
};

test.beforeEach(() => {
  dom.window.document.body.innerHTML = "";
  setViewport(1000, 800);
  setHidden(false);
});

test("a scene that fills a visible viewport is seen", () => {
  assert.equal(isSceneSeen(canvasFilling()), true);
});

test("a hidden tab is never seen, whatever the geometry says", () => {
  setHidden(true);
  assert.equal(isSceneSeen(canvasFilling()), false);
});

test("a canvas with no size is not seen", () => {
  assert.equal(isSceneSeen(canvasFilling({ width: 0, height: 0 })), false);
  assert.equal(isSceneSeen(canvasFilling({ width: 1000, height: 0 })), false);
});

test("an occluder that covers the viewport hides the scene", () => {
  occluderWith({ top: 0, left: 0, width: 1000, height: 800 });
  assert.equal(isSceneSeen(canvasFilling()), false);
});

test("an occluder that overhangs the viewport still covers it", () => {
  occluderWith({ top: -40, left: -20, width: 1100, height: 900 });
  assert.equal(isSceneSeen(canvasFilling()), false);
});

test("a panel shorter than the viewport leaves a strip of the scene seen", () => {
  // The disclaimer is opaque but shorter than the screen, which is the common
  // case on a desktop viewport: freezing the scene there would be the bug.
  occluderWith({ top: 500, left: 0, width: 1000, height: 300 });
  assert.equal(isSceneSeen(canvasFilling()), true);
});

test("a panel that only covers part of the width leaves the scene seen", () => {
  occluderWith({ top: 0, left: 0, width: 600, height: 800 });
  assert.equal(isSceneSeen(canvasFilling()), true);
});

test("an occluder that is scrolled past does not hide anything", () => {
  occluderWith({ top: -900, left: 0, width: 1000, height: 800 });
  assert.equal(isSceneSeen(canvasFilling()), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { productsData } from "./data.js";

// What ProductArt can draw. A variant outside this set silently falls back to
// the GPU body, and the product page then shows the wrong artwork for a card
// without failing anywhere.
const VARIANTS = new Set(["gpu", "rack", "chip"]);

const allProducts = productsData.flatMap((entry) => entry.content);

test("every category lists at least one product", () => {
  assert.ok(productsData.length > 0);
  for (const entry of productsData) {
    assert.equal(typeof entry.category, "string");
    assert.ok(entry.content.length > 0, `${entry.category} is empty`);
  }
});

test("product names are unique, because they key the cards", () => {
  const names = allProducts.map((product) => product.name);
  assert.equal(new Set(names).size, names.length);
});

test("every product carries a complete description", () => {
  for (const product of allProducts) {
    assert.ok(product.name.length > 0);
    assert.ok(
      product.description.length > 40,
      `${product.name} has no usable description`
    );
  }
});

test("every product asks for a body the renderer knows", () => {
  for (const product of allProducts) {
    const { variant } = product.art;
    assert.ok(
      VARIANTS.has(variant),
      `${product.name} asks for the unknown variant ${variant}`
    );
  }
});

test("a GPU body is drawn with two or three fans", () => {
  for (const product of allProducts) {
    if (product.art.variant !== "gpu") continue;
    assert.ok(
      product.art.fans === 2 || product.art.fans === 3,
      `${product.name} asks for ${product.art.fans} fans`
    );
  }
});

test("every accent is a hex colour the SVG can paint", () => {
  for (const product of allProducts) {
    assert.match(product.art.accent, /^#[0-9a-fA-F]{6}$/);
  }
});

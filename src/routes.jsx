import { lazy } from "react";

// The landing route ships with the app, because it is where every visitor
// arrives. The other two are fetched when they are first opened, so their code
// is not part of the first download.
export const Story = lazy(() =>
  import("./pages/story/Story").then((module) => ({ default: module.Story }))
);

export const Characters = lazy(() =>
  import("./pages/characters/Characters").then((module) => ({
    default: module.Characters,
  }))
);

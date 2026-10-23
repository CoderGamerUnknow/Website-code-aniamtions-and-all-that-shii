import { createContext, useContext } from "react";

// Split from the provider for the same reason as the scroll context: the
// module that renders the provider has to export components only, or Fast
// Refresh reloads the page instead of the component.
export const StickyContext = createContext();

export const useStickyContext = () => {
  const context = useContext(StickyContext);
  if (!context) {
    throw new Error("useStickyContext must be used within a StickyProvider");
  }
  return context;
};

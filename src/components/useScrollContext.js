import { createContext, useContext } from "react";

// The context and the hook live in their own module. A file that exports a
// component and a hook cannot be hot-reloaded on its own: Fast Refresh falls
// back to reloading the whole page, which loses the scroll position.
export const ScrollContext = createContext();

export const useScrollContext = () => useContext(ScrollContext);

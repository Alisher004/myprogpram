import { lazy } from "react";

// After a deploy, an open tab may still reference route chunks whose hashed file
// names no longer exist. Recovering means reloading once to fetch the new HTML.
//
// Loop guard: one automatic reload per RELOAD_WINDOW_MS, recorded in sessionStorage
// (per tab, survives the reload, never touches the login session). The flag is NOT
// cleared when some other chunk loads fine — otherwise "reload → shell chunk OK →
// page chunk fails again → reload" would loop forever. A second failure inside the
// window is thrown to the ErrorBoundary, which offers a manual reload.
const FLAG = "kb-chunk-reload-at";
export const RELOAD_WINDOW_MS = 30000;

const CHUNK_ERROR = new RegExp(
  [
    "Failed to fetch dynamically imported module", // Chrome / Edge
    "error loading dynamically imported module", // Firefox
    "Importing a module script failed", // Safari
    "Unable to preload CSS", // Vite's CSS preloader
    "Loading chunk .* failed", // webpack-style messages from extensions/proxies
  ].join("|"),
  "i"
);

export function isChunkLoadError(err) {
  return Boolean(err) && (err.name === "ChunkLoadError" || CHUNK_ERROR.test(String(err.message ?? err)));
}

function session() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// Reloads the page unless it already did so recently. Returns true if reloading.
export function reloadOnceForChunkError(reload = () => window.location.reload(), now = Date.now()) {
  const store = session();
  if (!store) return false; // can't remember the attempt → don't risk a loop
  try {
    const last = Number(store.getItem(FLAG));
    if (last && now - last < RELOAD_WINDOW_MS) return false;
    store.setItem(FLAG, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

// React.lazy with one automatic reload on a missing chunk. Other errors (and a
// repeated chunk failure) propagate to the nearest ErrorBoundary.
export function lazyWithReload(factory, reload) {
  return lazy(() =>
    factory().catch((err) => {
      if (isChunkLoadError(err) && reloadOnceForChunkError(reload)) {
        return new Promise(() => {}); // the page is reloading; keep the Suspense fallback
      }
      throw err;
    })
  );
}

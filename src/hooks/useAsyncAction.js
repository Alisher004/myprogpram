import { useCallback, useEffect, useRef, useState } from "react";

// Wraps an async action so it can't run twice at once.
// The ref blocks a second click that lands before React re-renders the disabled
// button; `pending` drives the disabled/loading UI. Server-side duplicates are
// prevented separately (deterministic Firestore document ids + rules).
export function useAsyncAction(action) {
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  const actionRef = useRef(action);
  actionRef.current = action;

  // Set on every mount: StrictMode mounts → unmounts → re-mounts in development
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    if (running.current) return undefined;
    running.current = true;
    setPending(true);
    try {
      return await actionRef.current(...args);
    } finally {
      running.current = false;
      if (mounted.current) setPending(false);
    }
  }, []);

  return { run, pending };
}

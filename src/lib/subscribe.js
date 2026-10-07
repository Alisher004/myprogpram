import { onSnapshot } from "firebase/firestore";

// How long a Firestore listener may stay silent before the UI stops waiting.
// The SDK itself only reports "offline" after ~10s without reaching the backend;
// 15s leaves room for that plus a slow first connection on mobile data, while still
// replacing an endless spinner with an actionable error. The listener is NOT
// cancelled on timeout, so data that arrives later still updates the screen.
export const LISTENER_TIMEOUT_MS = 15000;

// Codes that can succeed if tried again; anything about permissions/auth cannot
const RETRYABLE = new Set(["unavailable", "deadline-exceeded", "resource-exhausted", "internal", "unknown", "cancelled", "aborted"]);

export function classifyFirestoreError(err) {
  const code = err?.code ?? "unknown";
  if (code === "app/timeout") return { kind: "timeout", code, retryable: true };
  if (code === "permission-denied" || code === "unauthenticated") return { kind: "permission", code, retryable: false };
  return { kind: "network", code, retryable: RETRYABLE.has(code) || !code.includes("/") };
}

const timeoutError = () => Object.assign(new Error("Listener timed out"), { code: "app/timeout" });

// While offline, Firestore answers at once from its local cache. An EMPTY cache answer
// (document "doesn't exist", query has no rows) before the server has ever replied
// means "unknown", not "missing"/"none" — showing it would tell an offline student
// their profile is gone. Cached data that does exist is shown as usual.
function isUnconfirmedEmpty(snap, serverAnswered) {
  if (serverAnswered || !snap?.metadata?.fromCache) return false;
  return typeof snap.exists === "function" ? !snap.exists() : Boolean(snap.empty);
}

// onSnapshot that reports a timeout if the first answer doesn't arrive in time.
// Returns the unsubscribe function; it also cancels the pending timer.
export function subscribeWithTimeout(ref, onData, onError, timeoutMs = LISTENER_TIMEOUT_MS) {
  let answered = false;
  let serverAnswered = false;
  const timer = setTimeout(() => {
    if (!answered) onError?.(timeoutError());
  }, timeoutMs);
  const settle = () => {
    answered = true;
    clearTimeout(timer);
  };
  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (isUnconfirmedEmpty(snap, serverAnswered)) return; // keep waiting (timeout still armed)
      if (!snap?.metadata?.fromCache) serverAnswered = true;
      settle();
      onData(snap);
    },
    (err) => {
      settle();
      onError?.(err);
    }
  );
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

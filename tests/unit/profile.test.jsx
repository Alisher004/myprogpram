// Profile loading reliability: every outcome of the users/{uid} listener must end in
// a definite state — never an endless "loading".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Controllable fakes for the Firebase SDK
const fb = vi.hoisted(() => ({
  authCallback: null,
  listeners: [], // { path, next, error, unsubscribe }
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth, cb) => {
    fb.authCallback = cb;
    return () => {};
  },
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(async () => fb.authCallback?.(null)),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db, col, id) => `${col}/${id}`,
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: () => "SERVER_TIME",
  onSnapshot: (path, next, error) => {
    const listener = { path, next, error, unsubscribe: vi.fn() };
    fb.listeners.push(listener);
    return listener.unsubscribe;
  },
}));

const { AuthProvider, useAuth, PROFILE_TIMEOUT_MS } = await import("../../src/auth/AuthContext");

const USER = { uid: "u1", email: "u1@test.dev" };
const snap = (data, { fromCache = false } = {}) => ({
  exists: () => data !== null,
  data: () => data ?? undefined,
  metadata: { fromCache },
});
const firebaseError = (code) => Object.assign(new Error(code), { code });
const latest = () => fb.listeners.at(-1);
const profileListeners = () => fb.listeners.filter((l) => l.path === "users/u1");

function signedIn() {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  act(() => fb.authCallback(USER));
  return hook;
}

beforeEach(() => {
  fb.authCallback = null;
  fb.listeners = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("profile listener outcomes", () => {
  it("is 'loading' right after sign-in", () => {
    const { result } = signedIn();
    expect(result.current.profileStatus).toBe("loading");
  });

  it("success → ready with the profile", () => {
    const { result } = signedIn();
    act(() => latest().next(snap({ role: "student", name: "A" })));
    expect(result.current.profileStatus).toBe("ready");
    expect(result.current.profile).toEqual({ role: "student", name: "A" });
    expect(result.current.profileError).toBeNull();
  });

  it("document missing → 'missing', not an error", () => {
    const { result } = signedIn();
    act(() => latest().next(snap(null)));
    expect(result.current.profileStatus).toBe("missing");
    expect(result.current.profileError).toBeNull();
  });

  // Regression (found by E2E): offline, the SDK answers at once from its empty cache with
  // exists() === false. That is "unknown", not "missing" — it must not say the profile is gone.
  it("offline cache-only 'not found' is not treated as a missing profile", () => {
    const { result } = signedIn();
    act(() => latest().next(snap(null, { fromCache: true })));
    expect(result.current.profileStatus).toBe("loading");
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS));
    expect(result.current.profileError).toMatchObject({ kind: "timeout" });
    act(() => latest().next(snap({ role: "student" })));
    expect(result.current.profileStatus).toBe("ready");
  });

  it("after a server answer, later cache snapshots (going offline) are still used", () => {
    const { result } = signedIn();
    act(() => latest().next(snap({ role: "student", name: "A" })));
    act(() => latest().next(snap({ role: "student", name: "A (cached)" }, { fromCache: true })));
    expect(result.current.profile.name).toBe("A (cached)");
  });

  it("permission denied → error 'permission' (not reported as a missing profile, not retryable)", () => {
    const { result } = signedIn();
    act(() => latest().error(firebaseError("permission-denied")));
    expect(result.current.profileStatus).toBe("error");
    expect(result.current.profileError).toMatchObject({ kind: "permission", retryable: false });
  });

  it.each(["unavailable", "deadline-exceeded", "resource-exhausted", "internal", "unknown"])(
    "%s → error 'network', retryable",
    (code) => {
      const { result } = signedIn();
      act(() => latest().error(firebaseError(code)));
      expect(result.current.profileStatus).toBe("error");
      expect(result.current.profileError).toMatchObject({ kind: "network", retryable: true });
    }
  );

  it("listener never answers → 'timeout' error after PROFILE_TIMEOUT_MS, not endless loading", () => {
    const { result } = signedIn();
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS - 1));
    expect(result.current.profileStatus).toBe("loading");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.profileStatus).toBe("error");
    expect(result.current.profileError).toMatchObject({ kind: "timeout", retryable: true });
  });

  it("a late snapshot after the timeout still recovers (listener stays attached)", () => {
    const { result } = signedIn();
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS));
    expect(result.current.profileStatus).toBe("error");
    act(() => latest().next(snap({ role: "teacher" })));
    expect(result.current.profileStatus).toBe("ready");
    expect(latest().unsubscribe).not.toHaveBeenCalled();
  });

  it("no timeout fires once the profile has loaded", () => {
    const { result } = signedIn();
    act(() => latest().next(snap({ role: "student" })));
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS * 3));
    expect(result.current.profileStatus).toBe("ready");
  });
});

describe("retry", () => {
  it("re-subscribes once and returns to loading", () => {
    const { result } = signedIn();
    const first = latest();
    act(() => first.error(firebaseError("unavailable")));
    act(() => result.current.retryProfile());
    expect(first.unsubscribe).toHaveBeenCalledTimes(1);
    expect(profileListeners()).toHaveLength(2);
    expect(result.current.profileStatus).toBe("loading");
    act(() => latest().next(snap({ role: "student" })));
    expect(result.current.profileStatus).toBe("ready");
  });

  it("rapid repeated retries open a single new listener", () => {
    const { result } = signedIn();
    act(() => latest().error(firebaseError("unavailable")));
    act(() => {
      result.current.retryProfile();
      result.current.retryProfile();
      result.current.retryProfile();
    });
    expect(profileListeners()).toHaveLength(2);
  });

  it("does nothing while loading or ready (no duplicate subscriptions)", () => {
    const { result } = signedIn();
    act(() => result.current.retryProfile());
    expect(profileListeners()).toHaveLength(1);
    act(() => latest().next(snap({ role: "student" })));
    act(() => result.current.retryProfile());
    expect(profileListeners()).toHaveLength(1);
  });

  it("retry after a timeout restarts the timer", () => {
    const { result } = signedIn();
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS));
    act(() => result.current.retryProfile());
    expect(result.current.profileStatus).toBe("loading");
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS - 1));
    expect(result.current.profileStatus).toBe("loading");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.profileError).toMatchObject({ kind: "timeout" });
  });
});

describe("cleanup", () => {
  it("logout while the profile is loading unsubscribes and cancels the timeout", async () => {
    const { result } = signedIn();
    const listener = latest();
    await act(() => result.current.logout());
    expect(listener.unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.profileStatus).toBe("none");
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(PROFILE_TIMEOUT_MS * 2));
    expect(result.current.profileStatus).toBe("none");
  });

  it("unmount unsubscribes and leaves no timer behind", () => {
    const { unmount } = signedIn();
    const listener = latest();
    unmount();
    expect(listener.unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("switching user drops the previous user's late snapshot", () => {
    const { result } = signedIn();
    const old = latest();
    act(() => fb.authCallback({ uid: "u2", email: "u2@test.dev" }));
    act(() => old.next(snap({ role: "admin" })));
    expect(result.current.profile).toBeNull();
    expect(result.current.profileStatus).toBe("loading");
  });
});

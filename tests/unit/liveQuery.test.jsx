import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const fb = vi.hoisted(() => ({ listeners: [] }));
vi.mock("firebase/firestore", () => ({
  onSnapshot: (ref, next, error) => {
    const l = { ref, next, error, unsubscribe: vi.fn() };
    fb.listeners.push(l);
    return l.unsubscribe;
  },
}));
const { LISTENER_TIMEOUT_MS, classifyFirestoreError, subscribeWithTimeout } = await import("../../src/lib/subscribe");
const { useLiveQuery } = await import("../../src/hooks/useLiveQuery");

beforeEach(() => {
  fb.listeners = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("subscribeWithTimeout", () => {
  it("reports a timeout once when the listener stays silent", () => {
    const onError = vi.fn();
    subscribeWithTimeout("ref", vi.fn(), onError);
    vi.advanceTimersByTime(LISTENER_TIMEOUT_MS * 3);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].code).toBe("app/timeout");
  });
  it("no timeout once data arrived; later data keeps flowing", () => {
    const onData = vi.fn();
    const onError = vi.fn();
    subscribeWithTimeout("ref", onData, onError);
    fb.listeners[0].next("snap1");
    vi.advanceTimersByTime(LISTENER_TIMEOUT_MS * 2);
    fb.listeners[0].next("snap2");
    expect(onError).not.toHaveBeenCalled();
    expect(onData).toHaveBeenCalledTimes(2);
  });
  it("unsubscribing cancels the timer and the listener", () => {
    const onError = vi.fn();
    const stop = subscribeWithTimeout("ref", vi.fn(), onError);
    stop();
    vi.advanceTimersByTime(LISTENER_TIMEOUT_MS * 2);
    expect(onError).not.toHaveBeenCalled();
    expect(fb.listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("classifies errors", () => {
    expect(classifyFirestoreError({ code: "permission-denied" })).toMatchObject({ kind: "permission", retryable: false });
    expect(classifyFirestoreError({ code: "unauthenticated" })).toMatchObject({ kind: "permission", retryable: false });
    expect(classifyFirestoreError({ code: "unavailable" })).toMatchObject({ kind: "network", retryable: true });
    expect(classifyFirestoreError({ code: "app/timeout" })).toMatchObject({ kind: "timeout", retryable: true });
  });
});

describe("useLiveQuery", () => {
  const watch = (next, fail) => subscribeWithTimeout("q", (snap) => next(snap), fail);

  it("loading → data", () => {
    const { result } = renderHook(() => useLiveQuery(watch, []));
    expect(result.current.data).toBeUndefined();
    act(() => fb.listeners[0].next(["a"]));
    expect(result.current.data).toEqual(["a"]);
  });
  it("loading → timeout → failed (no endless loading)", () => {
    const { result } = renderHook(() => useLiveQuery(watch, []));
    act(() => vi.advanceTimersByTime(LISTENER_TIMEOUT_MS));
    expect(result.current.failed).toBe(true);
  });
  it("late data after a failure recovers by itself", () => {
    const { result } = renderHook(() => useLiveQuery(watch, []));
    act(() => vi.advanceTimersByTime(LISTENER_TIMEOUT_MS));
    act(() => fb.listeners[0].next(["late"]));
    expect(result.current).toMatchObject({ failed: false, data: ["late"] });
  });
  it("retry: rapid calls re-subscribe exactly once and drop the old listener", () => {
    const { result } = renderHook(() => useLiveQuery(watch, []));
    act(() => fb.listeners[0].error({ code: "unavailable" }));
    act(() => {
      result.current.retry();
      result.current.retry();
      result.current.retry();
    });
    expect(fb.listeners).toHaveLength(2);
    expect(fb.listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ failed: false, data: undefined });
  });
  it("unmount cleans up listener and timer", () => {
    const { unmount } = renderHook(() => useLiveQuery(watch, []));
    unmount();
    expect(fb.listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

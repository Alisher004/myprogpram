import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../src/i18n/I18nContext";
import ErrorBoundary from "../../src/components/ErrorBoundary";
import { RELOAD_WINDOW_MS, isChunkLoadError, lazyWithReload, reloadOnceForChunkError } from "../../src/lib/chunkRecovery";

const chunkError = () => new TypeError("Failed to fetch dynamically imported module: https://x/assets/Page-1a2b.js");

function renderLazy(Page) {
  return render(
    <I18nProvider>
      <ErrorBoundary showDetails={false} reload={() => {}}>
        <Suspense fallback={<p>loading…</p>}>
          <Page />
        </Suspense>
      </ErrorBoundary>
    </I18nProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("chunk error detection", () => {
  it.each([
    "Failed to fetch dynamically imported module: /a.js",
    "error loading dynamically imported module",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/x.css",
  ])("recognises %s", (msg) => expect(isChunkLoadError(new Error(msg))).toBe(true));

  it("ignores ordinary errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("one automatic reload", () => {
  it("first chunk failure → reloads once and keeps showing the loader", async () => {
    const reload = vi.fn();
    const Page = lazyWithReload(() => Promise.reject(chunkError()), reload);
    renderLazy(Page);
    await act(async () => {});
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.getByText("loading…")).toBeTruthy();
    expect(sessionStorage.getItem("kb-chunk-reload-at")).not.toBeNull();
  });

  it("failing again right after that reload → no second reload, fallback instead", async () => {
    const reload = vi.fn();
    sessionStorage.setItem("kb-chunk-reload-at", String(Date.now())); // the reload just happened
    const Page = lazyWithReload(() => Promise.reject(chunkError()), reload);
    renderLazy(Page);
    await act(async () => {});
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("other chunks loading fine do NOT re-arm the reload (no reload loop)", async () => {
    const reload = vi.fn();
    sessionStorage.setItem("kb-chunk-reload-at", String(Date.now()));
    const Fine = lazyWithReload(() => Promise.resolve({ default: () => <p>shell</p> }), reload);
    renderLazy(Fine);
    await screen.findByText("shell");
    const Broken = lazyWithReload(() => Promise.reject(chunkError()), reload);
    renderLazy(Broken);
    await act(async () => {});
    expect(reload).not.toHaveBeenCalled();
  });

  it("a failure long after the last reload (a later deploy) may reload once again", () => {
    const reload = vi.fn();
    const now = Date.now();
    sessionStorage.setItem("kb-chunk-reload-at", String(now - RELOAD_WINDOW_MS - 1));
    expect(reloadOnceForChunkError(reload, now)).toBe(true);
    expect(reloadOnceForChunkError(reload, now + 1000)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("normal lazy navigation never reloads", async () => {
    const reload = vi.fn();
    const Page = lazyWithReload(() => Promise.resolve({ default: () => <p>students</p> }), reload);
    renderLazy(Page);
    await screen.findByText("students");
    expect(reload).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("kb-chunk-reload-at")).toBeNull();
  });

  it("non-chunk errors go straight to the ErrorBoundary without reloading", async () => {
    const reload = vi.fn();
    const Page = lazyWithReload(() => Promise.reject(new Error("syntax error in module")), reload);
    renderLazy(Page);
    await act(async () => {});
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("without sessionStorage it never auto-reloads (can't guard against loops)", () => {
    const reload = vi.fn();
    const spy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(reloadOnceForChunkError(reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

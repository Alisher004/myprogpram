import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import kg from "../../src/i18n/kg.json";
import { I18nProvider } from "../../src/i18n/I18nContext";
import ErrorBoundary from "../../src/components/ErrorBoundary";

const control = { fail: true };
function Bomb() {
  if (control.fail) throw new Error("SECRET internal detail: token=abc123");
  return <p>page content</p>;
}
const mount = (props = {}) =>
  render(
    <I18nProvider>
      <ErrorBoundary showDetails={false} {...props}>
        <Bomb />
      </ErrorBoundary>
    </I18nProvider>
  );

beforeEach(() => {
  control.fail = true;
  vi.spyOn(console, "error").mockImplementation(() => {}); // React logs caught errors
});
afterEach(() => vi.restoreAllMocks());

describe("ErrorBoundary", () => {
  it("replaces a crashed subtree with a translated fallback instead of a blank page", () => {
    mount();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading").textContent).toBe(kg.errors.boundary.title);
    expect(screen.queryByText("page content")).toBeNull();
  });

  it("moves focus to the message for keyboard and screen-reader users", () => {
    mount();
    expect(document.activeElement).toBe(screen.getByRole("heading"));
  });

  it("Retry re-renders the children once the problem is gone", () => {
    mount();
    control.fail = false;
    fireEvent.click(screen.getByRole("button", { name: kg.common.retry }));
    expect(screen.getByText("page content")).toBeTruthy();
  });

  it("Reload calls the reload handler", () => {
    const reload = vi.fn();
    mount({ reload });
    fireEvent.click(screen.getByRole("button", { name: kg.common.reload }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("production mode never shows the error message or stack", () => {
    mount({ showDetails: false });
    expect(document.body.textContent).not.toContain("SECRET");
    expect(document.querySelector("details")).toBeNull();
  });

  it("development mode keeps the stack available for debugging", () => {
    mount({ showDetails: true });
    expect(document.querySelector("details pre").textContent).toContain("SECRET internal detail");
  });

  it("a new resetKey (navigation) clears the error", () => {
    const view = mount({ resetKey: "/a" });
    control.fail = false;
    view.rerender(
      <I18nProvider>
        <ErrorBoundary showDetails={false} resetKey="/b">
          <Bomb />
        </ErrorBoundary>
      </I18nProvider>
    );
    expect(screen.getByText("page content")).toBeTruthy();
  });

  it("a missing chunk shows the 'new version' message with Reload only", () => {
    function ChunkBomb() {
      throw new TypeError("Failed to fetch dynamically imported module: /assets/Students-abc.js");
    }
    render(
      <I18nProvider>
        <ErrorBoundary showDetails={false}>
          <ChunkBomb />
        </ErrorBoundary>
      </I18nProvider>
    );
    expect(screen.getByRole("heading").textContent).toBe(kg.errors.update.title);
    expect(screen.queryByRole("button", { name: kg.common.retry })).toBeNull();
    expect(screen.getByRole("button", { name: kg.common.reload })).toBeTruthy();
  });
});

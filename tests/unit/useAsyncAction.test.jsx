import { StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useAsyncAction } from "../../src/hooks/useAsyncAction";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
};

describe("useAsyncAction (double-submit guard)", () => {
  it("runs the action once when called twice before it settles", async () => {
    const d = deferred();
    const action = vi.fn(() => d.promise);
    const { result } = renderHook(() => useAsyncAction(action));
    let first, second;
    act(() => {
      first = result.current.run();
      second = result.current.run();
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(true);
    await act(async () => d.resolve("ok"));
    expect(await first).toBe("ok");
    expect(await second).toBeUndefined();
    expect(result.current.pending).toBe(false);
  });

  it("can run again after a failure", async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("second");
    const { result } = renderHook(() => useAsyncAction(action));
    await act(async () => {
      await expect(result.current.run()).rejects.toThrow("boom");
    });
    expect(result.current.pending).toBe(false);
    await act(async () => expect(await result.current.run()).toBe("second"));
    expect(action).toHaveBeenCalledTimes(2);
  });

  // Regression: StrictMode mounts → unmounts → re-mounts in development. The guard
  // used to stay "pending" forever, leaving every protected button disabled.
  it("re-enables the button under StrictMode", async () => {
    const d = deferred();
    function SaveButton() {
      const { run, pending } = useAsyncAction(() => d.promise);
      return (
        <button disabled={pending} onClick={run}>
          save
        </button>
      );
    }
    render(
      <StrictMode>
        <SaveButton />
      </StrictMode>
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    await act(async () => d.resolve());
    expect(button.disabled).toBe(false);
  });

  it("a rapid triple click on a form submit fires one request", async () => {
    const d = deferred();
    const submit = vi.fn(() => d.promise);
    function Form() {
      const [n] = useState(0);
      const { run, pending } = useAsyncAction(submit);
      return (
        <form onSubmit={(e) => (e.preventDefault(), run(n))}>
          <button type="submit" disabled={pending}>
            go
          </button>
        </form>
      );
    }
    render(<Form />);
    const form = screen.getByRole("button").closest("form");
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve());
  });
});

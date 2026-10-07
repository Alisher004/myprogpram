import { useCallback, useEffect, useState } from "react";

// Subscribes with `subscribe(onData, onError) → unsubscribe` and exposes
// { data, failed, retry }. data === undefined while loading.
//  - failed: the listener errored or timed out (see lib/subscribe.js)
//  - data arriving after a timeout clears `failed` (the listener stays attached)
//  - retry() re-subscribes; calls made before the next render collapse into one
export function useLiveQuery(subscribe, deps) {
  const [state, setState] = useState({ data: undefined, failed: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState({ data: undefined, failed: false });
    return subscribe(
      (data) => setState({ data, failed: false }),
      () => setState((s) => ({ ...s, failed: true }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { data: state.data, failed: state.failed, retry };
}

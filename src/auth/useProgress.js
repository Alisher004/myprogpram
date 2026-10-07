import { useCallback, useEffect, useState } from "react";
import { deleteField, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { subscribeWithTimeout } from "../lib/subscribe";
import { useAuth } from "./AuthContext";

// progress/{uid} = { completed: { "26": Timestamp, ... }, updatedAt }
export function useProgress() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setCompleted({});
    setReady(false);
    setFailed(false);
    if (!user) return;
    return subscribeWithTimeout(
      doc(db, "progress", user.uid),
      (snap) => {
        setCompleted(snap.data()?.completed ?? {});
        setReady(true);
        setFailed(false);
      },
      () => setFailed(true)
    );
  }, [user, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Check key presence, not truthiness: a pending serverTimestamp() reads as null locally
  const isDone = useCallback((lessonId) => lessonId in completed, [completed]);

  const toggle = useCallback(
    (lessonId) => {
      if (!user) return;
      const done = lessonId in completed;
      return setDoc(
        doc(db, "progress", user.uid),
        {
          completed: { [lessonId]: done ? deleteField() : serverTimestamp() },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    },
    [user, completed]
  );

  return { ready, failed, retry, isDone, toggle, count: Object.keys(completed).length };
}

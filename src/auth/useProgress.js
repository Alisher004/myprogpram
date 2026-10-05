import { useCallback, useEffect, useState } from "react";
import { deleteField, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./AuthContext";

// progress/{uid} = { completed: { "26": Timestamp, ... }, updatedAt }
export function useProgress() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCompleted({});
    setReady(false);
    if (!user) return;
    return onSnapshot(doc(db, "progress", user.uid), (snap) => {
      setCompleted(snap.data()?.completed ?? {});
      setReady(true);
    });
  }, [user]);

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

  return { ready, isDone, toggle, count: Object.keys(completed).length };
}

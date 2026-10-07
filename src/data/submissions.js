import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { subscribeWithTimeout } from "../lib/subscribe";

// submissions/{uid}_{lessonId}
// { uid, studentName, studentEmail, lessonId, url, note, status, submittedAt,
//   grade?, feedback?, reviewedAt?, reviewedBy?, reviewerName? }
// status: "pending" → "accepted" | "needs_work"

const submissionsRef = () => collection(db, "submissions");
const submissionId = (uid, lessonId) => `${uid}_${lessonId}`;

const ALLOWED_HOSTS = [/(^|\.)github\.com$/, /\.github\.io$/, /\.vercel\.app$/, /\.netlify\.app$/];

export function isAllowedLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

const withId = (snap) => ({ id: snap.id, ...snap.data() });

// All watchers: onError fires on a listener error or if no answer arrives in time
export function watchMySubmission(uid, lessonId, cb, onError) {
  return subscribeWithTimeout(
    doc(db, "submissions", submissionId(uid, lessonId)),
    (snap) => cb(snap.exists() ? withId(snap) : null),
    onError
  );
}

export function watchMySubmissions(uid, cb, onError) {
  return subscribeWithTimeout(
    query(submissionsRef(), where("uid", "==", uid)),
    (snap) => cb(snap.docs.map(withId).sort((a, b) => a.lessonId - b.lessonId)),
    onError
  );
}

// Full replace (no merge): a resubmit drops the previous review and goes back to pending
export function submitHomework({ user, profile, lessonId, url, note }) {
  return setDoc(doc(db, "submissions", submissionId(user.uid, lessonId)), {
    uid: user.uid,
    studentName: profile?.name || user.email,
    studentEmail: user.email,
    lessonId,
    url: url.trim(),
    note: note.trim(),
    status: "pending",
    submittedAt: serverTimestamp(),
  });
}

export function watchPendingSubmissions(cb, onError) {
  // Single-field filter + client-side sort avoids needing a composite index
  return subscribeWithTimeout(
    query(submissionsRef(), where("status", "==", "pending")),
    (snap) => cb(snap.docs.map(withId).sort((a, b) => (a.submittedAt?.seconds ?? 0) - (b.submittedAt?.seconds ?? 0))),
    onError
  );
}

export function watchRecentSubmissions(cb, onError, max = 100) {
  return subscribeWithTimeout(
    query(submissionsRef(), orderBy("submittedAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map(withId)),
    onError
  );
}

export function reviewSubmission({ id, reviewer, reviewerName, status, grade, feedback }) {
  return updateDoc(doc(db, "submissions", id), {
    status,
    grade,
    feedback: feedback.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy: reviewer.uid,
    reviewerName,
  });
}

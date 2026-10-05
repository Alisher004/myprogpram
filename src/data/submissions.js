import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

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

export function watchMySubmission(uid, lessonId, cb) {
  return onSnapshot(
    doc(db, "submissions", submissionId(uid, lessonId)),
    (snap) => cb(snap.exists() ? withId(snap) : null),
    () => cb(null)
  );
}

export function watchMySubmissions(uid, cb) {
  return onSnapshot(query(submissionsRef(), where("uid", "==", uid)), (snap) =>
    cb(snap.docs.map(withId).sort((a, b) => a.lessonId - b.lessonId))
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

export function watchPendingSubmissions(cb) {
  // Single-field filter + client-side sort avoids needing a composite index
  return onSnapshot(query(submissionsRef(), where("status", "==", "pending")), (snap) =>
    cb(snap.docs.map(withId).sort((a, b) => (a.submittedAt?.seconds ?? 0) - (b.submittedAt?.seconds ?? 0)))
  );
}

export function watchRecentSubmissions(cb, max = 100) {
  return onSnapshot(query(submissionsRef(), orderBy("submittedAt", "desc"), limit(max)), (snap) =>
    cb(snap.docs.map(withId))
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

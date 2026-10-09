import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { LISTENER_TIMEOUT_MS, classifyFirestoreError, subscribeWithTimeout } from "../lib/subscribe";

export const PROFILE_TIMEOUT_MS = LISTENER_TIMEOUT_MS;

const AuthContext = createContext(null);

// Errors raised by our own portal checks (Firebase errors keep their auth/* codes)
function portalError(code, role) {
  const err = new Error(code);
  err.code = code;
  err.role = role;
  return err;
}

// users/{uid} is created only through the student portal, always as "student".
// Teachers/admins are promoted by an admin; Firestore rules forbid self-promotion.
async function createStudentDoc(user, name) {
  const profile = {
    // Apple may share no display name (and a private-relay email), so fall back step by step
    name: name || user.displayName || user.email?.split("@")[0] || "Student",
    email: user.email,
    photoURL: user.photoURL || null,
    role: "student",
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
  return profile;
}

// Each login form is a "portal" for exactly one role. Signing in through the wrong
// portal signs the session straight back out, so a teacher can't land in the student
// cabinet via the student form (and vice versa). Real access control is still the
// Firestore rules; this keeps each role on its own flow.
async function checkPortal(fbUser, portal) {
  const snap = await getDoc(doc(db, "users", fbUser.uid));
  let profile = snap.exists() ? snap.data() : null;
  if (!profile && portal === "student") profile = await createStudentDoc(fbUser);
  if (!profile) throw portalError("app/no-account");
  if (profile.role !== portal) throw portalError("app/wrong-portal", profile.role);
  return profile;
}

async function withPortal(portal, signInFn) {
  const cred = await signInFn();
  try {
    return await checkPortal(cred.user, portal);
  } catch (err) {
    await signOut(auth);
    throw err;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  // Mirrors user.emailVerified; refreshed on demand (Firebase only updates it on reload)
  const [emailVerified, setEmailVerified] = useState(false);
  // Profile snapshot tagged with the uid and attempt it belongs to, so a stale profile
  // from a previous session, a previous retry or the render before the listener
  // attaches is never used.
  const [snapshot, setSnapshot] = useState({ uid: null, attempt: 0, status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  // True while a login form is signing in and checking the role. Pages must not
  // redirect on the transient signed-in state until the check has finished.
  const [portalPending, setPortalPending] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setEmailVerified(Boolean(fbUser?.emailVerified));
      setLoading(false);
    });
  }, []);

  // Live profile: a role change by an admin applies immediately, without reload.
  // Every outcome ends in a definite state: ready, missing, or error (permission /
  // network / timeout). The listener and its timer are torn down on sign-out,
  // user switch, retry and unmount.
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return subscribeWithTimeout(
      doc(db, "users", uid),
      (snap) =>
        setSnapshot({
          uid,
          attempt,
          status: snap.exists() ? "ready" : "missing",
          data: snap.exists() ? snap.data() : null,
          error: null,
        }),
      (err) => setSnapshot({ uid, attempt, status: "error", data: null, error: classifyFirestoreError(err) })
    );
  }, [user, attempt]);

  // Auth:    loading (initializing) → user null (signed out) | user set (signed in)
  // Profile: "none" (signed out) | "loading" | "ready" | "missing" (no users/{uid}) | "error"
  const current = user && snapshot.uid === user.uid && snapshot.attempt === attempt;
  const profileStatus = !user ? "none" : current ? snapshot.status : "loading";
  const profile = current ? snapshot.data : null;
  const profileError = current ? snapshot.error : null;

  // Retry only from a retryable error, and only once per failure: rapid clicks or
  // repeated calls before the next render open a single new listener.
  const retryAllowed = useRef(false);
  retryAllowed.current = profileStatus === "error" && Boolean(profileError?.retryable);
  const retryProfile = useCallback(() => {
    if (!retryAllowed.current) return;
    retryAllowed.current = false;
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo(() => {
    const guarded = async (fn) => {
      setPortalPending(true);
      try {
        return await fn();
      } finally {
        setPortalPending(false);
      }
    };
    return {
      enabled: isFirebaseConfigured,
      user,
      profile,
      profileStatus,
      loading,
      role: profile?.role ?? null,
      profileError,
      retryProfile,
      portalPending,
      signInWithGoogle: (portal) =>
        guarded(() => withPortal(portal, () => signInWithPopup(auth, new GoogleAuthProvider()))),
      // Sign in with Apple (iCloud). Asks for email + name; the name only arrives on the
      // very first Apple sign-in, so createStudentDoc falls back to the email prefix.
      signInWithApple: (portal) =>
        guarded(() =>
          withPortal(portal, () => {
            const provider = new OAuthProvider("apple.com");
            provider.addScope("email");
            provider.addScope("name");
            return signInWithPopup(auth, provider);
          })
        ),
      signInWithEmail: (portal, email, password) =>
        guarded(() => withPortal(portal, () => signInWithEmailAndPassword(auth, email, password))),
      // Self-registration exists only for students. The verification email is
      // best-effort: a failure to send it must not fail the registration.
      signUpStudent: (name, email, password) =>
        guarded(async () => {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          const created = await createStudentDoc(cred.user, name);
          // .then() also catches a synchronous throw, which .catch() alone would miss
          Promise.resolve()
            .then(() => sendEmailVerification(cred.user))
            .catch(() => {});
          return created;
        }),
      // Enumeration-safe: "no such user" is reported as success, so the form never
      // reveals whether an email is registered. Format and rate-limit errors still surface.
      sendPasswordReset: async (email) => {
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (err) {
          if (err?.code !== "auth/user-not-found") throw err;
        }
      },
      emailVerified,
      resendVerification: () => sendEmailVerification(auth.currentUser),
      // Re-reads the account from Firebase Auth (after the user clicked the link)
      refreshEmailVerified: async () => {
        await auth.currentUser.reload();
        const verified = Boolean(auth.currentUser.emailVerified);
        setEmailVerified(verified);
        return verified;
      },
      logout: () => signOut(auth),
    };
  }, [user, profile, profileStatus, profileError, retryProfile, loading, portalPending, emailVerified]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

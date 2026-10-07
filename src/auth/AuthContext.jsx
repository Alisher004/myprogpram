import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";

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
    name: name || user.displayName || user.email.split("@")[0],
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
  // Profile snapshot tagged with the uid it belongs to, so a stale profile from a
  // previous session (or the render before the listener attaches) is never used.
  const [snapshot, setSnapshot] = useState({ uid: null, status: "loading", data: null });
  // True while a login form is signing in and checking the role. Pages must not
  // redirect on the transient signed-in state until the check has finished.
  const [portalPending, setPortalPending] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setLoading(false);
    });
  }, []);

  // Live profile: a role change by an admin applies immediately, without reload
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => setSnapshot({ uid, status: snap.exists() ? "ready" : "missing", data: snap.exists() ? snap.data() : null }),
      () => setSnapshot({ uid, status: "missing", data: null })
    );
  }, [user]);

  // "none" (signed out) | "loading" | "ready" | "missing" (signed in, no users/{uid} doc)
  const current = user && snapshot.uid === user.uid;
  const profileStatus = !user ? "none" : current ? snapshot.status : "loading";
  const profile = current ? snapshot.data : null;

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
      portalPending,
      signInWithGoogle: (portal) =>
        guarded(() => withPortal(portal, () => signInWithPopup(auth, new GoogleAuthProvider()))),
      signInWithEmail: (portal, email, password) =>
        guarded(() => withPortal(portal, () => signInWithEmailAndPassword(auth, email, password))),
      // Self-registration exists only for students
      signUpStudent: (name, email, password) =>
        guarded(async () => {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          return createStudentDoc(cred.user, name);
        }),
      logout: () => signOut(auth),
    };
  }, [user, profile, profileStatus, loading, portalPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

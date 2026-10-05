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

// users/{uid}: created once on first sign-in. Role is always "student";
// teachers/admins are promoted manually (Firestore rules forbid self-promotion).
async function ensureUserDoc(user, name) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = snap.data();
    if (!name || existing.name === name) return existing;
    await setDoc(ref, { name }, { merge: true });
    return { ...existing, name };
  }
  const profile = {
    name: name || user.displayName || user.email.split("@")[0],
    email: user.email,
    photoURL: user.photoURL || null,
    role: "student",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) await ensureUserDoc(fbUser);
      } catch (err) {
        // Keep the user signed in even if Firestore is unreachable; profile just stays empty
        console.error("Could not create user profile", err);
      } finally {
        setUser(fbUser);
        setLoading(false);
      }
    });
  }, []);

  // Live profile, so role changes and name edits show up without reload
  useEffect(() => {
    setProfile(null);
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => setProfile(snap.data() ?? null));
  }, [user]);

  const value = useMemo(
    () => ({
      enabled: isFirebaseConfigured,
      user,
      profile,
      loading,
      signInWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      signInWithEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
      signUpWithEmail: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        // onAuthStateChanged may have already created the doc with an email-based name
        await ensureUserDoc(cred.user, name);
        return cred;
      },
      logout: () => signOut(auth),
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

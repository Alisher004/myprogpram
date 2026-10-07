import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Firebase SDK replaced with controllable fakes
const fb = vi.hoisted(() => ({
  profiles: {}, // uid → users/{uid} data
  signIn: vi.fn(),
  signOut: vi.fn(async () => {}),
  setDoc: vi.fn(async () => {}),
  createUser: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: () => () => {},
  signInWithEmailAndPassword: (...a) => fb.signIn(...a),
  signInWithPopup: (...a) => fb.signIn(...a),
  createUserWithEmailAndPassword: (...a) => fb.createUser(...a),
  updateProfile: vi.fn(async () => {}),
  signOut: (...a) => fb.signOut(...a),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db, col, id) => ({ col, id }),
  getDoc: async ({ id }) => ({ exists: () => id in fb.profiles, data: () => fb.profiles[id] }),
  setDoc: (...a) => fb.setDoc(...a),
  onSnapshot: () => () => {},
  serverTimestamp: () => "SERVER_TIME",
}));

const { AuthProvider, useAuth } = await import("../../src/auth/AuthContext");
const auth = () => renderHook(() => useAuth(), { wrapper: AuthProvider }).result;

const ROLES = ["student", "teacher", "admin"];

beforeEach(() => {
  fb.profiles = {};
  fb.signIn.mockImplementation(async (_auth, email) => ({ user: { uid: `uid-${email}`, email } }));
});

describe("login portals: every role × every portal", () => {
  for (const role of ROLES) {
    for (const portal of ROLES) {
      const allowed = role === portal;
      it(`${role} signing in at the ${portal} portal → ${allowed ? "allowed" : "rejected and signed out"}`, async () => {
        fb.profiles[`uid-${role}@test.dev`] = { role, name: role };
        const result = auth();
        const attempt = act(() => result.current.signInWithEmail(portal, `${role}@test.dev`, "pw"));
        if (allowed) {
          await expect(attempt).resolves.toMatchObject({ role });
          expect(fb.signOut).not.toHaveBeenCalled();
        } else {
          await expect(attempt).rejects.toMatchObject({ code: "app/wrong-portal", role });
          expect(fb.signOut).toHaveBeenCalledTimes(1);
        }
        expect(fb.setDoc).not.toHaveBeenCalled();
        expect(result.current.portalPending).toBe(false);
      });
    }
  }
});

describe("accounts without a profile", () => {
  it("student portal creates a student profile (never another role)", async () => {
    const result = auth();
    await act(() => result.current.signInWithEmail("student", "fresh@test.dev", "pw"));
    expect(fb.setDoc).toHaveBeenCalledTimes(1);
    expect(fb.setDoc.mock.calls[0][1]).toMatchObject({ role: "student", email: "fresh@test.dev" });
    expect(fb.signOut).not.toHaveBeenCalled();
  });

  it.each(["teacher", "admin"])("%s portal refuses, signs out and creates nothing", async (portal) => {
    const result = auth();
    await expect(act(() => result.current.signInWithEmail(portal, "fresh@test.dev", "pw"))).rejects.toMatchObject({
      code: "app/no-account",
    });
    expect(fb.setDoc).not.toHaveBeenCalled();
    expect(fb.signOut).toHaveBeenCalledTimes(1);
  });
});

describe("credentials and registration", () => {
  it("invalid password surfaces Firebase's error and touches no data", async () => {
    fb.signIn.mockRejectedValueOnce(Object.assign(new Error("bad"), { code: "auth/invalid-credential" }));
    const result = auth();
    await expect(act(() => result.current.signInWithEmail("student", "a@test.dev", "wrong"))).rejects.toMatchObject({
      code: "auth/invalid-credential",
    });
    expect(fb.setDoc).not.toHaveBeenCalled();
    expect(result.current.portalPending).toBe(false);
  });

  it("registration always creates a student profile with the given name", async () => {
    fb.createUser.mockResolvedValueOnce({ user: { uid: "new", email: "new@test.dev" } });
    const result = auth();
    await act(() => result.current.signUpStudent("Айгерим", "new@test.dev", "secret1"));
    expect(fb.setDoc).toHaveBeenCalledTimes(1);
    expect(fb.setDoc.mock.calls[0][1]).toMatchObject({ name: "Айгерим", role: "student", email: "new@test.dev" });
  });

  it("portalPending is true only while a sign-in is being checked", async () => {
    let release;
    fb.signIn.mockImplementationOnce(() => new Promise((r) => (release = () => r({ user: { uid: "s", email: "s@test.dev" } }))));
    fb.profiles.s = { role: "student" };
    const result = auth();
    let pending;
    act(() => {
      pending = result.current.signInWithEmail("student", "s@test.dev", "pw");
    });
    expect(result.current.portalPending).toBe(true);
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.portalPending).toBe(false);
  });
});

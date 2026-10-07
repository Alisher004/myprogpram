import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Unit tests never talk to Firebase: the app's firebase module is replaced with
// inert objects. Tests that need Firebase behaviour mock the SDK functions themselves.
vi.mock("/src/lib/firebase.js", () => ({ auth: { currentUser: null }, db: {}, isFirebaseConfigured: true }));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

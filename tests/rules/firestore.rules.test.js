// Firestore Security Rules — the server-side authorization layer of КодБилим.
// Every test talks to the Firestore emulator through the Firebase SDK directly,
// bypassing the UI, exactly as a user with a modified frontend or a script would.
//
// Run with: npm run test:rules   (needs Java for the emulator)
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = "demo-codebilim";
let env;

// ── Fixture accounts ────────────────────────────────────────────────────────
const U = {
  studentA: { uid: "studentA", email: "a@test.dev", role: "student", name: "Student A" },
  studentB: { uid: "studentB", email: "b@test.dev", role: "student", name: "Student B" },
  teacher: { uid: "teacher1", email: "t@test.dev", role: "teacher", name: "Teacher" },
  admin: { uid: "admin1", email: "admin@test.dev", role: "admin", name: "Admin" },
  admin2: { uid: "admin2", email: "admin2@test.dev", role: "admin", name: "Admin Two" },
};

const db = (who) =>
  who ? env.authenticatedContext(U[who].uid, { email: U[who].email }).firestore() : env.unauthenticatedContext().firestore();
// A signed-in Firebase Auth user who has no users/{uid} profile yet (fresh sign-up)
const newcomer = (uid = "newbie", email = "new@test.dev") => env.authenticatedContext(uid, { email }).firestore();

const submission = (owner, lessonId, overrides = {}) => ({
  uid: U[owner].uid,
  studentName: U[owner].name,
  studentEmail: U[owner].email,
  lessonId,
  url: "https://github.com/someone/project",
  note: "",
  status: "pending",
  submittedAt: serverTimestamp(),
  ...overrides,
});

const review = (overrides = {}) => ({
  status: "accepted",
  grade: 5,
  feedback: "Good work",
  reviewedAt: serverTimestamp(),
  reviewedBy: U.teacher.uid,
  reviewerName: U.teacher.name,
  ...overrides,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    // RULES_FILE lets mutation checks run the suite against a deliberately broken copy
    firestore: { rules: readFileSync(process.env.RULES_FILE || "firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore();
    const created = Timestamp.fromDate(new Date("2026-09-01"));
    for (const u of Object.values(U)) {
      await setDoc(doc(fs, "users", u.uid), { name: u.name, email: u.email, photoURL: null, role: u.role, createdAt: created });
    }
    await setDoc(doc(fs, "progress", "studentA"), { completed: { 1: created }, updatedAt: created });
    await setDoc(doc(fs, "progress", "studentB"), { completed: { 1: created, 2: created }, updatedAt: created });
    const sub = (owner, lessonId, extra = {}) => ({ ...submission(owner, lessonId), submittedAt: created, ...extra });
    await setDoc(doc(fs, "submissions", "studentA_3"), sub("studentA", 3));
    await setDoc(doc(fs, "submissions", "studentA_5"), sub("studentA", 5, { status: "accepted", grade: 5, feedback: "ok", reviewedAt: created, reviewedBy: "teacher1", reviewerName: "Teacher" }));
    await setDoc(doc(fs, "submissions", "studentB_3"), sub("studentB", 3));
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("unauthenticated", () => {
  it("cannot read any profile", async () => {
    await assertFails(getDoc(doc(db(), "users", "studentA")));
    await assertFails(getDocs(collection(db(), "users")));
  });
  it("cannot read progress or submissions", async () => {
    await assertFails(getDoc(doc(db(), "progress", "studentA")));
    await assertFails(getDoc(doc(db(), "submissions", "studentA_3")));
    await assertFails(getDocs(collection(db(), "submissions")));
  });
  it("cannot write anything", async () => {
    await assertFails(setDoc(doc(db(), "users", "x"), { name: "x", email: "x@x", role: "student", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db(), "progress", "studentA"), { completed: {} }));
    await assertFails(setDoc(doc(db(), "submissions", "x_1"), submission("studentA", 1)));
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("registration (users/{uid} create)", () => {
  const profile = (overrides = {}) => ({
    name: "New Student",
    email: "new@test.dev",
    photoURL: null,
    role: "student",
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it("ALLOW: a new account creates its own student profile", async () => {
    await assertSucceeds(setDoc(doc(newcomer(), "users", "newbie"), profile()));
  });
  it("DENY: registering as teacher", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ role: "teacher" })));
  });
  it("DENY: registering as admin", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ role: "admin" })));
  });
  it("DENY: someone else's email in the profile", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ email: "victim@test.dev" })));
  });
  it("DENY: creating a profile for another uid", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "someoneElse"), profile()));
  });
  it("DENY: extra fields (mass assignment)", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ isAdmin: true })));
  });
  it("DENY: client-chosen createdAt", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ createdAt: Timestamp.fromDate(new Date("2020-01-01")) })));
  });
  it("DENY: empty or over-long name", async () => {
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ name: "" })));
    await assertFails(setDoc(doc(newcomer(), "users", "newbie"), profile({ name: "x".repeat(81) })));
  });
  it("DENY: a signed-in account without a profile can't read staff data", async () => {
    await assertFails(getDocs(collection(newcomer(), "submissions")));
    await assertFails(getDocs(collection(newcomer(), "progress")));
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("student", () => {
  describe("users", () => {
    it("ALLOW: read own profile", async () => {
      await assertSucceeds(getDoc(doc(db("studentA"), "users", "studentA")));
    });
    it("DENY (IDOR): read another student's profile", async () => {
      await assertFails(getDoc(doc(db("studentA"), "users", "studentB")));
    });
    it("DENY: read teacher or admin profiles", async () => {
      await assertFails(getDoc(doc(db("studentA"), "users", "teacher1")));
      await assertFails(getDoc(doc(db("studentA"), "users", "admin1")));
    });
    it("DENY: list users, with or without the teacher's role filter", async () => {
      await assertFails(getDocs(collection(db("studentA"), "users")));
      await assertFails(getDocs(query(collection(db("studentA"), "users"), where("role", "==", "student"))));
      await assertFails(getCountFromServer(query(collection(db("studentA"), "users"), where("role", "==", "student"))));
    });
    it("ALLOW: change own display name", async () => {
      await assertSucceeds(updateDoc(doc(db("studentA"), "users", "studentA"), { name: "New name" }));
    });
    it("DENY (escalation): student → teacher", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentA"), { role: "teacher" }));
    });
    it("DENY (escalation): student → admin", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentA"), { role: "admin" }));
    });
    it("DENY (escalation): role hidden inside a name update", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentA"), { name: "ok", role: "admin" }));
    });
    it("DENY: change own email", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentA"), { email: "x@evil.dev" }));
    });
    it("DENY (IDOR): rename another student", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentB"), { name: "hacked" }));
    });
    it("DENY (admin op): change another user's role", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "users", "studentB"), { role: "teacher" }));
    });
    it("DENY: delete own or other profiles", async () => {
      await assertFails(deleteDoc(doc(db("studentA"), "users", "studentA")));
      await assertFails(deleteDoc(doc(db("studentA"), "users", "studentB")));
    });
  });

  describe("progress", () => {
    it("ALLOW: read own progress", async () => {
      await assertSucceeds(getDoc(doc(db("studentA"), "progress", "studentA")));
    });
    it("DENY (IDOR): read another student's progress", async () => {
      await assertFails(getDoc(doc(db("studentA"), "progress", "studentB")));
    });
    it("DENY: list all progress", async () => {
      await assertFails(getDocs(collection(db("studentA"), "progress")));
    });
    it("ALLOW: mark a lesson done and undone", async () => {
      const ref = doc(db("studentA"), "progress", "studentA");
      await assertSucceeds(setDoc(ref, { completed: { 7: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true }));
      await assertSucceeds(setDoc(ref, { completed: { 7: deleteField() }, updatedAt: serverTimestamp() }, { merge: true }));
    });
    it("DENY (IDOR): write another student's progress", async () => {
      await assertFails(
        setDoc(doc(db("studentA"), "progress", "studentB"), { completed: { 9: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true })
      );
    });
    it("DENY: extra fields in progress", async () => {
      await assertFails(setDoc(doc(db("studentA"), "progress", "studentA"), { completed: {}, role: "admin" }, { merge: true }));
    });
    it("DENY: more than 60 completed lessons", async () => {
      const completed = Object.fromEntries(Array.from({ length: 61 }, (_, i) => [i + 1, Timestamp.now()]));
      await assertFails(setDoc(doc(db("studentA"), "progress", "studentA"), { completed, updatedAt: serverTimestamp() }));
    });

    // Regression: progress values and keys used to be unchecked — a student could store
    // junk (up to the 1 MB document limit) that every teacher's roster then downloads,
    // backdate completions, or mark lessons that don't exist.
    const mine = () => doc(db("studentA"), "progress", "studentA");
    const mark = (key, value = serverTimestamp(), updatedAt = serverTimestamp()) =>
      setDoc(mine(), { completed: { [key]: value }, updatedAt }, { merge: true });

    it("ALLOW: first progress write creates the document", async () => {
      await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), "progress", "studentA")));
      await assertSucceeds(mark(60));
    });
    it("DENY: a lesson id outside 1..60", async () => {
      await assertFails(mark(61));
      await assertFails(mark(0));
      await assertFails(mark("abc"));
    });
    it("DENY: a completion value that is not the server time", async () => {
      await assertFails(mark(5, "x".repeat(10000)));
      await assertFails(mark(5, true));
      await assertFails(mark(5, Timestamp.fromDate(new Date("2020-01-01")))); // backdated
    });
    it("re-marking a completed lesson: server time ALLOWED (retries), any other time DENIED", async () => {
      // lesson 1 is already completed in the fixture
      await assertSucceeds(mark(1));
      await assertFails(mark(1, Timestamp.fromDate(new Date("2020-01-01"))));
    });
    it("DENY: updatedAt that is not the server time", async () => {
      await assertFails(mark(5, serverTimestamp(), "yesterday"));
      await assertFails(mark(5, serverTimestamp(), Timestamp.fromDate(new Date("2020-01-01"))));
      await assertFails(setDoc(mine(), { completed: { 5: serverTimestamp() } }, { merge: true }));
    });
    it("DENY: replacing the whole map with forged completions", async () => {
      const forged = { 1: Timestamp.now(), 2: Timestamp.now(), 3: Timestamp.now() };
      await assertFails(setDoc(mine(), { completed: forged, updatedAt: serverTimestamp() }));
    });
    it("ALLOW: several lessons marked in one write, all at server time", async () => {
      await assertSucceeds(
        setDoc(mine(), { completed: { 2: serverTimestamp(), 3: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true })
      );
    });
  });

  describe("submissions", () => {
    it("ALLOW: submit homework for a lesson", async () => {
      await assertSucceeds(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4)));
    });
    it("ALLOW: read own submission, and probe one that doesn't exist yet", async () => {
      await assertSucceeds(getDoc(doc(db("studentA"), "submissions", "studentA_3")));
      await assertSucceeds(getDoc(doc(db("studentA"), "submissions", "studentA_9")));
    });
    it("ALLOW: list own submissions (uid filter)", async () => {
      await assertSucceeds(getDocs(query(collection(db("studentA"), "submissions"), where("uid", "==", "studentA"))));
    });
    it("DENY (IDOR): read another student's submission", async () => {
      await assertFails(getDoc(doc(db("studentA"), "submissions", "studentB_3")));
      await assertFails(getDocs(query(collection(db("studentA"), "submissions"), where("uid", "==", "studentB"))));
    });
    it("DENY: list all submissions", async () => {
      await assertFails(getDocs(collection(db("studentA"), "submissions")));
    });
    it("DENY (IDOR): create a submission under another student's id", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentB_4"), submission("studentB", 4)));
    });
    it("DENY: own document id but someone else's uid inside", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { uid: "studentB" })));
    });
    it("DENY: id and lessonId disagree", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 5)));
    });
    it("DENY: lessonId outside 1–60", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_99"), submission("studentA", 99)));
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_0"), submission("studentA", 0)));
    });
    it("DENY: non-https link (javascript:, http:)", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { url: "javascript:alert(1)" })));
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { url: "http://github.com/x" })));
    });
    it("DENY: self-accepted or self-graded submission", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { status: "accepted" })));
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { grade: 5 })));
    });
    it("DENY: client-chosen submittedAt", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { submittedAt: Timestamp.now() })));
    });
    // Regression for audit finding M1: the teacher panel identifies the student by
    // studentName/studentEmail, so they must match the caller.
    it("DENY (impersonation): submission labelled with another student's email", async () => {
      await assertFails(
        setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { studentEmail: U.studentB.email }))
      );
    });
    it("DENY: empty or over-long studentName", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { studentName: "" })));
      await assertFails(
        setDoc(doc(db("studentA"), "submissions", "studentA_4"), submission("studentA", 4, { studentName: "x".repeat(81) }))
      );
    });
    it("ALLOW: resubmit a pending submission", async () => {
      await assertSucceeds(
        setDoc(doc(db("studentA"), "submissions", "studentA_3"), submission("studentA", 3, { url: "https://student-a.vercel.app" }))
      );
    });
    it("DENY: resubmit (overwrite) an accepted submission", async () => {
      await assertFails(setDoc(doc(db("studentA"), "submissions", "studentA_5"), submission("studentA", 5)));
    });
    it("DENY: grade own submission", async () => {
      await assertFails(updateDoc(doc(db("studentA"), "submissions", "studentA_3"), review({ reviewedBy: "studentA" })));
    });
    it("DENY: delete own submission", async () => {
      await assertFails(deleteDoc(doc(db("studentA"), "submissions", "studentA_3")));
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("teacher", () => {
  describe("users", () => {
    it("ALLOW: read a student profile", async () => {
      await assertSucceeds(getDoc(doc(db("teacher"), "users", "studentA")));
    });
    it("ALLOW: read own profile", async () => {
      await assertSucceeds(getDoc(doc(db("teacher"), "users", "teacher1")));
    });
    it("DENY: read an admin profile", async () => {
      await assertFails(getDoc(doc(db("teacher"), "users", "admin1")));
    });
    it("ALLOW: list and count students with the role filter", async () => {
      const snap = await assertSucceeds(getDocs(query(collection(db("teacher"), "users"), where("role", "==", "student"))));
      expect(snap.docs.map((d) => d.id).sort()).toEqual(["studentA", "studentB"]);
      await assertSucceeds(getCountFromServer(query(collection(db("teacher"), "users"), where("role", "==", "student"))));
    });
    it("DENY: list all users or admins (admin data stays hidden)", async () => {
      await assertFails(getDocs(collection(db("teacher"), "users")));
      await assertFails(getDocs(query(collection(db("teacher"), "users"), where("role", "==", "admin"))));
    });
    it("DENY (escalation): teacher → admin (own role)", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "users", "teacher1"), { role: "admin" }));
    });
    it("DENY (admin op): give a student the admin or teacher role", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "users", "studentA"), { role: "admin" }));
      await assertFails(updateDoc(doc(db("teacher"), "users", "studentA"), { role: "teacher" }));
    });
    it("DENY: edit a student's profile", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "users", "studentA"), { name: "edited" }));
    });
    it("DENY: delete a user", async () => {
      await assertFails(deleteDoc(doc(db("teacher"), "users", "studentA")));
    });
  });

  describe("progress", () => {
    it("ALLOW: read any student's progress", async () => {
      await assertSucceeds(getDoc(doc(db("teacher"), "progress", "studentA")));
      await assertSucceeds(getDocs(collection(db("teacher"), "progress")));
    });
    it("DENY: write a student's progress", async () => {
      await assertFails(setDoc(doc(db("teacher"), "progress", "studentA"), { completed: {}, updatedAt: serverTimestamp() }));
    });
    it("DENY: write own progress (progress is for students only)", async () => {
      await assertFails(setDoc(doc(db("teacher"), "progress", "teacher1"), { completed: { 1: serverTimestamp() }, updatedAt: serverTimestamp() }));
    });
  });

  describe("submissions", () => {
    it("ALLOW: list all submissions", async () => {
      await assertSucceeds(getDocs(collection(db("teacher"), "submissions")));
      await assertSucceeds(getDocs(query(collection(db("teacher"), "submissions"), where("status", "==", "pending"))));
    });
    it("ALLOW: grade a submission", async () => {
      await assertSucceeds(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review()));
      await assertSucceeds(updateDoc(doc(db("teacher"), "submissions", "studentB_3"), review({ status: "needs_work", grade: 2 })));
    });
    it("DENY: grade outside 1–5 or non-integer", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ grade: 6 })));
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ grade: 0 })));
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ grade: "5" })));
    });
    it("DENY: unknown review status", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ status: "pending" })));
    });
    it("DENY: sign the review as another teacher", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ reviewedBy: "someoneElse" })));
    });
    it("DENY: client-chosen reviewedAt", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), review({ reviewedAt: Timestamp.now() })));
    });
    it("DENY: change the student's link while grading", async () => {
      await assertFails(updateDoc(doc(db("teacher"), "submissions", "studentA_3"), { ...review(), url: "https://evil.dev" }));
    });
    it("DENY: submit homework as if a student", async () => {
      await assertFails(
        setDoc(doc(db("teacher"), "submissions", "teacher1_4"), { ...submission("studentA", 4), uid: "teacher1" })
      );
    });
    it("DENY: delete a submission", async () => {
      await assertFails(deleteDoc(doc(db("teacher"), "submissions", "studentA_3")));
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("admin", () => {
  it("ALLOW: list and read every user", async () => {
    const snap = await assertSucceeds(getDocs(collection(db("admin"), "users")));
    expect(snap.size).toBe(Object.keys(U).length);
    await assertSucceeds(getDoc(doc(db("admin"), "users", "teacher1")));
  });
  it("ALLOW: promote a student to teacher", async () => {
    await assertSucceeds(updateDoc(doc(db("admin"), "users", "studentA"), { role: "teacher" }));
  });
  it("ALLOW: promote a teacher to admin and demote back", async () => {
    await assertSucceeds(updateDoc(doc(db("admin"), "users", "teacher1"), { role: "admin" }));
    await assertSucceeds(updateDoc(doc(db("admin"), "users", "teacher1"), { role: "teacher" }));
  });
  it("DENY: change own role (no self lock-out)", async () => {
    await assertFails(updateDoc(doc(db("admin"), "users", "admin1"), { role: "student" }));
  });
  it("DENY: invent a role", async () => {
    await assertFails(updateDoc(doc(db("admin"), "users", "studentA"), { role: "superuser" }));
  });
  it("DENY: edit other profile fields (admins manage roles only)", async () => {
    await assertFails(updateDoc(doc(db("admin"), "users", "studentA"), { name: "renamed" }));
    await assertFails(updateDoc(doc(db("admin"), "users", "studentA"), { email: "x@x.dev" }));
    await assertFails(updateDoc(doc(db("admin"), "users", "studentA"), { role: "teacher", name: "renamed" }));
  });
  it("DENY: delete users", async () => {
    await assertFails(deleteDoc(doc(db("admin"), "users", "studentA")));
  });
  it("ALLOW: read progress and submissions (monitoring)", async () => {
    await assertSucceeds(getDocs(collection(db("admin"), "progress")));
    await assertSucceeds(getDocs(collection(db("admin"), "submissions")));
  });
  it("DENY: grade submissions (grading is the teacher's job)", async () => {
    await assertFails(updateDoc(doc(db("admin"), "submissions", "studentA_3"), review({ reviewedBy: "admin1" })));
  });
  it("DENY: write a student's progress or submit homework", async () => {
    await assertFails(setDoc(doc(db("admin"), "progress", "studentA"), { completed: {}, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db("admin"), "submissions", "admin1_4"), { ...submission("studentA", 4), uid: "admin1" }));
  });
  it("role changes take effect on the very next request", async () => {
    await assertFails(getDocs(collection(db("studentA"), "submissions")));
    await assertSucceeds(updateDoc(doc(db("admin"), "users", "studentA"), { role: "teacher" }));
    await assertSucceeds(getDocs(collection(db("studentA"), "submissions")));
    await assertSucceeds(updateDoc(doc(db("admin"), "users", "studentA"), { role: "student" }));
    await assertFails(getDocs(collection(db("studentA"), "submissions")));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Duplicate requests: the same mutation sent twice in parallel must not create
// two records. Ids are derived from the caller, so the second write lands on the
// same document (or is rejected by the rules).
describe("duplicate requests (database level)", () => {
  // withSecurityRulesDisabled doesn't return the callback's value, so collect it here
  const ids = async (path, field, value) => {
    let found;
    await env.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDocs(query(collection(ctx.firestore(), path), where(field, "==", value)));
      found = snap.docs.map((d) => d.id);
    });
    return found;
  };

  it("registration twice in parallel → one profile", async () => {
    const fs = newcomer("dup", "dup@test.dev");
    const data = { name: "Dup", email: "dup@test.dev", photoURL: null, role: "student", createdAt: serverTimestamp() };
    await Promise.allSettled([setDoc(doc(fs, "users", "dup"), data), setDoc(doc(fs, "users", "dup"), data)]);
    expect(await ids("users", "email", "dup@test.dev")).toEqual(["dup"]);
  });

  it("homework submitted twice in parallel → one submission", async () => {
    const fs = db("studentA");
    await Promise.allSettled([
      setDoc(doc(fs, "submissions", "studentA_7"), submission("studentA", 7)),
      setDoc(doc(fs, "submissions", "studentA_7"), submission("studentA", 7)),
    ]);
    const mine = await ids("submissions", "uid", "studentA");
    expect(mine.filter((id) => id === "studentA_7")).toHaveLength(1);
    expect(mine.sort()).toEqual(["studentA_3", "studentA_5", "studentA_7"]);
  });

  it("progress toggled twice in parallel → one progress document", async () => {
    const fs = db("studentA");
    const write = () => setDoc(doc(fs, "progress", "studentA"), { completed: { 8: serverTimestamp() }, updatedAt: serverTimestamp() }, { merge: true });
    await Promise.all([write(), write()]);
    await env.withSecurityRulesDisabled(async (ctx) => {
      const all = await getDocs(collection(ctx.firestore(), "progress"));
      expect(all.docs.filter((d) => d.id === "studentA")).toHaveLength(1);
      expect(Object.keys((await getDoc(doc(ctx.firestore(), "progress", "studentA"))).data().completed).sort()).toEqual(["1", "8"]);
    });
  });

  it("grading twice in parallel → same submission updated, no new document", async () => {
    const fs = db("teacher");
    await Promise.all([
      updateDoc(doc(fs, "submissions", "studentA_3"), review()),
      updateDoc(doc(fs, "submissions", "studentA_3"), review()),
    ]);
    expect((await ids("submissions", "uid", "studentA")).sort()).toEqual(["studentA_3", "studentA_5"]);
  });

  it("role update twice in parallel → one user document with the new role", async () => {
    const fs = db("admin");
    await Promise.all([
      updateDoc(doc(fs, "users", "studentB"), { role: "teacher" }),
      updateDoc(doc(fs, "users", "studentB"), { role: "teacher" }),
    ]);
    expect(await ids("users", "email", "b@test.dev")).toEqual(["studentB"]);
  });
});

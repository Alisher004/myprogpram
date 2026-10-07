#!/usr/bin/env node
// Runs a command inside the Firebase emulators, using the throwaway project id
// "demo-codebilim" so nothing can reach the production project.
//
//   node scripts/emulators.mjs <emulators> -- <command...>
//   node scripts/emulators.mjs firestore -- vitest run --project rules
//
// Java is required by the Firestore emulator. It is looked up on PATH, in
// JAVA_HOME and in common install locations (e.g. a Homebrew keg-only openjdk).
// It is never installed by this script.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { delimiter, join } from "node:path";

const PROJECT_ID = "demo-codebilim";
const sep = process.argv.indexOf("--");
const only = process.argv[2];
const command = sep > 0 ? process.argv.slice(sep + 1) : [];
if (!only || !command.length) {
  console.error("Usage: node scripts/emulators.mjs <firestore,auth> -- <command...>");
  process.exit(2);
}

function works(bin, args = ["-version"]) {
  try {
    execFileSync(bin, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findJavaBin() {
  if (works("java")) return null; // already on PATH
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(join(process.env.JAVA_HOME, "bin"));
  for (const root of ["/opt/homebrew/opt", "/usr/local/opt"]) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) if (/^openjdk/.test(name)) candidates.push(join(root, name, "bin"));
  }
  const jvms = "/Library/Java/JavaVirtualMachines";
  if (existsSync(jvms)) for (const name of readdirSync(jvms)) candidates.push(join(jvms, name, "Contents/Home/bin"));
  return candidates.find((dir) => works(join(dir, "java"))) ?? false;
}

const javaBin = findJavaBin();
if (javaBin === false && only.split(",").includes("firestore")) {
  console.error(
    "\n✖ Java not found. The Firestore emulator needs a Java runtime (JDK 21+).\n" +
      "  Install one (e.g. `brew install openjdk`) or set JAVA_HOME, then re-run.\n" +
      "  Unit tests (`npm test`) do not need Java.\n"
  );
  process.exit(1);
}

const firebaseCli = works("firebase", ["--version"]) ? ["firebase"] : null;
if (!firebaseCli) {
  console.error("\n✖ Firebase CLI not found. Install it with `npm i -g firebase-tools`.\n");
  process.exit(1);
}

const env = { ...process.env };
if (javaBin) env.PATH = javaBin + delimiter + env.PATH;
// Make sure no production credentials leak into the emulated run
env.GCLOUD_PROJECT = PROJECT_ID;

const quoted = command.map((a) => (/[\s"']/.test(a) ? JSON.stringify(a) : a)).join(" ");
const result = spawnSync(
  firebaseCli[0],
  ["emulators:exec", "--project", PROJECT_ID, "--only", only, quoted],
  { stdio: "inherit", env }
);
process.exit(result.status ?? 1);

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scripts = dirname(fileURLToPath(import.meta.url));

function fixture(t, source) {
  const root = mkdtempSync(join(tmpdir(), "siege vite wrapper "));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
  mkdirSync(join(root, "node_modules", "vite", "bin"), { recursive: true });
  mkdirSync(join(root, ".grok"));
  copyFileSync(join(scripts, "with-app-env.mjs"), join(root, "scripts", "with-app-env.mjs"));
  writeFileSync(join(root, "node_modules", "vite", "bin", "vite.js"), source);
  writeFileSync(join(root, ".grok", "app-env.json"), JSON.stringify({
    VITE_FIXTURE_FILE: "from-file", VITE_FIXTURE_OVERRIDE: "file-value",
  }));
  return root;
}

function fixtureEnv(root) {
  const env = { ...process.env };
  // Never discover a globally installed Vite; only the fixture CLI may run.
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "path" || key === "VITE_FIXTURE_FILE") delete env[key];
  }
  return { ...env, PATH: join(root, "node_modules", ".bin") };
}

test("Vite starts through Node with literal args and merged app environment", (t) => {
  const root = fixture(t, "console.log(JSON.stringify({args:process.argv.slice(2),file:process.env.VITE_FIXTURE_FILE,override:process.env.VITE_FIXTURE_OVERRIDE}));");
  const result = spawnSync(process.execPath, [join(root, "scripts", "with-app-env.mjs"), "vite", "dev", "two words", "literal&value", ""], {
    encoding: "utf8", env: { ...fixtureEnv(root), VITE_FIXTURE_OVERRIDE: "process-value" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    args: ["dev", "two words", "literal&value", ""], file: "from-file", override: "process-value",
  });
});

test("Vite failure retains its exit code", (t) => {
  const root = fixture(t, "process.exit(23);");
  const result = spawnSync(process.execPath, [join(root, "scripts", "with-app-env.mjs"), "vite", "build"], { encoding: "utf8", env: fixtureEnv(root) });
  assert.equal(result.status, 23, result.stderr);
});

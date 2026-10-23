import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Use a separate ephemeral origin; never touch the user's preview or saved readings.
test(
  "static preview serves real PNGs, versioned sources and rejects unknown paths",
  { timeout: 10000 },
  async (t) => {
    const child = spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("../", import.meta.url),
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    t.after(() => child.kill());
    const url = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code) =>
        reject(new Error(`Preview exited: ${code}`)),
      );
      child.stdout.on("data", (data) => {
        const match = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) resolve(match[0]);
      });
    });
    for (const asset of [
      "assets/tarot/back.png",
      "assets/tarot/figma-cloth-310.png",
      "assets/tarot/avatars/00.png",
    ]) {
      const response = await fetch(`${url}/${asset}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    }
    const source = await fetch(`${url}/app.js?v=1.0.0`);
    assert.equal(source.status, 200);
    assert.match(source.headers.get("content-type"), /javascript/);
    assert.equal((await fetch(`${url}/missing.png`)).status, 404);
    assert.equal((await fetch(`${url}/package.json`)).status, 404);
    assert.equal((await fetch(`${url}/%2e%2e%2fpackage.json`)).status, 404);
  },
);

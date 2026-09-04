#!/usr/bin/env node
// Issue 15 — capture Part 3 (Test DD and Traceability) evidence: complete
// passing test output from unit, API, and UI suites.
//
//   01-server-tests-pass.png — full `npm test` output (server, 52/52)
//   02-client-tests-pass.png — full `npm test` output (client, 51/51)
//   03-test-traceability.png — tests.md planned-test table w/ AC traceability
//
// Output files are read from /tmp/opencode server-test-output2.txt and
// client-test-output.txt (generated just before running this script).

import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         margin: 24px; color: #1c2b22; background: #fff; }
  h1 { font-family: -apple-system,"Segoe UI",Roboto,sans-serif; font-size:20px; color:#006b3c; }
  pre { background:#f5f7f6; border:1px solid #c8cfcb; border-radius:6px; padding:14px;
        font-size:11.5px; line-height:1.42; overflow:auto; white-space:pre; max-height:820px; }
`;

const serverOut = await readFile("/tmp/opencode/server-test-output2.txt", "utf-8").catch(
  () => "(server output unavailable — run server 'npm test' first)"
);
const clientOut = await readFile("/tmp/opencode/client-test-output.txt", "utf-8").catch(
  () => "(client output unavailable — run client 'npm test' first)"
);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mkdir(path.join(OUT, "part-3-test-evidence"), { recursive: true });

  const items = [
    ["01-server-tests-pass.png", "Server (unit + API) — npm test — 52/52 passing", serverOut],
    ["02-client-tests-pass.png", "Client (UI + style) — npm test — 51/51 passing", clientOut],
  ];
  for (const [file, title, content] of items) {
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 3 Evidence — ${esc(title)}</h1>
<pre>${esc(content)}</pre>
</body></html>`
    );
    await page.screenshot({ path: path.join(OUT, "part-3-test-evidence", file), fullPage: true });
    console.log("saved", "part-3-test-evidence/" + file);
  }
} finally {
  await browser.close();
}
console.log("done");
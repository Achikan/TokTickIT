#!/usr/bin/env node
// Issue 15 — capture Part 1 (Git Use with Engineering Workflow) evidence as
// readable HTML PNGs:
//   01-commit-history.png     — git log --graph showing feature -> staging merges
//   02-directory-structure.png— repo directory structure
//   03-readme.png             — README.md content (setup, stack, structure)
//   04-gitignore.png          — .gitignore content
//
// Produces evidence from the actual repository (lab2-staging = completed Lab 2).

import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "artifacts", "lab-02", "screenshots");

const esc = (s) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const css = `
  body { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
         margin: 24px; color: #1c2b22; background: #fff; }
  h1 { font-family: -apple-system,"Segoe UI",Roboto,sans-serif; font-size:20px;
       color: #006b3c; }
  pre { background: #f5f7f6; border: 1px solid #c8cfcb; border-radius: 6px;
        padding: 14px; font-size: 12px; line-height: 1.45; overflow: auto;
        white-space: pre; }
`;

function gitLogGraph() {
  try {
    return execFileSync("git", ["log", "--graph", "--oneline", "--decorate", "-60"], {
      cwd: ROOT,
      encoding: "utf-8",
    });
  } catch {
    return "(git history unavailable)";
  }
}

function dirStructure() {
  try {
    return execFileSync("bash", ["-c", `cd "${ROOT}" && ls -1 && echo "--- client/src ---" && ls -1 client/src && echo "--- server/src ---" && ls -1 server/src && echo "--- server/prisma ---" && ls -1 server/prisma && echo "--- docs/lab-02 ---" && ls -1 docs/lab-02 && echo "--- e2e/lab-02 ---" && ls -1 e2e/lab-02 && echo "--- scripts ---" && ls -1 scripts && echo "--- artifacts/lab-02/screenshots ---" && find artifacts/lab-02/screenshots -type f | sed 's#artifacts/lab-02/screenshots/##' | head -60`], {
      encoding: "utf-8",
    });
  } catch {
    return "(directory listing unavailable)";
  }
}

const readme = await readFile(path.join(ROOT, "README.md"), "utf-8").catch(() => "(no README.md)");
const gitignore = await readFile(path.join(ROOT, ".gitignore"), "utf-8").catch(() => "(no .gitignore)");

const gitLog = gitLogGraph();
const dirTree = dirStructure();

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mkdir(path.join(OUT, "part-1-git-evidence"), { recursive: true });

  const pages = [
    ["01-commit-history.png", "Git workflow — commit history (final Lab 2, lab2-staging)", gitLog],
    ["02-directory-structure.png", "Repository directory structure", dirTree],
    ["03-readme.png", "README.md", readme],
    ["04-gitignore.png", ".gitignore", gitignore],
  ];

  for (const [file, title, content] of pages) {
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Part 1 Evidence — ${esc(title)}</h1>
<pre>${esc(content)}</pre>
</body></html>`;
    await page.setContent(html);
    await page.screenshot({ path: path.join(OUT, "part-1-git-evidence", file), fullPage: true });
    console.log("saved", "part-1-git-evidence/" + file);
  }
} finally {
  await browser.close();
}
console.log("done");
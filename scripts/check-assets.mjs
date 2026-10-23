import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { deck, topics } from "../core.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const required = [
  ...deck.map((card) => `assets/tarot/${String(card.id).padStart(2, "0")}.png`),
  ...topics.flatMap((topic) => {
    const id = String(topic.card).padStart(2, "0");
    return [`assets/tarot/avatars/${id}.png`, `assets/tarot/subject-${id}.png`];
  }),
  "assets/tarot/back.png",
  "assets/tarot/figma-cloth-310.png",
  "assets/Rochester-Regular.ttf",
];
for (const file of ["index.html", "style.css", "app.js"]) {
  const source = await readFile(path.join(root, file), "utf8");
  for (const match of source.matchAll(
    /(?:src|href)=["']([^"'${}]+)["']|url\(['"]?([^)'"${}]+)['"]?\)/g,
  )) {
    const ref = (match[1] || match[2]).split("?")[0];
    if (/^(?:https?:|data:|#|%23)/.test(ref)) continue;
    required.push(ref);
  }
}
for (const icon of [
  "topic-right",
  "right",
  "back",
  "share",
  "shuffle",
  "send",
  "thumbup",
  "thumbdown",
  "copy",
  "refresh",
  "spark",
  "chevron",
  "status",
  "send-button",
])
  required.push(`assets/icons/${icon}.svg`);
for (const name of ["navigation", "navigation-history"])
  required.push(`assets/v5/${name}.svg`);
for (const name of ["stroke-plain", "filled-plain", "combo-2"])
  required.push(`assets/stars/${name}.svg`);
for (const file of new Set(required)) {
  await access(path.resolve(root, file));
  if (file.endsWith(".png")) {
    const bytes = await readFile(path.resolve(root, file));
    assert.equal(
      bytes.subarray(1, 4).toString(),
      "PNG",
      `Invalid PNG: ${file}`,
    );
  }
}
console.log(`Assets verified: ${new Set(required).size} local files.`);

#!/usr/bin/env node
// Build a deterministic, dependency-free search index from current MDX docs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slugifyHeading } from "./check-docs-links.mjs";

export function stripMarkdown(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\x60([^\x60]+)\x60/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_]/g, "")
    .trim();
}

function summarize(lines, from, to) {
  for (let i = from; i < to; i += 1) {
    let line = lines[i].trim();
    if (!line || /^(export |>|#|[-*]?\s*\||\x60\x60\x60|~~~)/.test(line)) continue;
    if (/^[-*]\s+/.test(line)) line = line.slice(2);
    if (/^\d+\.\s/.test(line)) line = line.replace(/^\d+\.\s/, "");
    const summary = stripMarkdown(line);
    if (summary.length > 15) return summary.slice(0, 176);
  }
  return "";
}

export function generateSearchIndex(docsDir) {
  const pages = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "page.mdx") pages.push(full);
    }
  }
  walk(docsDir);
  pages.sort((a, b) => {
    if (a === path.join(docsDir, "page.mdx")) return -1;
    if (b === path.join(docsDir, "page.mdx")) return 1;
    return a.localeCompare(b);
  });
  return pages.flatMap((file) => {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const directory = path.relative(docsDir, path.dirname(file));
    const route = "/docs" + (directory ? "/" + directory.split(path.sep).join("/") : "");
    const source = fs.readFileSync(file, "utf8");
    const metadata = source.match(/export const metadata\s*=\s*\{[^}]*title:\s*["']([^"']+)["']/);
    const headings = lines.flatMap((line, lineNumber) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      return match ? [{ lineNumber, level: match[1].length, text: match[2] }] : [];
    });
    const pageTitle = metadata?.[1] || stripMarkdown(headings.find((h) => h.level === 1)?.text || "Documentation");
    const firstHeading = headings.find((h) => h.level === 1);
    const results = [{
      href: route,
      title: pageTitle,
      section: "",
      summary: summarize(lines, (firstHeading?.lineNumber ?? -1) + 1, lines.length),
    }];
    for (const heading of headings.filter((h) => h.level > 1)) {
      const next = headings.find((h) => h.lineNumber > heading.lineNumber);
      results.push({
        href: route + "#" + slugifyHeading(heading.text),
        title: pageTitle,
        section: stripMarkdown(heading.text),
        summary: summarize(lines, heading.lineNumber + 1, next?.lineNumber ?? lines.length),
      });
    }
    return results;
  });
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const docsDir = path.resolve(path.dirname(scriptPath), "../src/app/docs");
  const indexFile = path.join(docsDir, "search-index.json");
  const expected = JSON.stringify(generateSearchIndex(docsDir), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, "utf8") !== expected) {
      console.error("Docs search index is stale. Run npm run docs:search:generate.");
      process.exitCode = 1;
    } else {
      console.log("Docs search index matches current MDX routes and headings.");
    }
  } else {
    fs.writeFileSync(indexFile, expected);
    console.log("Generated documentation search index.");
  }
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  moveActiveIndex,
  searchDocs,
  type DocsSearchEntry,
} from "../src/app/docs/search";

const root = path.resolve(__dirname, "../..");
const docsDir = path.join(root, "src/app/docs");
const indexFile = path.join(docsDir, "search-index.json");
const docs = JSON.parse(fs.readFileSync(indexFile, "utf8")) as DocsSearchEntry[];

test("static search index is generated from all current MDX routes and headings", async () => {
  const { generateSearchIndex } = await import("../scripts/generate-docs-search-index.mjs");
  assert.deepEqual(docs, generateSearchIndex(docsDir));
  assert.ok(docs.length >= 20);
  assert.equal(new Set(docs.map((entry) => entry.href)).size, docs.length);
});

test("every search entry resolves to a real documentation page or heading", async () => {
  const { discoverRoutes, validateLink } = await import("../scripts/check-docs-links.mjs");
  const routes = discoverRoutes(path.join(root, "src/app"));
  for (const entry of docs) {
    const checked = validateLink(entry.href, "/docs", routes);
    assert.equal(checked.valid, true, `Broken docs search link: ${entry.href}`);
    assert.ok(entry.title.trim().length > 0);
  }
});

test("search covers Getting started, Stellar, API, and MCP", () => {
  for (const [query, expected] of [
    ["getting started", "/docs/getting-started"],
    ["stellar", "/docs/stellar"],
    ["developer api", "/docs/api"],
    ["mcp", "/docs/mcp"],
  ]) {
    assert.ok(searchDocs(docs, query).some((entry) => entry.href === expected), query);
  }
});

test("search matches heading text and summaries, not only navigation titles", () => {
  assert.ok(searchDocs(docs, "proposed shape").some((entry) => entry.href === "/docs/api#proposed-shape"));
  assert.ok(searchDocs(docs, "low-cost").some((entry) => entry.href.startsWith("/docs/stellar")));
  assert.ok(searchDocs(docs, "permission first").some((entry) => entry.href === "/docs/mcp#permission-first"));
});

test("search is case-insensitive, token-aware, capped and has an empty state", () => {
  assert.equal(searchDocs(docs, "").length, 0);
  assert.equal(searchDocs(docs, "     ").length, 0);
  assert.deepEqual(searchDocs(docs, "unfindable-nonsense-zzzz"), []);
  assert.ok(searchDocs(docs, "  StElLaR ").some((entry) => entry.href === "/docs/stellar"));
  assert.ok(searchDocs(docs, "payment", 3).length <= 3);
  assert.deepEqual(searchDocs(docs, "stellar", 0), []);
});

test("arrow-key selection can start, wrap and safely handle no results", () => {
  assert.equal(moveActiveIndex(-1, "next", 3), 0);
  assert.equal(moveActiveIndex(-1, "previous", 3), 2);
  assert.equal(moveActiveIndex(2, "next", 3), 0);
  assert.equal(moveActiveIndex(0, "previous", 3), 2);
  assert.equal(moveActiveIndex(1, "next", 3), 2);
  assert.equal(moveActiveIndex(-1, "next", 0), -1);
});

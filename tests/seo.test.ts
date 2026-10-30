import assert from "node:assert/strict";
import { test } from "node:test";
import { createRobots, createSitemap } from "../src/lib/seo/routes";
import { docsMetadata, landingMetadata, rootMetadata, workspaceMetadata } from "../src/lib/seo/metadata";
import { indexable, LOCAL_ORIGIN, parseSiteOrigin, PUBLIC_ROUTES, siteOrigin } from "../src/lib/seo/site";

const ORIGIN = "https://example.org"; // Synthetic test domain; not a deployed Feyo address.

test("public site URL must be a safe origin without path or credentials", () => {
  for (const value of [undefined, "", "http://example.org", "https://example.org/docs", "https://example.org/?q=x", "https://user:pass@example.org", "javascript:alert(1)", " https://example.org"]) {
    assert.equal(parseSiteOrigin(value), null, String(value));
  }
  assert.equal(parseSiteOrigin(ORIGIN + "/"), ORIGIN);
  assert.equal(parseSiteOrigin(LOCAL_ORIGIN), LOCAL_ORIGIN);
  assert.equal(siteOrigin("bad"), LOCAL_ORIGIN);
});

test("no indexing without a configured public HTTPS origin, including preview deploys", () => {
  assert.equal(indexable(undefined, "production"), false);
  assert.equal(indexable(LOCAL_ORIGIN, "development"), false);
  assert.equal(indexable(ORIGIN, "preview"), false);
  assert.equal(indexable(ORIGIN, "production"), true);
});

test("sitemap contains the landing and docs pages but not the workspace", () => {
  const entries = createSitemap(ORIGIN);
  assert.deepEqual(entries.map((item) => new URL(item.url).pathname), [...PUBLIC_ROUTES]);
  assert.ok(entries.every((item) => item.url.startsWith(ORIGIN + "/")));
  assert.equal(entries.some((item) => new URL(item.url).pathname.startsWith("/app")), false);
});

test("robots disallows the workspace and unconfigured/preview sites", () => {
  const live = createRobots(ORIGIN, "production");
  assert.deepEqual(live.rules, [{ userAgent: "*", allow: "/", disallow: ["/app", "/app/"] }]);
  assert.equal(live.sitemap, ORIGIN + "/sitemap.xml");
  const missing = createRobots(undefined, "production");
  assert.deepEqual(missing.rules, [{ userAgent: "*", disallow: "/" }]);
  assert.equal(missing.sitemap, undefined);
  assert.deepEqual(createRobots(ORIGIN, "preview").rules, missing.rules);
});

test("each main route has accurate, distinct metadata; /app is noindex", () => {
  assert.notEqual(landingMetadata.description, docsMetadata.description);
  assert.notEqual(docsMetadata.description, workspaceMetadata.description);
  assert.equal(landingMetadata.alternates?.canonical, "/");
  assert.equal(workspaceMetadata.alternates?.canonical, "/app");
  assert.deepEqual(workspaceMetadata.robots, { index: false, follow: false });
  assert.equal(rootMetadata.twitter?.card, "summary_large_image");
  assert.match(String(workspaceMetadata.description), /cannot sign, send, or settle/);
});

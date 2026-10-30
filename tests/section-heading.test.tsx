import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionHeading } from "../src/components/SectionHeading";

test("SectionHeading shows meaningful heading and optional supporting copy", () => {
  const html = renderToStaticMarkup(<SectionHeading eyebrow="Features" title="Local drafts" copy="Nothing has been sent." />);
  assert.match(html, /<h2>Local drafts<\/h2>/);
  assert.match(html, /section-heading-left/);
  assert.match(html, /Nothing has been sent/);
});

test("SectionHeading uses center alignment and safely escapes user-visible text", () => {
  const html = renderToStaticMarkup(<SectionHeading eyebrow="Status" title="<test>" align="center" />);
  assert.match(html, /section-heading-center/);
  assert.match(html, /&lt;test&gt;/);
  assert.doesNotMatch(html, /<test>/);
  assert.doesNotMatch(html, /section-heading-copy/);
});

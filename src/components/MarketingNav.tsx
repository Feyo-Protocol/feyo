"use client";

import Link from "next/link";
import { BrandMark } from "./BrandMark";

const links = [
  { href: "#product", label: "Product" },
  { href: "#developers", label: "Developers" },
  { href: "/docs", label: "Docs" },
];

export function MarketingNav() {
  return (
    <header className="marketing-nav-wrap">
      <nav className="marketing-nav" aria-label="Primary navigation">
        <BrandMark light />
        <div className="marketing-nav-links">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </div>
        <div className="marketing-nav-actions">
          <a href="https://github.com/Feyo-Protocol/feyo" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
          <Link className="button button-small button-outline-light" href="/app">Open app <span aria-hidden="true">↗</span></Link>
        </div>
        <details className="mobile-menu" onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}>
          <summary aria-label="Open navigation menu"><span aria-hidden="true">☰</span><span className="sr-only">Open navigation menu</span></summary>
          <div className="mobile-menu-panel">
            {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
            <a href="https://github.com/Feyo-Protocol/feyo" target="_blank" rel="noreferrer">GitHub ↗</a>
            <Link className="button button-small button-accent" href="/app">Open app ↗</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}

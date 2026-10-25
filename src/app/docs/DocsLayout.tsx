"use client";

import Link from "next/link";
import DocsSearch from "./DocsSearch";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigation = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/getting-started", label: "Getting started" },
  { href: "/docs/architecture", label: "Architecture" },
  { href: "/docs/stellar", label: "Stellar" },
  { href: "/docs/payments", label: "Payment intents" },
  { href: "/docs/api", label: "Developer API" },
  { href: "/docs/mcp", label: "MCP server" },
  { href: "/docs/contributing", label: "Contributing" },
  { href: "/docs/roadmap", label: "Roadmap" },
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href;
  const links = navigation.map((item) => (
    <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2 text-sm transition-colors ${isActive(item.href) ? "bg-[var(--accent-soft)] font-bold text-[var(--accent)]" : "text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"}`} aria-current={isActive(item.href) ? "page" : undefined}>
      {item.label}
    </Link>
  ));

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[var(--background)]/90 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 sm:flex-nowrap">
          <Link href="/" className="text-xl font-bold tracking-tight">feyo<span className="text-[var(--accent)]">.</span></Link>
          <div className="flex w-full min-w-0 items-center gap-3 text-sm font-semibold text-[var(--muted)] sm:ml-auto sm:w-auto">
            <DocsSearch />
            <a href="https://github.com/Feyo-Protocol/feyo" target="_blank" rel="noreferrer" className="hidden hover:text-[var(--foreground)] sm:block">GitHub ↗</a>
            <button type="button" className="shrink-0 rounded-lg border border-[var(--line)] px-3 py-2 sm:hidden" aria-expanded={open} aria-controls="mobile-docs-nav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
          </div>
        </div>
        {open && <nav id="mobile-docs-nav" className="mx-auto mt-4 max-w-7xl border-t border-[var(--line)] pt-3 sm:hidden" aria-label="Documentation navigation">{links}</nav>}
      </header>
      <div className="mx-auto flex max-w-7xl gap-12 px-5 py-10 sm:px-8 lg:py-14">
        <aside className="hidden w-52 shrink-0 lg:block"><nav className="sticky top-8" aria-label="Documentation navigation"><p className="mb-3 px-3 text-xs font-bold uppercase tracking-[.16em] text-[var(--muted)]">Explore</p>{links}<a href="https://github.com/Feyo-Protocol/feyo/edit/main/src/app/docs" target="_blank" rel="noreferrer" className="mt-8 block px-3 text-sm font-semibold text-[var(--accent)]">Suggest an edit ↗</a></nav></aside>
        <main className="min-w-0 flex-1"><article className="docs-prose">{children}</article></main>
      </div>
    </div>
  );
}

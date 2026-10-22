"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import index from "./search-index.json";
import { moveActiveIndex, searchDocs, type DocsSearchEntry } from "./search";

const documents: DocsSearchEntry[] = index;

export default function DocsSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const results = useMemo(() => searchDocs(documents, query), [query]);
  const expanded = open && query.trim().length > 0;

  useEffect(() => {
    function dismissWhenOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", dismissWhenOutside);
    return () => document.removeEventListener("pointerdown", dismissWhenOutside);
  }, []);

  function clear() {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    router.push(href);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }
    if (!expanded || results.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        moveActiveIndex(current, event.key === "ArrowDown" ? "next" : "previous", results.length),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigate(results[activeIndex < 0 ? 0 : activeIndex].href);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 flex-1 sm:w-72 sm:flex-none"
      role="search"
      aria-label="Documentation search"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          setOpen(false);
          setActiveIndex(-1);
          inputRef.current?.focus();
        }
      }}
    >
      <label htmlFor={resultsId + "-input"} className="sr-only">
        Search documentation
      </label>
      <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 text-sm text-[var(--foreground)]">
        <span aria-hidden="true" className="px-1 text-[var(--muted)]">
          ⌕
        </span>
        <input
          ref={inputRef}
          id={resultsId + "-input"}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={resultsId}
          aria-activedescendant={expanded && activeIndex >= 0 ? resultsId + "-" + activeIndex : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search docs…"
          autoComplete="off"
          className="w-full min-w-0 bg-transparent py-2.5 outline-none placeholder:text-[var(--muted)] focus-visible:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear documentation search"
            onClick={clear}
            className="shrink-0 rounded px-1.5 py-1 font-semibold text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
          >
            Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-xl sm:right-auto sm:w-[min(26rem,90vw)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
            <p aria-live="polite" aria-atomic="true">
              {results.length === 0
                ? "No matching documentation"
                : `${results.length} search ${results.length === 1 ? "result" : "results"}`}
            </p>
            <button
              type="button"
              className="rounded px-2 py-1 font-semibold hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
              onClick={() => {
                setOpen(false);
                setActiveIndex(-1);
                inputRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>

          {results.length > 0 ? (
            <ul id={resultsId} role="listbox" aria-label="Documentation search results" className="max-h-80 overflow-y-auto p-1">
              {results.map((result, index) => (
                <li role="presentation" key={result.href}>
                  <Link
                    id={resultsId + "-" + index}
                    href={result.href}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      setActiveIndex(-1);
                    }}
                    className={`block rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--accent-soft)] focus-visible:bg-[var(--accent-soft)] ${index === activeIndex ? "bg-[var(--accent-soft)]" : ""}`}
                  >
                    <span className="block text-sm font-semibold text-[var(--foreground)]">
                      {result.title}
                      {result.section ? ` · ${result.section}` : ""}
                    </span>
                    {result.summary && (
                      <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                        {result.summary}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-[var(--muted)]">
              No results. Try a page name such as Stellar, API, or MCP.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

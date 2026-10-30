import type { Metadata } from "next";
import { indexable, siteOrigin } from "./site";

const image = { url: "/opengraph-image", width: 1200, height: 630, alt: "Feyo — Stellar Testnet payment workspace" };
export const rootMetadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: "Feyo — Stellar Testnet payment infrastructure", template: "%s | Feyo" },
  description: "Open-source, non-custodial Stellar Testnet workspace for public balance reads and local payment drafts. Live payments are not available.",
  applicationName: "Feyo",
  openGraph: {
    type: "website", siteName: "Feyo", title: "Feyo — Stellar Testnet payment infrastructure",
    description: "A read-only Testnet workspace, locally validated payment drafts, and developer documentation.",
    images: [image],
  },
  twitter: {
    card: "summary_large_image", title: "Feyo — Stellar Testnet payment infrastructure",
    description: "Read-only public balances, local drafts, and developer docs.",
    images: [image.url],
  },
  robots: indexable() ? { index: true, follow: true } : { index: false, follow: false },
};
export const landingMetadata: Metadata = {
  title: "Open-source Stellar Testnet payment workspace",
  description: "Explore Feyo's read-only Stellar Testnet balance viewer, local payment drafts, and developer documentation. No funds can be sent.",
  alternates: { canonical: "/" },
  openGraph: { title: "Feyo — open-source Stellar Testnet workspace", description: "Public Testnet balances and local payment-intent validation; no live transfers.", url: "/" },
  twitter: { card: "summary_large_image", title: "Feyo — open-source Testnet workspace", description: "Read public balances and prepare local drafts." },
};
export const docsMetadata: Metadata = {
  title: "Developer documentation",
  description: "Feyo architecture, Stellar Testnet integration, payment-intent validation, and clearly identified planned developer and agent integrations.",
  openGraph: { title: "Feyo developer documentation", description: "Explore the current Testnet foundation, architecture, and planned integrations.", url: "/docs" },
  twitter: { card: "summary_large_image", title: "Feyo developer documentation", description: "Testnet integration and payment-intent documentation." },
};
export const workspaceMetadata: Metadata = {
  title: "Read-only Testnet workspace",
  description: "Inspect public Stellar Testnet balances and validate local payment drafts. This workspace cannot sign, send, or settle payments.",
  alternates: { canonical: "/app" },
  robots: { index: false, follow: false },
  openGraph: { title: "Feyo — read-only Testnet workspace", description: "Testnet public balances and local draft validation. No funds are sent.", url: "/app" },
  twitter: { card: "summary_large_image", title: "Feyo — read-only Testnet workspace", description: "Public balance reads and local drafts only." },
};

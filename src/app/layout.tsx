import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./app/workspace.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Feyo — Stellar payment infrastructure",
    template: "%s · Feyo",
  },
  description:
    "Open-source Stellar payment infrastructure for web apps, developer APIs, and AI agents.",
  openGraph: {
    title: "Feyo — Stellar payment infrastructure",
    description:
      "An open-source, Stellar-powered foundation for stablecoin payments and programmable financial infrastructure.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

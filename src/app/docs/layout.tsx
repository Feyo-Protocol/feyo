import type { ReactNode } from "react";
import DocsLayout from "./DocsLayout";
import { docsMetadata } from "@/lib/seo/metadata";

export const metadata = docsMetadata;

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>;
}

import { LandingPage } from "@/components/LandingPage";
import { landingMetadata } from "@/lib/seo/metadata";

export const metadata = landingMetadata;

export default function Home() {
  return <LandingPage />;
}

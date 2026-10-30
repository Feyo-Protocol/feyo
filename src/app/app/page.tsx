import Workspace from "./Workspace";
import { workspaceMetadata } from "@/lib/seo/metadata";

export const metadata = workspaceMetadata;

export default function AppPage() {
  return <Workspace />;
}

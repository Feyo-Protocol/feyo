import Workspace from "./Workspace";

export const metadata = {
  title: "Testnet workspace",
  description: "A read-only Stellar Testnet balance view and local payment intent workspace.",
};

export default function AppPage() {
  return <Workspace />;
}

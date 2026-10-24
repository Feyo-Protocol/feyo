import Link from "next/link";
import { WalletConnection } from "@/components/wallet/WalletConnection";

export default function AppPage() {
  return (
    <main className="app-placeholder-page">
      <div className="app-placeholder-card" style={{ maxWidth: "640px" }}>
        <span className="app-placeholder-mark">f</span>
        <p className="eyebrow">Feyo workspace</p>
        <h1>Stellar Testnet workspace</h1>
        <p>
          Connect Freighter to verify your Stellar Testnet account. No transactions are initiated,
          no payments are processed, and private keys are never requested or stored.
        </p>

        <div style={{ width: "100%", margin: "20px 0" }}>
          <WalletConnection />
        </div>

        <div>
          <Link className="button button-dark" href="/docs/stellar">
            Freighter setup guide ↗
          </Link>
          <Link className="text-link" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}

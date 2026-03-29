import Link from "next/link";
import { AppHeader } from "@/app/components/header";

export default function GuestPage() {
  return (
    <main className="dashboard">
      <AppHeader isGuest />

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Willkommen, Gast</h2>
          <p>
            Du siehst die Zentrale im Lesemodus. Um alle Funktionen zu nutzen,
            benötigst du ein Konto mit Einladungscode.
          </p>
        </div>

        <div className="dashboard-tiles">
          <Link href="/hochbeete" className="dashboard-tile" data-accent="hochbeete">
            <div className="dashboard-tile-icon">🌱</div>
            <h3>Hochbeete</h3>
            <p>Hochbeete ansehen.</p>
          </Link>
        </div>

        <div className="guest-notice">
          <p>
            <Link href="/login">Anmelden</Link> oder{" "}
            <Link href="/register">Registrieren</Link> für vollen Zugriff.
          </p>
        </div>
      </div>
    </main>
  );
}

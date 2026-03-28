import Link from "next/link";

export default function GuestPage() {
  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-logo">ZENTRALE</h1>
        </div>
        <div className="dashboard-header-right">
          <span className="role-badge role-guest">Gast</span>
          <Link href="/" className="btn btn-ghost btn-sm">
            Verlassen
          </Link>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Willkommen, Gast</h2>
          <p>
            Du siehst die Zentrale im Lesemodus. Um alle Funktionen zu nutzen,
            benötigst du ein Konto mit Einladungscode.
          </p>
        </div>

        <div className="module-grid">
          <div className="module-card module-card-placeholder">
            <div className="module-icon">🌱</div>
            <h3>Beete</h3>
            <p>Gartenbeete verwalten und überwachen.</p>
            <span className="module-status">Demnächst</span>
          </div>
          <div className="module-card module-card-placeholder">
            <div className="module-icon">📊</div>
            <h3>Dashboard</h3>
            <p>Übersicht über alle Systeme.</p>
            <span className="module-status">Demnächst</span>
          </div>
          <div className="module-card module-card-placeholder">
            <div className="module-icon">⚙️</div>
            <h3>Systeme</h3>
            <p>Technische Systeme steuern.</p>
            <span className="module-status">Demnächst</span>
          </div>
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

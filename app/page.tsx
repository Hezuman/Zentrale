import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-badge">Kontrollzentrum</div>
        <h1 className="landing-title">ZENTRALE</h1>
        <p className="landing-description">
          Das zentrale System zur Verwaltung und Steuerung aller Bereiche auf
          dem Grundstück. Beete, Systeme, Aufgaben – alles an einem Ort.
        </p>

        <div className="landing-actions">
          <Link href="/login" className="btn btn-primary">
            Anmelden
          </Link>
          <Link href="/register" className="btn btn-secondary">
            Registrieren
          </Link>
          <Link href="/guest" className="btn btn-ghost">
            Als Gast fortfahren
          </Link>
        </div>
      </div>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} ZENTRALE</p>
      </footer>
    </main>
  );
}

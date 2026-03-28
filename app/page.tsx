export default function Home() {
  return (
    <main className="container">
      <div className="hero">
        <span className="badge">Early Beta</span>
        <h1 className="title">Zentrale</h1>
        <p className="description">
          Dein zentraler Hub für Projekte, Tools und Workflows &ndash; alles an
          einem Ort. Wir bauen gerade die Grundlage für etwas Großes.
        </p>
      </div>

      <section className="features">
        <h2 className="features-heading">Geplante Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Dashboard</h3>
            <p>Übersicht über alle Projekte und Aktivitäten auf einen Blick.</p>
          </div>
          <div className="feature-card">
            <h3>Integrationen</h3>
            <p>Anbindung an bestehende Tools und Services.</p>
          </div>
          <div className="feature-card">
            <h3>Automatisierung</h3>
            <p>Wiederkehrende Aufgaben automatisch erledigen lassen.</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Zentrale &middot; Early Beta</p>
      </footer>
    </main>
  );
}

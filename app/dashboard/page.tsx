import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/");
  }

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    family: "Familie",
    friends: "Freunde",
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1 className="dashboard-logo">ZENTRALE</h1>
        </div>
        <div className="dashboard-header-right">
          <span className="dashboard-user">{profile.username}</span>
          <span className={`role-badge role-${profile.role}`}>
            {roleLabels[profile.role] || profile.role}
          </span>
          <LogoutButton />
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Willkommen, {profile.username}</h2>
          <p>
            Du bist als <strong>{roleLabels[profile.role]}</strong> angemeldet.
            Die Zentrale wird Schritt für Schritt um neue Module erweitert.
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
      </div>
    </main>
  );
}

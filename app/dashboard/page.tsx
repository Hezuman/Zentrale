import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/header";
import { ROLE_LABELS, canAccessSpiele, canAccessSettings, canAccessAdmin } from "@/lib/roles";

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

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>Willkommen, {profile.username}</h2>
          <p>
            Du bist als <strong>{ROLE_LABELS[profile.role] || profile.role}</strong> angemeldet.
          </p>
        </div>

        <div className="dashboard-tiles">
          <Link href="/hochbeete" className="dashboard-tile" data-accent="hochbeete">
            <div className="dashboard-tile-icon">🌱</div>
            <h3>Hochbeete</h3>
            <p>Hochbeete verwalten und überwachen.</p>
          </Link>

          {canAccessSpiele(profile.role) && (
            <Link href="/spiele" className="dashboard-tile" data-accent="spiele">
              <div className="dashboard-tile-icon">🎮</div>
              <h3>Spiele</h3>
              <p>Spiele und Unterhaltung.</p>
            </Link>
          )}

          {canAccessSettings(profile.role) && (
            <Link href="/settings" className="dashboard-tile" data-accent="settings">
              <div className="dashboard-tile-icon">⚙️</div>
              <h3>Einstellungen</h3>
              <p>Konto und Einstellungen.</p>
            </Link>
          )}

          {canAccessAdmin(profile.role) && (
            <Link href="/admin" className="dashboard-tile" data-accent="admin">
              <div className="dashboard-tile-icon">🛡️</div>
              <h3>Admin</h3>
              <p>Verwaltungsbereich.</p>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

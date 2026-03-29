import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/header";
import { DashboardTile } from "@/app/components/dashboard-tile";
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
          <DashboardTile href="/hochbeete" accent="hochbeete" icon="🌱" title="Hochbeete" description="Hochbeete verwalten und überwachen." />

          {canAccessSpiele(profile.role) && (
            <DashboardTile href="/spiele" accent="spiele" icon="🎮" title="Spiele" description="Spiele und Unterhaltung." />
          )}

          {canAccessSettings(profile.role) && (
            <DashboardTile href="/settings" accent="settings" icon="⚙️" title="Einstellungen" description="Konto und Einstellungen." />
          )}

          {canAccessAdmin(profile.role) && (
            <DashboardTile href="/admin" accent="admin" icon="🛡️" title="Admin" description="Verwaltungsbereich." />
          )}
        </div>
      </div>
    </main>
  );
}

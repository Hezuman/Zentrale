import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }]} />

        <div className="dashboard-welcome">
          <h2>Admin</h2>
          <p>Verwaltungsbereich der Zentrale.</p>
        </div>

        <div className="dashboard-tiles">
          <Link
            href="/admin/invite-codes"
            className="dashboard-tile"
            data-accent="admin"
          >
            <div className="dashboard-tile-icon">🔑</div>
            <h3>Invite-Codes ansehen</h3>
            <p>Verfügbare Einladungscodes anzeigen und kopieren.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}

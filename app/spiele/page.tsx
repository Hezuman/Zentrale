import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { canAccessSpiele } from "@/lib/roles";

export default async function SpielePage() {
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

  if (!profile || !canAccessSpiele(profile.role)) redirect("/dashboard");

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb items={[{ label: "Spiele", href: "/spiele" }]} />

        <div className="dashboard-welcome">
          <h2>Spiele</h2>
          <p>Spiele und Unterhaltung werden hier verfügbar sein.</p>
        </div>

        <div className="placeholder-card">
          <div className="placeholder-icon">🎮</div>
          <h3>Demnächst verfügbar</h3>
          <p>Dieser Bereich wird noch entwickelt.</p>
        </div>
      </div>
    </main>
  );
}

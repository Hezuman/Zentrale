import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getRaisedBeds } from "@/app/actions/hochbeete";
import { CreateHochbeetForm } from "./create-hochbeet-form";

export default async function HochbeetePage() {
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

  const isAdmin = profile.role === "admin";
  const { data: beds } = await getRaisedBeds();

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    family: "Familie",
    friends: "Freunde",
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <Link href="/dashboard" className="dashboard-logo">
            ZENTRALE
          </Link>
        </div>
        <div className="dashboard-header-right">
          <span className="dashboard-user">{profile.username}</span>
          <span className={`role-badge role-${profile.role}`}>
            {roleLabels[profile.role] || profile.role}
          </span>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="hochbeete-header">
          <div>
            <Link href="/dashboard" className="auth-back">
              ← Zurück zur Übersicht
            </Link>
            <h2 className="hochbeete-title">Hochbeete</h2>
            <p className="hochbeete-subtitle">
              Übersicht aller aktiven Hochbeete.
            </p>
          </div>
          {isAdmin && <CreateHochbeetForm />}
        </div>

        {!beds || beds.length === 0 ? (
          <div className="hochbeete-empty">
            <div className="hochbeete-empty-icon">🌱</div>
            <h3>Noch keine Hochbeete</h3>
            <p>
              {isAdmin
                ? 'Erstelle dein erstes Hochbeet mit dem Button "Hochbeet erstellen".'
                : "Es wurden noch keine Hochbeete angelegt."}
            </p>
          </div>
        ) : (
          <div className="hochbeete-grid">
            {beds.map((bed: any) => (
              <Link
                key={bed.id}
                href={`/hochbeete/${bed.id}`}
                className="hochbeet-card-link"
              >
                <div className="hochbeet-card-header">
                  <h3>{bed.name}</h3>
                </div>
                <div className="hochbeet-card-dimensions">
                  {bed.width_cm} × {bed.height_cm} cm
                </div>
                {bed.description && (
                  <p className="hochbeet-card-description">{bed.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getRaisedBeds } from "@/app/actions/hochbeete";
import { CreateHochbeetForm } from "./create-hochbeet-form";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";

export default async function HochbeetePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string; role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isGuest = !user;
  const isAdmin = profile?.role === "admin";
  const { data: beds } = await getRaisedBeds();

  return (
    <main className="dashboard">
      <AppHeader
        username={profile?.username}
        role={profile?.role}
        isGuest={isGuest}
      />

      <div className="dashboard-content">
        <Breadcrumb
          items={[{ label: "Hochbeete", href: "/hochbeete" }]}
          isGuest={isGuest}
        />

        <div className="hochbeete-header">
          <div>
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

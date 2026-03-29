import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getRaisedBed, getZonesForBed } from "@/app/actions/zones";
import { BedEditor } from "./bed-editor";

export default async function HochbeetDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: bed } = await getRaisedBed(params.id);

  if (!bed) {
    notFound();
  }

  const { data: zones } = await getZonesForBed(params.id);

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    family: "Familie",
    friends: "Freunde",
  };

  const isAdmin = profile.role === "admin";
  const canEdit = ["admin", "family", "friends"].includes(profile.role);

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
        <div>
          <Link href="/hochbeete" className="auth-back">
            ← Zurück zu Hochbeete
          </Link>
          <h2 className="hochbeete-title">{bed.name}</h2>
          <p className="hochbeete-subtitle">
            {bed.width_cm} × {bed.height_cm} cm
            {bed.description ? ` · ${bed.description}` : ""}
          </p>
        </div>

        <BedEditor
          bed={bed}
          initialZones={zones || []}
          isAdmin={isAdmin}
          canEdit={canEdit}
        />
      </div>
    </main>
  );
}

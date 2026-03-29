import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getRaisedBed, getZonesForBed } from "@/app/actions/zones";
import { BedEditor } from "./bed-editor";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";

export default async function HochbeetDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: bed } = await getRaisedBed(params.id);

  if (!bed) {
    notFound();
  }

  const { data: zones } = await getZonesForBed(params.id);

  const isAdmin = profile?.role === "admin";
  const canEdit = !isGuest && ["admin", "family", "close_friends", "friends"].includes(profile?.role || "");

  return (
    <main className="dashboard">
      <AppHeader
        username={profile?.username}
        role={profile?.role}
        isGuest={isGuest}
      />

      <div className="dashboard-content">
        <Breadcrumb
          items={[
            { label: "Hochbeete", href: "/hochbeete" },
            { label: bed.name, href: `/hochbeete/${bed.id}` },
          ]}
          isGuest={isGuest}
        />

        <div>
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

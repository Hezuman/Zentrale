import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { canAccessSpiele } from "@/lib/roles";
import { getGameSession } from "@/app/actions/gaming";
import { SessionView } from "./session-view";

export default async function SessionPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: session } = await getGameSession(params.id);

  if (!session) notFound();

  const gameTypeName = session.game_type?.name || "Spiel";

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb
          items={[
            { label: "Spiele", href: "/spiele" },
            {
              label: session.name || gameTypeName,
              href: `/spiele/${session.id}`,
            },
          ]}
        />

        <SessionView
          session={session}
          currentUserId={user.id}
          currentUserRole={profile.role}
        />
      </div>
    </main>
  );
}

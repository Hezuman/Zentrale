import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { canCreateGameSession } from "@/lib/roles";
import { getGameTypes } from "@/app/actions/gaming";
import { CreateGameForm } from "./create-game-form";

export default async function CreateGamePage() {
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

  if (!profile || !canCreateGameSession(profile.role)) redirect("/dashboard");

  const { data: gameTypes } = await getGameTypes();

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb
          items={[
            { label: "Spiele", href: "/spiele" },
            { label: "Neues Spiel", href: "/spiele/erstellen" },
          ]}
        />

        <div className="dashboard-welcome">
          <h2>Neues Spiel erstellen</h2>
          <p>Wähle einen Spieltyp und konfiguriere die Session.</p>
        </div>

        <CreateGameForm gameTypes={gameTypes || []} />
      </div>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { canAccessSpiele } from "@/lib/roles";
import { getGameSessions, getGameTypes, getMentosBalance, getUserGamingStats } from "@/app/actions/gaming";
import { SessionCard } from "@/app/spiele/components/session-card";
import { StatsBar } from "@/app/spiele/components/stats-bar";

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

  const [
    { data: gameTypes },
    { data: activeSessions },
    { data: recentSessions },
    mentosBalance,
    stats,
  ] = await Promise.all([
    getGameTypes(),
    getGameSessions({ status: "lobby" }),
    getGameSessions({ status: "running" }),
    getMentosBalance(user.id),
    getUserGamingStats(user.id),
  ]);

  const lobbySessions = activeSessions || [];
  const runningSessions = recentSessions || [];

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb items={[{ label: "Spiele", href: "/spiele" }]} />

        <div className="spiele-header">
          <div>
            <h2>Spiele</h2>
            <p>Erstelle oder tritt Spielsessions bei.</p>
          </div>
          <Link href="/spiele/erstellen" className="btn btn-primary">
            + Neues Spiel
          </Link>
        </div>

        <StatsBar
          mentosBalance={mentosBalance}
          totalSessions={stats.total_sessions}
          totalWins={stats.total_wins}
          totalScore={stats.total_score}
        />

        {/* Game type tiles */}
        {gameTypes && gameTypes.length > 0 && (
          <div className="spiele-section">
            <h3 className="spiele-section-title">Spieltypen</h3>
            <div className="spiele-type-grid">
              {gameTypes.map((gt: any) => (
                <Link
                  key={gt.id}
                  href={`/spiele/erstellen?type=${gt.slug}`}
                  className="spiele-type-card"
                >
                  <span className="spiele-type-icon">{gt.icon || "🎮"}</span>
                  <span className="spiele-type-name">{gt.name}</span>
                  <span className="spiele-type-desc">{gt.description}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Lobby sessions */}
        <div className="spiele-section">
          <h3 className="spiele-section-title">
            Lobby ({lobbySessions.length})
          </h3>
          {lobbySessions.length > 0 ? (
            <div className="spiele-session-grid">
              {lobbySessions.map((s: any) => (
                <SessionCard key={s.id} session={s} currentUserId={user.id} />
              ))}
            </div>
          ) : (
            <p className="spiele-empty">Keine offenen Lobbys.</p>
          )}
        </div>

        {/* Running sessions */}
        <div className="spiele-section">
          <h3 className="spiele-section-title">
            Laufende Spiele ({runningSessions.length})
          </h3>
          {runningSessions.length > 0 ? (
            <div className="spiele-session-grid">
              {runningSessions.map((s: any) => (
                <SessionCard key={s.id} session={s} currentUserId={user.id} />
              ))}
            </div>
          ) : (
            <p className="spiele-empty">Keine laufenden Spiele.</p>
          )}
        </div>

        {/* History link */}
        <div className="spiele-section">
          <Link href="/spiele/verlauf" className="btn btn-ghost">
            📜 Spielverlauf anzeigen
          </Link>
        </div>
      </div>
    </main>
  );
}

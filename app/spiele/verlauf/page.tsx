import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/app/components/header";
import { Breadcrumb } from "@/app/components/breadcrumb";
import { canAccessSpiele } from "@/lib/roles";
import { getUserSessionHistory, getUserGamingStats, getMentosBalance } from "@/app/actions/gaming";
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from "@/lib/gaming-types";
import type { GameSessionStatus } from "@/lib/gaming-types";

export default async function VerlaufPage() {
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

  const [{ data: history }, stats, mentosBalance] = await Promise.all([
    getUserSessionHistory(user.id),
    getUserGamingStats(user.id),
    getMentosBalance(user.id),
  ]);

  const sessions = history || [];

  return (
    <main className="dashboard">
      <AppHeader username={profile.username} role={profile.role} />

      <div className="dashboard-content">
        <Breadcrumb
          items={[
            { label: "Spiele", href: "/spiele" },
            { label: "Verlauf", href: "/spiele/verlauf" },
          ]}
        />

        <div className="dashboard-welcome">
          <h2>Spielverlauf</h2>
          <p>Deine bisherigen Sessions und Statistiken.</p>
        </div>

        {/* Stats overview */}
        <div className="verlauf-stats">
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value">{stats.total_sessions}</span>
            <span className="verlauf-stat-label">Spiele</span>
          </div>
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value">{stats.total_wins}</span>
            <span className="verlauf-stat-label">Siege</span>
          </div>
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value">{stats.total_score}</span>
            <span className="verlauf-stat-label">Gesamtpunkte</span>
          </div>
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value">🪙 {mentosBalance}</span>
            <span className="verlauf-stat-label">Mentos Coins</span>
          </div>
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value verlauf-stat-positive">
              +{stats.total_mentos_won}
            </span>
            <span className="verlauf-stat-label">Mentos gewonnen</span>
          </div>
          <div className="verlauf-stat-card">
            <span className="verlauf-stat-value verlauf-stat-negative">
              -{stats.total_mentos_lost}
            </span>
            <span className="verlauf-stat-label">Mentos eingesetzt</span>
          </div>
        </div>

        {/* Session history list */}
        <div className="spiele-section">
          <h3 className="spiele-section-title">Sessions ({sessions.length})</h3>
          {sessions.length > 0 ? (
            <div className="verlauf-list">
              {sessions.map((entry: any) => {
                const s = entry.session;
                if (!s) return null;
                const sessionStatus: GameSessionStatus = s.status;
                const isWinner = s.winner_id === user.id;
                return (
                  <Link
                    key={entry.session_id}
                    href={`/spiele/${entry.session_id}`}
                    className="verlauf-item"
                  >
                    <span className="verlauf-item-icon">
                      {s.game_type?.icon || "🎮"}
                    </span>
                    <div className="verlauf-item-info">
                      <span className="verlauf-item-name">
                        {s.name || s.game_type?.name || "Session"}
                      </span>
                      <span className="verlauf-item-date">
                        {new Date(s.created_at).toLocaleDateString("de-DE")}
                      </span>
                    </div>
                    <span className="verlauf-item-score">
                      {entry.score} Pkt
                    </span>
                    <span
                      className="spiele-session-status"
                      style={{
                        color: SESSION_STATUS_COLORS[sessionStatus],
                        borderColor: SESSION_STATUS_COLORS[sessionStatus],
                      }}
                    >
                      {SESSION_STATUS_LABELS[sessionStatus]}
                    </span>
                    {isWinner && (
                      <span className="verlauf-item-winner">🏆</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="spiele-empty">Noch keine Spiele gespielt.</p>
          )}
        </div>
      </div>
    </main>
  );
}

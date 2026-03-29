export function StatsBar({
  mentosBalance,
  totalSessions,
  totalWins,
  totalScore,
}: {
  mentosBalance: number;
  totalSessions: number;
  totalWins: number;
  totalScore: number;
}) {
  return (
    <div className="spiele-stats-bar">
      <div className="spiele-stat">
        <span className="spiele-stat-icon">🪙</span>
        <span className="spiele-stat-value">{mentosBalance}</span>
        <span className="spiele-stat-label">Mentos</span>
      </div>
      <div className="spiele-stat">
        <span className="spiele-stat-icon">🎮</span>
        <span className="spiele-stat-value">{totalSessions}</span>
        <span className="spiele-stat-label">Spiele</span>
      </div>
      <div className="spiele-stat">
        <span className="spiele-stat-icon">🏆</span>
        <span className="spiele-stat-value">{totalWins}</span>
        <span className="spiele-stat-label">Siege</span>
      </div>
      <div className="spiele-stat">
        <span className="spiele-stat-icon">⭐</span>
        <span className="spiele-stat-value">{totalScore}</span>
        <span className="spiele-stat-label">Punkte</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createGameSession } from "@/app/actions/gaming";
import type { GameType } from "@/lib/gaming-types";

export function CreateGameForm({ gameTypes }: { gameTypes: GameType[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("type");

  const preselected = gameTypes.find((gt) => gt.slug === preselectedSlug);

  const [selectedTypeId, setSelectedTypeId] = useState(
    preselected?.id || (gameTypes.length === 1 ? gameTypes[0].id : "")
  );
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [mentosStake, setMentosStake] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = gameTypes.find((gt) => gt.id === selectedTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedTypeId) {
      setError("Bitte wähle einen Spieltyp.");
      setLoading(false);
      return;
    }

    const { data, error: err } = await createGameSession({
      game_type_id: selectedTypeId,
      name: name.trim() || undefined,
      max_players: maxPlayers ? parseInt(maxPlayers, 10) : undefined,
      target_score: targetScore ? parseInt(targetScore, 10) : undefined,
      mentos_stake: mentosStake ? parseInt(mentosStake, 10) : undefined,
    });

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    if (data?.id) {
      router.push(`/spiele/${data.id}`);
    } else {
      router.push("/spiele");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="create-game-form">
      {/* Game Type Selection */}
      <div className="spiele-section">
        <h3 className="spiele-section-title">Spieltyp wählen</h3>
        <div className="spiele-type-grid">
          {gameTypes.map((gt) => (
            <button
              key={gt.id}
              type="button"
              className={`spiele-type-card spiele-type-selectable ${
                selectedTypeId === gt.id ? "spiele-type-selected" : ""
              }`}
              onClick={() => setSelectedTypeId(gt.id)}
            >
              <span className="spiele-type-icon">{gt.icon || "🎮"}</span>
              <span className="spiele-type-name">{gt.name}</span>
              <span className="spiele-type-desc">{gt.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Configuration */}
      {selectedTypeId && (
        <div className="create-game-config">
          <h3 className="spiele-section-title">
            {selectedType?.icon} Session konfigurieren
          </h3>

          <div className="form-group">
            <label>Session-Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`z.B. "${selectedType?.name || "Spiel"} Runde 1"`}
              maxLength={100}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max. Spieler (optional)</label>
              <input
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                placeholder="Unbegrenzt"
                min={2}
                max={50}
              />
            </div>

            <div className="form-group">
              <label>Zielpunktzahl (optional)</label>
              <input
                type="number"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                placeholder="Kein Limit"
                min={1}
              />
            </div>
          </div>

          <div className="form-group">
            <label>🪙 Mentos-Einsatz pro Spieler (optional)</label>
            <input
              type="number"
              value={mentosStake}
              onChange={(e) => setMentosStake(e.target.value)}
              placeholder="0 (kein Einsatz)"
              min={0}
            />
            {mentosStake && parseInt(mentosStake, 10) > 0 && (
              <span className="form-hint">
                Jeder Spieler setzt {mentosStake} Mentos Coins ein. Negativer
                Kontostand ist erlaubt.
              </span>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/spiele")}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Erstelle…" : "Session erstellen"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

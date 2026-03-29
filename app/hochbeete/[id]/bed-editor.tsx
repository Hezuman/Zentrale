"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createZone, updateZone, deleteZone } from "@/app/actions/zones";
import { useRouter } from "next/navigation";

interface Zone {
  id: string;
  raised_bed_id: string;
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  plant_type: string | null;
  plant_count: number | null;
  is_active: boolean;
}

interface Bed {
  id: string;
  name: string;
  width_cm: number;
  height_cm: number;
}

const PLANT_TYPES = [
  "Tomate",
  "Gurke",
  "Paprika",
  "Salat",
  "Karotte",
  "Radieschen",
  "Zucchini",
  "Erdbeere",
  "Kräuter",
  "Zwiebel",
  "Knoblauch",
  "Spinat",
  "Bohne",
  "Erbse",
  "Kohlrabi",
];

export function BedEditor({
  bed,
  initialZones,
  isAdmin,
  canEdit,
}: {
  bed: Bed;
  initialZones: Zone[];
  isAdmin: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Scale: map bed cm to pixels. Max width 800px, maintain aspect ratio.
  const maxPx = 800;
  const scale = Math.min(maxPx / bed.width_cm, maxPx / bed.height_cm, 4);
  const bedWidthPx = bed.width_cm * scale;
  const bedHeightPx = bed.height_cm * scale;

  const pxToCm = useCallback(
    (px: number) => Math.round(px / scale),
    [scale]
  );

  const getRelativePos = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(e.clientX - rect.left, bedWidthPx)),
        y: Math.max(0, Math.min(e.clientY - rect.top, bedHeightPx)),
      };
    },
    [bedWidthPx, bedHeightPx]
  );

  // Check overlap against existing zones (in cm)
  function checkOverlap(
    x: number,
    y: number,
    w: number,
    h: number,
    excludeId?: string
  ) {
    return zones.some(
      (z) =>
        z.id !== excludeId &&
        x < z.x_cm + z.width_cm &&
        x + w > z.x_cm &&
        y < z.y_cm + z.height_cm &&
        y + h > z.y_cm
    );
  }

  // Check if rect stays in bed bounds
  function checkBounds(x: number, y: number, w: number, h: number) {
    return x >= 0 && y >= 0 && x + w <= bed.width_cm && y + h <= bed.height_cm;
  }

  // Drawing rect in cm from drawStart/drawCurrent
  function getDrawRectCm() {
    if (!drawStart || !drawCurrent) return null;
    const x1 = pxToCm(Math.min(drawStart.x, drawCurrent.x));
    const y1 = pxToCm(Math.min(drawStart.y, drawCurrent.y));
    const x2 = pxToCm(Math.max(drawStart.x, drawCurrent.x));
    const y2 = pxToCm(Math.max(drawStart.y, drawCurrent.y));
    const w = Math.max(1, x2 - x1);
    const h = Math.max(1, y2 - y1);
    return { x: x1, y: y1, w, h };
  }

  function getDrawValid() {
    const r = getDrawRectCm();
    if (!r) return false;
    return checkBounds(r.x, r.y, r.w, r.h) && !checkOverlap(r.x, r.y, r.w, r.h);
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!drawMode || !canEdit) return;
      e.preventDefault();
      setSelectedZone(null);
      setError(null);
      const pos = getRelativePos(e);
      setDrawStart(pos);
      setDrawCurrent(pos);
      setDrawing(true);
    },
    [drawMode, canEdit, getRelativePos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      e.preventDefault();
      setDrawCurrent(getRelativePos(e));
    },
    [drawing, getRelativePos]
  );

  const handleMouseUp = useCallback(async () => {
    if (!drawing) return;
    setDrawing(false);

    const rect = getDrawRectCm();
    if (!rect || rect.w < 5 || rect.h < 5) {
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    if (!checkBounds(rect.x, rect.y, rect.w, rect.h)) {
      setError("Zone ragt über die Grenzen des Hochbeets hinaus.");
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    if (checkOverlap(rect.x, rect.y, rect.w, rect.h)) {
      setError("Zone überlappt mit einer bestehenden Zone.");
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createZone({
      raised_bed_id: bed.id,
      x_cm: rect.x,
      y_cm: rect.y,
      width_cm: rect.w,
      height_cm: rect.h,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setDrawMode(false);
      router.refresh();
    }

    setSaving(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [drawing, bed.id, zones, pxToCm, router]);

  // Sync zones when server updates
  useEffect(() => {
    setZones(initialZones);
  }, [initialZones]);

  async function handleUpdateZone(
    zoneId: string,
    plantType: string | null,
    plantCount: number | null
  ) {
    setSaving(true);
    setError(null);
    const result = await updateZone({
      id: zoneId,
      plant_type: plantType,
      plant_count: plantCount,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedZone(null);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDeleteZone(zoneId: string) {
    setSaving(true);
    setError(null);
    const result = await deleteZone(zoneId);
    if (result.error) {
      setError(result.error);
    } else {
      setSelectedZone(null);
      router.refresh();
    }
    setSaving(false);
  }

  const drawRect = getDrawRectCm();
  const drawValid = getDrawValid();

  return (
    <div className="bed-editor">
      <div className="bed-editor-toolbar">
        {canEdit && (
          <button
            className={`btn ${drawMode ? "btn-primary" : "btn-secondary"} btn-sm`}
            onClick={() => {
              setDrawMode(!drawMode);
              setSelectedZone(null);
              setError(null);
            }}
          >
            {drawMode ? "Zeichnen beenden" : "+ Zone zeichnen"}
          </button>
        )}
        {drawMode && (
          <span className="bed-editor-hint">
            Klicke und ziehe im Hochbeet, um eine Zone zu zeichnen.
          </span>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="bed-editor-canvas-wrapper">
        <div
          ref={containerRef}
          className={`bed-editor-canvas ${drawMode ? "bed-editor-canvas-draw" : ""}`}
          style={{ width: bedWidthPx, height: bedHeightPx }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (drawing) {
              setDrawing(false);
              setDrawStart(null);
              setDrawCurrent(null);
            }
          }}
        >
          {/* Grid lines */}
          <BedGrid widthCm={bed.width_cm} heightCm={bed.height_cm} scale={scale} />

          {/* Existing zones */}
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={`bed-zone ${selectedZone?.id === zone.id ? "bed-zone-selected" : ""}`}
              style={{
                left: zone.x_cm * scale,
                top: zone.y_cm * scale,
                width: zone.width_cm * scale,
                height: zone.height_cm * scale,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!drawMode) {
                  setSelectedZone(selectedZone?.id === zone.id ? null : zone);
                  setError(null);
                }
              }}
            >
              <div className="bed-zone-label">
                {zone.plant_type ? (
                  <>
                    <span className="bed-zone-plant">{zone.plant_type}</span>
                    {zone.plant_count && (
                      <span className="bed-zone-count">×{zone.plant_count}</span>
                    )}
                  </>
                ) : (
                  <span className="bed-zone-empty-label">Leer</span>
                )}
              </div>
              <div className="bed-zone-dims">
                {zone.width_cm}×{zone.height_cm}
              </div>
            </div>
          ))}

          {/* Drawing preview */}
          {drawing && drawRect && (
            <div
              className={`bed-zone-preview ${drawValid ? "bed-zone-preview-valid" : "bed-zone-preview-invalid"}`}
              style={{
                left: drawRect.x * scale,
                top: drawRect.y * scale,
                width: drawRect.w * scale,
                height: drawRect.h * scale,
              }}
            >
              <span className="bed-zone-preview-dims">
                {drawRect.w}×{drawRect.h}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Zone detail panel */}
      {selectedZone && !drawMode && (
        <ZonePanel
          zone={selectedZone}
          isAdmin={isAdmin}
          canEdit={canEdit}
          saving={saving}
          onUpdate={handleUpdateZone}
          onDelete={handleDeleteZone}
          onClose={() => setSelectedZone(null)}
        />
      )}

      {saving && <div className="bed-editor-saving">Speichern...</div>}
    </div>
  );
}

function BedGrid({
  widthCm,
  heightCm,
  scale,
}: {
  widthCm: number;
  heightCm: number;
  scale: number;
}) {
  const step = widthCm <= 100 ? 10 : widthCm <= 200 ? 20 : 50;
  const vLines: number[] = [];
  const hLines: number[] = [];

  for (let x = step; x < widthCm; x += step) vLines.push(x);
  for (let y = step; y < heightCm; y += step) hLines.push(y);

  return (
    <svg className="bed-grid" width={widthCm * scale} height={heightCm * scale}>
      {vLines.map((x) => (
        <line
          key={`v${x}`}
          x1={x * scale}
          y1={0}
          x2={x * scale}
          y2={heightCm * scale}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}
      {hLines.map((y) => (
        <line
          key={`h${y}`}
          x1={0}
          y1={y * scale}
          x2={widthCm * scale}
          y2={y * scale}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}
    </svg>
  );
}

function ZonePanel({
  zone,
  isAdmin,
  canEdit,
  saving,
  onUpdate,
  onDelete,
  onClose,
}: {
  zone: Zone;
  isAdmin: boolean;
  canEdit: boolean;
  saving: boolean;
  onUpdate: (id: string, plantType: string | null, plantCount: number | null) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [plantType, setPlantType] = useState(zone.plant_type || "");
  const [plantCount, setPlantCount] = useState(zone.plant_count || 1);

  // Reset when zone changes
  useEffect(() => {
    setPlantType(zone.plant_type || "");
    setPlantCount(zone.plant_count || 1);
  }, [zone.id, zone.plant_type, zone.plant_count]);

  function handleSave() {
    const pt = plantType || null;
    const pc = pt ? Math.max(1, plantCount) : null;
    onUpdate(zone.id, pt, pc);
  }

  return (
    <div className="zone-panel">
      <div className="zone-panel-header">
        <h3>Zone bearbeiten</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="zone-panel-info">
        <span>
          Position: {zone.x_cm}, {zone.y_cm} cm
        </span>
        <span>
          Größe: {zone.width_cm} × {zone.height_cm} cm
        </span>
      </div>

      {canEdit && (
        <div className="zone-panel-form">
          <div className="form-group">
            <label htmlFor="plant_type">Pflanzart</label>
            <select
              id="plant_type"
              className="form-select"
              value={plantType}
              onChange={(e) => {
                setPlantType(e.target.value);
                if (!e.target.value) setPlantCount(1);
              }}
            >
              <option value="">– Keine –</option>
              {PLANT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>

          {plantType && (
            <div className="form-group">
              <label htmlFor="plant_count">Anzahl</label>
              <div className="counter-input">
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() => setPlantCount(Math.max(1, plantCount - 1))}
                  disabled={plantCount <= 1}
                >
                  −
                </button>
                <input
                  id="plant_count"
                  type="number"
                  className="counter-value"
                  min={1}
                  value={plantCount}
                  onChange={(e) =>
                    setPlantCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                />
                <button
                  type="button"
                  className="counter-btn"
                  onClick={() => setPlantCount(plantCount + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="zone-panel-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Speichern..." : "Speichern"}
            </button>
            {isAdmin && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (confirm("Zone wirklich löschen?")) {
                    onDelete(zone.id);
                  }
                }}
                disabled={saving}
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

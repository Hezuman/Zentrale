"use client";

import { useState } from "react";
import { createRaisedBed } from "@/app/actions/hochbeete";

export function CreateHochbeetForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const result = await createRaisedBed(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setIsOpen(false);
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
        + Hochbeet erstellen
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Hochbeet erstellen</h3>
        <p className="modal-subtitle">
          Erstelle ein neues Hochbeet mit den grundlegenden Angaben.
        </p>

        <form action={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="z.B. Hochbeet Terrasse"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="width_cm">Breite (cm) *</label>
              <input
                id="width_cm"
                name="width_cm"
                type="number"
                min="1"
                placeholder="z.B. 120"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="height_cm">Höhe (cm) *</label>
              <input
                id="height_cm"
                name="height_cm"
                type="number"
                min="1"
                placeholder="z.B. 80"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Beschreibung (optional)</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optionale Beschreibung des Hochbeets..."
              rows={3}
              className="form-textarea"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Erstelle..." : "Erstellen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

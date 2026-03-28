"use client";

import { useState } from "react";
import { register } from "@/app/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="auth-back">
          ← Zurück
        </Link>
        <h1 className="auth-title">Registrieren</h1>
        <p className="auth-subtitle">
          Du benötigst einen Einladungscode um ein Konto zu erstellen.
        </p>

        <form action={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="inviteCode">Einladungscode</label>
            <input
              id="inviteCode"
              name="inviteCode"
              type="text"
              required
              placeholder="XXXX-XXXX-XXXX"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Benutzername</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="dein_benutzername"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">Passwort bestätigen</label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Wird registriert..." : "Konto erstellen"}
          </button>
        </form>

        <p className="auth-footer-text">
          Bereits registriert?{" "}
          <Link href="/login">Anmelden</Link>
        </p>
      </div>
    </main>
  );
}

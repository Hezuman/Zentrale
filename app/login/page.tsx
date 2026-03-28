"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
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
        <h1 className="auth-title">Anmelden</h1>
        <p className="auth-subtitle">
          Melde dich mit deinem Benutzernamen an.
        </p>

        <form action={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Benutzername</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="dein_benutzername"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Wird angemeldet..." : "Anmelden"}
          </button>
        </form>

        <p className="auth-footer-text">
          Noch kein Konto?{" "}
          <Link href="/register">Registrieren</Link>
        </p>
      </div>
    </main>
  );
}

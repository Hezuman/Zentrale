"use client";

import { useState, useEffect, useRef } from "react";
import { login, register } from "@/app/actions/auth";
import { validateInviteCode } from "@/app/actions/invite-codes";
import Link from "next/link";
import { ROLE_LABELS } from "@/lib/roles";

export default function LoginPage() {
  const [mode, setMode] = useState<"invite" | "login">("invite");
  const [inviteCode, setInviteCode] = useState("");
  const [validatedRole, setValidatedRole] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const code = inviteCode.trim();
    if (code.length < 4) {
      setValidatedRole(null);
      setValidating(false);
      return;
    }

    setValidating(true);
    debounceRef.current = setTimeout(async () => {
      const result = await validateInviteCode(code);
      setValidatedRole(result.valid ? result.role : null);
      setValidating(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inviteCode]);

  async function handleRegister(formData: FormData) {
    setError(null);
    setLoading(true);
    formData.set("inviteCode", inviteCode.trim());
    const result = await register(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleLogin(formData: FormData) {
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
      <div className="auth-card auth-card-wide">
        <Link href="/" className="auth-back">
          ← Zurück
        </Link>
        <h1 className="auth-title">Willkommen</h1>
        <p className="auth-subtitle">
          Tritt der Zentrale bei oder melde dich an.
        </p>

        {mode === "invite" ? (
          <>
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="inviteCode">Einladungscode</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXX-XXXX-XXXX"
                  autoFocus
                  className={validatedRole ? "input-valid" : ""}
                />
              </div>

              {validating && (
                <div className="invite-status invite-status-checking">
                  Wird geprüft…
                </div>
              )}

              {validatedRole && !validating && (
                <div className="invite-status invite-status-valid">
                  <span className={`role-badge role-${validatedRole}`}>
                    {ROLE_LABELS[validatedRole] || validatedRole}
                  </span>
                  <span>Code gültig – Rolle erkannt</span>
                </div>
              )}

              {inviteCode.trim().length >= 4 &&
                !validatedRole &&
                !validating && (
                  <div className="invite-status invite-status-invalid">
                    Ungültiger oder bereits verwendeter Code
                  </div>
                )}
            </div>

            {validatedRole && (
              <form action={handleRegister} className="auth-form" style={{ marginTop: "1rem" }}>
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

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? "Wird erstellt…" : "Konto erstellen"}
                </button>
              </form>
            )}

            <div className="auth-divider">
              <span>oder</span>
            </div>

            <Link href="/guest" className="btn btn-ghost btn-full">
              Als Gast fortfahren
            </Link>

            <p className="auth-footer-text">
              Bereits registriert?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Anmelden
              </button>
            </p>
          </>
        ) : (
          <>
            <form action={handleLogin} className="auth-form">
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

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
              >
                {loading ? "Wird angemeldet…" : "Anmelden"}
              </button>
            </form>

            <div className="auth-divider">
              <span>oder</span>
            </div>

            <Link href="/guest" className="btn btn-ghost btn-full">
              Als Gast fortfahren
            </Link>

            <p className="auth-footer-text">
              Einladungscode erhalten?{" "}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setMode("invite");
                  setError(null);
                }}
              >
                Registrieren
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

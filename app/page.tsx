"use client";

import { useState, useEffect, useRef } from "react";
import { login, register } from "@/app/actions/auth";
import { validateInviteCode } from "@/app/actions/invite-codes";
import { useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/roles";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Login state
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [inviteCode, setInviteCode] = useState("");
  const [validatedRole, setValidatedRole] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guest state
  const [guestLoading, setGuestLoading] = useState(false);

  // Invite code live validation
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

  async function handleLogin(formData: FormData) {
    setLoginError(null);
    setLoginLoading(true);
    const result = await login(formData);
    if (result?.error) {
      setLoginError(result.error);
      setLoginLoading(false);
    }
  }

  async function handleRegister(formData: FormData) {
    setRegisterError(null);
    setRegisterLoading(true);
    formData.set("inviteCode", inviteCode.trim());
    const result = await register(formData);
    if (result?.error) {
      setRegisterError(result.error);
      setRegisterLoading(false);
    }
  }

  function handleGuestClick() {
    setGuestLoading(true);
    router.push("/guest");
  }

  return (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-badge">Kontrollzentrum</div>
        <h1 className="landing-title">ZENTRALE</h1>
        <p className="landing-description">
          Das zentrale System zur Verwaltung und Steuerung aller Bereiche auf
          dem Grundstück. Beete, Systeme, Aufgaben – alles an einem Ort.
        </p>

        <div className="auth-card auth-card-landing">
          {/* Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${tab === "login" ? "auth-tab-active" : ""}`}
              onClick={() => {
                setTab("login");
                setLoginError(null);
              }}
            >
              Anmelden
            </button>
            <button
              type="button"
              className={`auth-tab ${tab === "register" ? "auth-tab-active" : ""}`}
              onClick={() => {
                setTab("register");
                setRegisterError(null);
              }}
            >
              Registrieren
            </button>
          </div>

          {tab === "login" ? (
            <form action={handleLogin} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-username">Benutzername</label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="dein_benutzername"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Passwort</label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>

              {loginError && <div className="form-error">{loginError}</div>}

              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <span className="spinner" /> Wird angemeldet…
                  </>
                ) : (
                  "Anmelden"
                )}
              </button>
            </form>
          ) : (
            <>
              {registerStep === 1 && (
                <div className="auth-form">
                  <div className="register-step-label">
                    Schritt 1 – Einladungscode
                  </div>
                  <div className="form-group">
                    <label htmlFor="inviteCode">Einladungscode</label>
                    <input
                      id="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) =>
                        setInviteCode(e.target.value.toUpperCase())
                      }
                      placeholder="XXX-XXXX-XXXX"
                      autoFocus
                      className={validatedRole ? "input-valid" : ""}
                    />
                  </div>

                  {validating && (
                    <div className="invite-status invite-status-checking">
                      <span className="spinner" /> Wird geprüft…
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

                  {validatedRole && (
                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      onClick={() => setRegisterStep(2)}
                    >
                      Weiter
                    </button>
                  )}
                </div>
              )}

              {registerStep === 2 && (
                <form action={handleRegister} className="auth-form">
                  <div className="register-step-label">
                    Schritt 2 – Konto erstellen
                  </div>

                  <div className="invite-status invite-status-valid">
                    <span className={`role-badge role-${validatedRole}`}>
                      {ROLE_LABELS[validatedRole!] || validatedRole}
                    </span>
                    <span>
                      Rolle: {ROLE_LABELS[validatedRole!] || validatedRole}
                    </span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-username">Benutzername</label>
                    <input
                      id="reg-username"
                      name="username"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="dein_benutzername"
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-password">Passwort</label>
                    <input
                      id="reg-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Mindestens 8 Zeichen"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reg-passwordConfirm">
                      Passwort bestätigen
                    </label>
                    <input
                      id="reg-passwordConfirm"
                      name="passwordConfirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Passwort wiederholen"
                    />
                  </div>

                  {registerError && (
                    <div className="form-error">{registerError}</div>
                  )}

                  <div className="register-step-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setRegisterStep(1)}
                      disabled={registerLoading}
                    >
                      Zurück
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={registerLoading}
                      style={{ flex: 1 }}
                    >
                      {registerLoading ? (
                        <>
                          <span className="spinner" /> Wird erstellt…
                        </>
                      ) : (
                        "Konto erstellen"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="auth-divider">
            <span>oder</span>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-full"
            onClick={handleGuestClick}
            disabled={guestLoading}
          >
            {guestLoading ? (
              <>
                <span className="spinner" /> Laden…
              </>
            ) : (
              "Als Gast fortfahren"
            )}
          </button>
        </div>
      </div>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} ZENTRALE</p>
      </footer>
    </main>
  );
}

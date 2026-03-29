"use client";

import { useState } from "react";
import { ROLE_LABELS } from "@/lib/roles";

interface InviteCode {
  id: string;
  code: string;
  role: string;
  created_at: string;
}

export function InviteCodeList({
  grouped,
}: {
  grouped: Record<string, InviteCode[] | undefined>;
}) {
  const roleOrder = ["admin", "family", "close_friends", "friends"];
  const hasAnyCodes = roleOrder.some((r) => grouped[r] && grouped[r]!.length > 0);

  return (
    <div className="invite-code-groups">
      {roleOrder.map((role) => {
        const codes = grouped[role];
        if (!codes || codes.length === 0) return null;

        return (
          <div key={role} className="invite-code-group">
            <div className="invite-code-group-title">
              <span className={`role-badge role-${role}`}>
                {ROLE_LABELS[role] || role}
              </span>
              <span className="invite-code-count">
                {codes.length} verfügbar
              </span>
            </div>
            <div className="invite-code-list">
              {codes.map((code) => (
                <CopyableCode key={code.id} code={code.code} />
              ))}
            </div>
          </div>
        );
      })}

      {!hasAnyCodes && (
        <div className="placeholder-card">
          <p>Keine unbenutzten Codes vorhanden.</p>
        </div>
      )}
    </div>
  );
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="invite-code-item">
      <code className="invite-code-value">{code}</code>
      <button
        className={`btn btn-sm ${copied ? "btn-copied" : "btn-ghost"}`}
        onClick={handleCopy}
      >
        {copied ? "✓ Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}

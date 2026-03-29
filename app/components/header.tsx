"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/dashboard/logout-button";
import { ROLE_LABELS } from "@/lib/roles";

const AREA_COLORS: Record<string, string> = {
  dashboard: "#22c55e",
  hochbeete: "#a0845c",
  spiele: "#3b82f6",
  settings: "#6b7280",
  admin: "#eab308",
  guest: "#22c55e",
};

function getArea(pathname: string): string {
  if (pathname.startsWith("/hochbeete")) return "hochbeete";
  if (pathname.startsWith("/spiele")) return "spiele";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/guest")) return "guest";
  return "dashboard";
}

export function AppHeader({
  username,
  role,
  isGuest = false,
}: {
  username?: string;
  role?: string;
  isGuest?: boolean;
}) {
  const pathname = usePathname();
  const area = getArea(pathname);
  const accentColor = AREA_COLORS[area] || AREA_COLORS.dashboard;

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="app-header-left">
          <Link
            href={isGuest ? "/guest" : "/dashboard"}
            className="app-header-logo"
          >
            ZENTRALE
          </Link>
        </div>
        <div className="app-header-right">
          {username && <span className="app-header-user">{username}</span>}
          {role && (
            <span className={`role-badge role-${role}`}>
              {ROLE_LABELS[role] || role}
            </span>
          )}
          {isGuest && <span className="role-badge role-guest">Gast</span>}
          {isGuest ? (
            <Link href="/" className="btn btn-ghost btn-sm">
              Verlassen
            </Link>
          ) : (
            username && <LogoutButton />
          )}
        </div>
      </div>
      <div
        className="app-header-accent"
        style={{ backgroundColor: accentColor }}
      />
    </header>
  );
}

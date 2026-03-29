"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logout();
  }

  return (
    <form action={handleLogout}>
      <button type="submit" className="btn btn-ghost btn-sm" disabled={loading}>
        {loading ? <span className="spinner" /> : "Abmelden"}
      </button>
    </form>
  );
}

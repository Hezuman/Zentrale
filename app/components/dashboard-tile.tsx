"use client";

import { useState } from "react";
import Link from "next/link";

export function DashboardTile({
  href,
  accent,
  icon,
  title,
  description,
}: {
  href: string;
  accent: string;
  icon: string;
  title: string;
  description: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <Link
      href={href}
      className={`dashboard-tile ${loading ? "dashboard-tile-loading" : ""}`}
      data-accent={accent}
      onClick={() => setLoading(true)}
    >
      <div className="dashboard-tile-icon">
        {loading ? <span className="spinner" /> : icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </Link>
  );
}

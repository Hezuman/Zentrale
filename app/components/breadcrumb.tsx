"use client";

import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumb({
  items,
  isGuest = false,
}: {
  items: BreadcrumbItem[];
  isGuest?: boolean;
}) {
  const baseCrumb = {
    label: "Zentrale",
    href: isGuest ? "/guest" : "/dashboard",
  };

  return (
    <nav className="breadcrumb">
      <Link href={baseCrumb.href} className="breadcrumb-link">
        {baseCrumb.label}
      </Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="breadcrumb-sep">/</span>
          {i < items.length - 1 ? (
            <Link href={item.href} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

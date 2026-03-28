import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zentrale – Early Beta",
  description: "Zentrale – Dein zentraler Hub. Aktuell in der Early Beta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZENTRALE",
  description:
    "ZENTRALE – Das zentrale System zur Verwaltung und Steuerung aller Bereiche.",
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

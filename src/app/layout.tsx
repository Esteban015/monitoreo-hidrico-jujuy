import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, socialMeta } from "@/lib/siteMeta";

// Sin fuentes remotas (next/font/google) para que el build no dependa de Internet.
// Íconos por convención de archivos de App Router: icon.svg, favicon.ico, apple-icon.png, opengraph-image.png y
// twitter-image.png en src/app/ (generados por scripts/brand/generate-brand-assets.mjs; D-27).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s — AquaJuy" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  ...socialMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }),
};

export const viewport: Viewport = {
  themeColor: "#0f4c5c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

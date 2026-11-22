import type { Metadata } from "next";
import "./globals.css";

// Sin fuentes remotas (next/font/google) para que el build no dependa de Internet.
export const metadata: Metadata = {
  title: "Monitoreo de Cuencas — Jujuy",
  description: "Seguimiento de superficie de agua y precipitación en cuencas testigo de Jujuy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

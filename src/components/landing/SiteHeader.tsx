/* eslint-disable @next/next/no-html-link-for-pages -- D-26/D-28: navegación completa entre páginas estáticas (next/link generaba 404 de precarga con la exportación estática de Next 16.4). */
import { Logo } from "@/components/brand/Logo";
import MobileMenu, { type NavItem } from "./MobileMenu";

// Rutas absolutas (D-28): funcionan desde cualquier página.
export const NAV: NavItem[] = [
  { href: "/#problema", label: "Problema" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#casos", label: "Casos testigo" },
  { href: "/#metodologia", label: "Metodología" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-brand-primary/10 bg-brand-bg/95 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        <a href="/" aria-label="Monitoreo Hídrico Jujuy, inicio" className="inline-flex min-h-11 items-center">
          <Logo compact />
        </a>
        <nav aria-label="Secciones" className="hidden items-center gap-1 text-sm text-brand-ink md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="inline-flex min-h-11 items-center rounded-lg px-3 hover:bg-white hover:text-brand-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="/demo"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg bg-brand-primary px-3 text-sm font-semibold text-white hover:bg-brand-primary/90 sm:px-4"
          >
            Ver demo
          </a>
          <MobileMenu items={NAV} />
        </div>
      </div>
    </header>
  );
}

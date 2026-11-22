import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "#problema", label: "Problema" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#casos", label: "Casos testigo" },
  { href: "#metodologia", label: "Metodología" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-brand-primary/10 bg-brand-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <a href="./" aria-label="Monitoreo Hídrico Jujuy, inicio">
          <Logo compact />
        </a>
        <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm text-brand-ink/80 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-brand-primary">
              {n.label}
            </a>
          ))}
        </nav>
        <a
          href="demo"
          className="inline-flex min-h-10 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary/90"
        >
          Ver demo
        </a>
      </div>
    </header>
  );
}

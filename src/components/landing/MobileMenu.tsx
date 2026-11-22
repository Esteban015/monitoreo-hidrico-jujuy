"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Menú de secciones para móvil (D-30): botón con aria-expanded/aria-controls, foco al primer enlace al abrir,
 * cierre con Escape (devuelve el foco al botón), al elegir una sección, al tocar fuera o al salir con Tab.
 * Sin JavaScript, las secciones siguen disponibles en el pie de página y el CTA «Ver demo» queda visible.
 */
export default function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="menu-secciones"
        aria-label={open ? "Cerrar menú de secciones" : "Abrir menú de secciones"}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-brand-primary/20 text-brand-primary hover:bg-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <div
        id="menu-secciones"
        ref={panelRef}
        hidden={!open}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && !panelRef.current?.contains(next) && !buttonRef.current?.contains(next)) close(false);
        }}
        className="absolute inset-x-0 top-full z-40 border-b border-brand-primary/10 bg-white shadow-lg"
      >
        <nav aria-label="Secciones">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {items.map((it) => (
              <li key={it.href}>
                <a
                  href={it.href}
                  onClick={() => close(false)}
                  className="flex min-h-11 items-center rounded-lg px-3 text-base font-medium text-brand-ink hover:bg-brand-bg"
                >
                  {it.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

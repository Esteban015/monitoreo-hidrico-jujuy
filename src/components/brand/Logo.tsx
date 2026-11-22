// Isotipo: espejo de agua (curvas de nivel) dentro de un contorno territorial. SVG inline: sin archivos externos.
export function LogoMark({ className = "h-8 w-8", inverted = false }: { className?: string; inverted?: boolean }) {
  const base = inverted ? "#ffffff" : "#0f4c5c";
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="Isotipo Monitoreo Hídrico Jujuy">
      <rect x="1" y="1" width="38" height="38" rx="10" fill={base} />
      <path d="M8 24c4-3.2 8-3.2 12 0s8 3.2 12 0" fill="none" stroke={inverted ? "#0f4c5c" : "#ffffff"} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 30c4-3.2 8-3.2 12 0s8 3.2 12 0" fill="none" stroke="#61a5a2" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 8c-3.6 4.4-5.4 7.4-5.4 9.6a5.4 5.4 0 0 0 10.8 0C25.4 15.4 23.6 12.4 20 8z" fill="#d9c7a3" />
    </svg>
  );
}

export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark inverted={inverted} />
      <span className="leading-tight">
        <span className={`block text-base font-semibold tracking-tight ${inverted ? "text-white" : "text-brand-primary"}`}>
          Monitoreo Hídrico Jujuy
        </span>
        {!compact && (
          <span className={`block text-[11px] ${inverted ? "text-white/75" : "text-brand-ink/70"}`}>Agua superficial con datos trazables</span>
        )}
      </span>
    </span>
  );
}

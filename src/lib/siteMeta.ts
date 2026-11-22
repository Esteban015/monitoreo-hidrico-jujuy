// Metadatos compartidos (D-32). Las páginas que definen openGraph/twitter REEMPLAZAN los del layout (no se fusionan),
// por eso todas parten de esta base y solo cambian título, descripción y URL.
import type { Metadata } from "next";

export const SITE_URL = "https://monitoreo-hidrico-jujuy.vercel.app";
export const SITE_NAME = "Monitoreo Hídrico Jujuy";
export const SITE_TITLE = "Monitoreo Hídrico Jujuy — Agua superficial con datos trazables";
export const SITE_DESCRIPTION =
  "Plataforma geoespacial para visualizar cambios en lagunas y embalses de Jujuy con imágenes satelitales reales, contexto de precipitación y advertencias metodológicas.";
const OG_ALT = "Monitoreo Hídrico Jujuy: Laguna de los Pozuelos en dos imágenes Sentinel-2 reales.";

export function socialMeta({ title, description, path }: { title: string; description: string; path: string }): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      locale: "es_AR",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: OG_ALT, type: "image/png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: "/twitter-image.png", alt: OG_ALT }],
    },
  };
}

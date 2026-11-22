// Advertencias metodológicas obligatorias (texto fijo; los valores numéricos salen siempre de los JSON).
export const NOTICES = {
  surface: "Superficie de agua visible estimada, no volumen ni caudal.",
  basin: "Cuenca de aporte modelada, no delimitación oficial.",
  rainMonth: "Precipitación mensual correspondiente al último mes calendario completo anterior a la imagen.",
  noCausality: "Estos datos no permiten atribuir el cambio del espejo de agua a la precipitación: se muestran juntos como contexto.",
  noTrend: "Dos fechas muestran un cambio entre observaciones, no una tendencia de largo plazo.",
  chirpsEstimate: "CHIRPS es una estimación satelital calibrada con estaciones, no una medición de pluviómetro.",
} as const;

/** Amplitud (puntos porcentuales) a partir de la cual se destaca la sensibilidad al método. */
export const HIGH_SENSITIVITY_SPAN = 15;

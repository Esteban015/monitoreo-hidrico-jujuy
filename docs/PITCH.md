# Pitch y recorrido de demo

## Pitch de 30 segundos

> En Jujuy, decidir sobre el agua es difícil: los datos existen, pero están dispersos y son técnicos. **Cuencas Jujuy** muestra en un mapa si el agua visible de una laguna o embalse cambió más de lo normal y si la lluvia de su cuenca lo acompaña. Usa Sentinel-2, CHIRPS y HydroBASINS, con la fuente, la fecha y la incertidumbre a la vista. No mide volumen ni caudal: mide superficie visible, con trazabilidad. Y funciona sin Internet.

## Recorrido de 2 minutos

1. **Abrir** `http://localhost:3000`. Aclarar: datos reales, dos casos testigo, modo offline.
2. **Elegir Dique Las Maderas** (Valles/Perico). Mostrar cuenca, cuerpo de agua y las dos fechas.
3. **Comparar**: 29/05/2025 vs. 03/10/2025. Señalar **−18,1 %** y el rango **−13,0 % a −18,9 %**.
4. **Leer la lluvia**: septiembre 2025, 6,18 mm vs. media 7,65 mm (−19,1 %); percentil 50. La lluvia acompaña, no prueba causalidad.
5. **Abrir trazabilidad**: ID de escena, nubosidad efectiva, cobertura, método, HydroBASINS y OSM.
6. **Cambiar a Laguna de los Pozuelos**: **−53,9 %**, pero rango **−26,3 % a −68,5 %** por agua somera y barro. Mostrar la advertencia: es el ejemplo de por qué la incertidumbre debe estar visible.
7. **Modo offline**: recordar que el mapa base provincial y todos los datos son locales.
8. **Cierre**: "No reemplaza un estudio hidrológico. Da una señal temprana, trazable y barata para decidir dónde mirar."

## Preguntas frecuentes del jurado

**¿Miden volumen o caudal?**
No. Miden superficie visible de agua. Superficie ≠ volumen ≠ caudal. Convertirlo requeriría batimetría y estudios hidrológicos.

**¿Los datos son reales?**
Sí: Sentinel-2 L2A, CHIRPS v3.0 y HydroBASINS. Cada valor tiene escena, fecha y método. Las cuencas son modeladas y se rotulan como tales.

**¿Por qué sólo dos casos?**
Es un MVP de hackatón. La arquitectura permite agregar cuencas con el mismo pipeline; la prioridad fue demostrar rigor y trazabilidad.

**¿Qué pasa si hay nubes?**
Se filtra por nubosidad efectiva sobre el AOI y se documenta. Si no hay escena limpia, se busca otra fecha o se advierte.

**¿Cómo se sostiene?**
SaaS B2G/B2B, planes institucionales, informes y API; capa pública gratuita. Ver `docs/MODELO_DE_NEGOCIO.md`.

**¿Qué los diferencia de Google Earth Engine?**
Foco local, interfaz en español, curaduría, trazabilidad lista para decisión y funcionamiento offline. No competimos en infraestructura satelital.

**¿Y la sequía?**
La herramienta muestra una señal: menos superficie y/o menos lluvia que el histórico. No atribuye causalidad ni declara estado de sequía oficial.

## Guion de 3 frases para el jurado

1. **Problema:** los datos hídricos de Jujuy existen pero no llegan a quien decide.
2. **Solución:** un tablero simple que compara dos fechas reales y la lluvia de la cuenca, con trazabilidad e incertidumbre.
3. **Tracción:** MVP funcional, datos reales, offline, API y tests; el siguiente paso es un piloto con 4–6 cuencas.

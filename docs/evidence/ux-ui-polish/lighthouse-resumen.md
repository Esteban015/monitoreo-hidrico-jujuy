# Lighthouse 12.8.2 — resumen (laboratorio)

Build estático servido con scripts/serve-static.mjs en 127.0.0.1, Chrome 139 headless, perfil móvil por defecto (Moto G Power, 4G lenta simulada) y --preset=desktop. Fecha: 2026-11-22. Una corrida por combinación: hay variación natural entre corridas.

```
antes-demo-desktop           perf  98 a11y 100 bp 100 seo 100 | LCP   1.2 s CLS  0.002 TBT   30 ms FCP   0.3 s | peso     839 KiB
antes-demo-mobile            perf  69 a11y 100 bp 100 seo 100 | LCP   6.1 s CLS  0.012 TBT  380 ms FCP   0.9 s | peso     839 KiB
antes-landing-desktop        perf  90 a11y  96 bp 100 seo 100 | LCP   2.1 s CLS      0 TBT   30 ms FCP   0.3 s | peso    2009 KiB
   fallas binarias: color-contrast
antes-landing-mobile         perf  71 a11y  96 bp 100 seo 100 | LCP  11.9 s CLS      0 TBT  220 ms FCP   1.1 s | peso    2009 KiB
   fallas binarias: color-contrast
despues-demo-desktop         perf  97 a11y 100 bp 100 seo 100 | LCP   1.2 s CLS  0.005 TBT    0 ms FCP   0.3 s | peso     834 KiB
despues-demo-mobile          perf  70 a11y 100 bp 100 seo 100 | LCP   6.3 s CLS  0.029 TBT  330 ms FCP   1.2 s | peso     834 KiB
despues-landing-desktop      perf  99 a11y 100 bp 100 seo 100 | LCP   1.0 s CLS      0 TBT   10 ms FCP   0.3 s | peso     799 KiB
despues-landing-mobile       perf  82 a11y 100 bp 100 seo 100 | LCP   4.8 s CLS      0 TBT   80 ms FCP   1.4 s | peso     703 KiB
```

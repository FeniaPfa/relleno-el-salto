# Expediente COSEMAR El Salto

Análisis geoespacial independiente del Estudio de Impacto Ambiental del proyecto
«Centro Metropolitano de Gestión Integral de Residuos» (COSEMAR SpA), El Salto,
Viña del Mar. Expediente SEIA **2168892026**.

Sitio estático: un `index.html` y sus imágenes. Sin build, sin dependencias.
La única librería externa es Three.js, desde cdnjs.

## Publicar en GitHub Pages

1. Crea el repositorio y sube el contenido de esta carpeta a la raíz.
2. En **Settings → Pages**, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
3. Cuando quede en línea, reemplaza `USUARIO.github.io/cosemar-el-salto` por la URL
   real en las etiquetas `og:url`, `og:image` y `canonical` del `index.html`
   (o en `build_sitio.py`, variable `URL`, y vuelve a generar).

Ese último paso importa: sin la URL correcta, al compartir el enlace por WhatsApp
no aparece la tarjeta con imagen.

## Fuentes

Todo sale del expediente público en `seia.sea.gob.cl`, de cartografía propia del
titular reproyectada desde EPSG:32719, de OpenStreetMap y de imágenes Sentinel-2.
Cada sección declara su fuente y su método.

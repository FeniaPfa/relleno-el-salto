# Expediente COSEMAR El Salto

Análisis geoespacial independiente del Estudio de Impacto Ambiental del relleno sanitario
«Centro Metropolitano de Gestión Integral de Residuos» (Cosemar SpA), El Salto, Viña del Mar.
Expediente SEIA **2168892026**. La participación ciudadana cierra el **3 de noviembre de 2026**.

**→ <https://feniapfa.github.io/seia-data/>**

Todo sale de los documentos que el propio titular presentó al SEIA, de cartografía suya
reproyectada desde EPSG:32719, de OpenStreetMap y de imágenes Sentinel-2. Cada sección declara
su fuente, su método y sus límites; lo que calcula la página, y no el titular, va rotulado como tal.

El repositorio guarda además una **copia en texto de todo el expediente**, porque el SEIA es un
sitio que el servicio puede cambiar o retirar.

## Las dos páginas

| página | qué es |
|---|---|
| [`index.html`](https://feniapfa.github.io/seia-data/) | el análisis: cifras, mapas, dos visores 3D, preguntas frecuentes y observaciones modelo para ingresar en el SEA |
| [`relato.html`](https://feniapfa.github.io/seia-data/relato.html) | el recorrido en 3D con scroll: la quebrada que se llena, el viento, el agua y la vista desde cada población |
| [`que-puede-pasar.html`](https://feniapfa.github.io/seia-data/que-puede-pasar.html) | el recorrido del expediente después de la participación ciudadana, con los plazos de la Ley 19.300 y lo que obliga cada desenlace |

Las tres son **generadas**: no se editan a mano.

## Construir

```bash
python3 build.py        # src/ → index.html, relato.html, que-puede-pasar.html, sitemap.xml
```

Sin dependencias ni sistema de build. Three.js y las fuentes van en el repo: la página no se
conecta a terceros. Si hay `node`, el build valida la sintaxis del script final.

## El archivo del expediente

```
expediente/
  INDICE.md            empieza aquí: qué hay, documento por documento
  texto/               299 archivos, 315 piezas con texto extraído (29 MB)
  paginas/             42 documentos que en el SEIA sólo existen como página web
  manifiesto.json      URL, tamaño y SHA-256 de cada binario original
  PENDIENTE-OCR.md     las páginas escaneadas que siguen sin texto
```

| | |
|---|---|
| Documentos del expediente | 60 |
| Archivos adjuntos | 97 (1,6 GB) |
| Páginas de PDF | 4.335 |
| Páginas escaneadas, sin texto todavía | 268 (6,2 %) |

Al repositorio va sólo el texto. Los binarios no caben; `manifiesto.json` permite rebajarlos y
comprobar que son los mismos. Para reconstruir todo desde cero:

```bash
python3 archivo/resolver.py   # cada documento → sus archivos   → documentos.json
python3 archivo/bajar.py      # descarga todo (reanudable)       → archivo/bin, manifiesto.json
python3 archivo/extraer.py    # PDF/RAR/ZIP/HTML → texto          → expediente/texto, paginas
python3 archivo/indexar.py    # índice navegable                  → expediente/INDICE.md
```

Las trampas del SEIA —el listado que llega por AJAX, los documentos sin PDF, la codificación
ISO-8859-1— están en [`archivo/LEEME.md`](archivo/LEEME.md).

**Pendiente:** 268 páginas son imágenes y siguen sin extraer. Están señalizadas en el texto como
`===== p.N · sin texto =====`. La que más pesa es `ORD_2132_SAG`, un pronunciamiento con
observaciones que está entero en imagen. Cómo lanzar el OCR:
[`expediente/PENDIENTE-OCR.md`](expediente/PENDIENTE-OCR.md).

## Estructura

```
src/                  las fuentes de las dos páginas (ver CLAUDE.md)
  plantilla.html      HTML, CSS y script de la principal
  v3d.js · v3d2.js    visores 3D del terreno y del subsuelo
  shader.js           GLSL del terreno
  datos.json          los datos que se incrustan en la página
  plazos.html         la página «Qué puede pasar»
  social.html         Open Graph y datos estructurados
  social-img.html     plantilla de social.jpg
build.py              arma las dos páginas, el JSON-LD y el sitemap
proyecciones.py       series de masa, metano y camiones desde el Capítulo 1
reordenar.py          cambia el orden de las secciones y renumera
lee.py                extrae texto de un PDF (PyMuPDF)
archivo/              scripts que bajan y extraen el expediente
expediente/           el archivo del expediente, en texto
docs/                 hallazgos verificados, fuentes y auditorías
fonts/ · lib/         fuentes autohospedadas y Three.js r128
*.png · *.jpg · *.webp  rásters de los mapas y visores, con variantes WebP
llms.txt              resumen de los hechos y sus fuentes, para asistentes de IA
CLAUDE.md             contexto completo para iterar con Claude Code
```

## Documentos de trabajo

- [`docs/hallazgos.md`](docs/hallazgos.md): lo verificado contra el expediente, publicado y sin publicar.
- [`docs/fuentes.md`](docs/fuentes.md): de dónde sale cada dato externo y cómo volver a bajarlo.
- [`docs/auditoria-2026-10-21.md`](docs/auditoria-2026-10-21.md) y
  [`docs/auditoria-ux-2026-10-21.md`](docs/auditoria-ux-2026-10-21.md): auditorías de información,
  accesibilidad, rendimiento y diseño, con lo hecho y lo pendiente al inicio de cada una.

## Antes de cambiar algo

Lee [`CLAUDE.md`](CLAUDE.md). Varias cosas que parecen arbitrarias resuelven un problema concreto:
el orden de las secciones, la separación tipográfica entre cifras y voz, las trampas del build y
de los visores, y la regla de verificar toda cifra nueva contra el texto original del expediente.

Antes de publicar falta completar la **firma** en el pie de la página (`.firma` en
`src/plantilla.html`).

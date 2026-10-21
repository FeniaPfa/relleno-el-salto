# Expediente COSEMAR El Salto

Análisis geoespacial independiente del Estudio de Impacto Ambiental del proyecto
«Centro Metropolitano de Gestión Integral de Residuos» (COSEMAR SpA), El Salto,
Viña del Mar. Expediente SEIA **2168892026**.

**→ <https://feniapfa.github.io/seia-data/>**

Todo sale de los documentos que el propio titular presentó al SEIA, de cartografía suya
reproyectada desde EPSG:32719, de OpenStreetMap y de imágenes Sentinel-2. Cada sección declara
su fuente, su método y sus límites.

## Construir

```bash
python3 build.py        # src/ → index.html
```

Sin dependencias ni build system. La única librería externa es Three.js, desde cdnjs.
`index.html` es generado: edita `src/`.

## Estructura

```
index.html          generado, lo sirve GitHub Pages
src/                las fuentes
build.py            arma index.html
reordenar.py        cambia el orden de las secciones y renumera
lee.py              extrae texto de un PDF (PyMuPDF)
docs/               hallazgos verificados y fuentes
expediente/texto/   73 documentos del expediente en texto, base de verificación
CLAUDE.md           contexto para iterar con Claude Code
```

## Antes de cambiar algo

Lee `CLAUDE.md`. Varias cosas que parecen arbitrarias resuelven un problema concreto: el orden
de las secciones, la separación tipográfica entre cifras y voz, y las trampas del build.

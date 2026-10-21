# Contexto del proyecto

Análisis geoespacial independiente del EIA del relleno sanitario **COSEMAR** en El Salto,
Viña del Mar. Expediente SEIA **2168892026**. La participación ciudadana cierra el
**3 de noviembre de 2026**.

Sitio estático publicado en GitHub Pages: <https://feniapfa.github.io/seia-data/>

## Objetivo, y el criterio con el que se decide todo

Que una vecina entienda qué consecuencias tiene el proyecto y pueda **ingresar una observación
fundada** que el titular deba responder en la Adenda.

La prueba para cualquier contenido nuevo es: **¿de aquí sale algo que el titular tenga que
responder?** Si solo produce indignación, no entra.

El activo de esta página es que **no se puede descartar como activismo**: casi todo sale de los
propios documentos del titular. Cuidar eso vale más que cualquier cifra adicional.

## Cómo se construye

```bash
python3 build.py        # src/ → index.html (valida sintaxis con node si está)
```

`index.html` es **generado**: no lo edites a mano, se sobreescribe. Edita `src/`.

| archivo | qué es |
|---|---|
| `src/plantilla.html` | HTML, CSS y el script principal. Contiene `/*__DATOS__*/` y el marcador de empalme `})();\n</script>` |
| `src/v3d.js` | visor 3D del terreno (Three.js r128, controles de órbita propios) |
| `src/v3d2.js` | visor del corte del subsuelo, con plano de recorte y secciones geofísicas |
| `src/shader.js` | GLSL: tinte hipsométrico, sombreado de dos luces, fbm, curvas de nivel por `fwidth`, bilineal manual sobre el heightmap empaquetado |
| `src/datos.json` | el bundle completo (~255 KB), se inyecta en el marcador |
| `src/social.html` | etiquetas Open Graph; `{url}` lo reemplaza build.py |

`reordenar.py` cambia el orden de las secciones y renumera en una pasada:

```bash
python3 reordenar.py admite terreno mapa incendio subsuelo falla escorrentia vial pluma influencia proyecciones paisaje cuenca pronunciamientos
```

`lee.py` extrae texto de un PDF con PyMuPDF.

## Restricciones y trampas conocidas

- **`index.html` ya no es un fragmento.** Se escribió para el envoltorio de los artifacts de
  Claude (que inyecta doctype, head y un reset). `build.py` lo envuelve ahora. Si alguna vez
  vuelves a publicarlo como artifact, hay que quitar ese envoltorio.
- **Ya no aplica la CSP de los artifacts.** En Pages se puede usar cualquier CDN, hacer fetch y
  cargar imágenes externas. Varias decisiones del código son herencia de esa restricción:
  los basemaps son rásters horneados y reproyectados a mano, y los datos van incrustados.
- **Tres scripts se empalman en un solo IIFE.** `shader.js` entra dentro de `v3d.js` en el ancla
  `function hWorld(...)`; luego `v3d.js` y `v3d2.js` entran en `plantilla.html`. Por eso
  comparten ámbito con `D`, `L`, `$`, `el`, `bboxOf`. **Si olvidas empalmar `v3d2.js` el sitio
  queda sin el visor del subsuelo y nada falla visiblemente** — ya pasó una vez.
- **Colisión de clases CSS:** `.barra` fue usada a la vez para la barra fija de acción y para la
  barra estratigráfica del subsuelo; la segunda anulaba a la primera. La estratigráfica se llama
  ahora `.pila`. Cuidado al nombrar clases nuevas.
- **Variables de ámbito en `ubicarMarcas()`:** un `var` declarado dentro de un callback de
  `forEach` no existe en el siguiente. Ya rompió los rótulos del 3D una vez.
- **Dos secciones remiten al visor del terreno** («actívalo como capa en el visor 3D del
  comienzo»): `incendio` y `cuenca` deben ir después de `terreno`.
- **Una `ShapeGeometry` tumbada al plano XZ queda mirando hacia abajo.** La forma vive en XY;
  al mapear (x,y)→(x,·,y) se invierte el giro de cada triángulo y el renderer descarta la cara.
  La tapa de la masa de residuos estuvo invisible así durante semanas sin que nada fallara.
  Hay que invertir el índice (ver `dibujarMasa`) o usar `DoubleSide`.
- **`reordenar.py` apunta a `web/plantilla.html`**, ruta que ya no existe: hoy es `src/`.

## Verificación visual sin abrir el navegador

Chrome headless con SwiftShader renderiza el WebGL. Dos trampas: la captura se toma al
`load` de la página, antes de que el visor pinte, así que hay que retrasar el `load` (una
imagen desde un servidor que demora unos segundos); y si se lanzan varias capturas en
paralelo contra `python3 -m http.server`, `altura.png` puede no cargar y el terreno sale plano.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1500,1150 --timeout=30000 --screenshot=cap.png http://127.0.0.1:8765/envoltorio.html
```

El envoltorio es un HTML con un `<iframe src="index.html">` que, tras cargar, hace
`scrollIntoView` sobre `#cv`, y puede pulsar `#b-sat` o mover `#tl` desde `contentDocument`.

## Rendimiento: el pendiente más importante

Antes del primer cuadro 3D el navegador baja unos **2,1 MB**. En celular con datos móviles eso
decide si la persona lee o se va. En orden de impacto:

1. **Atar el visor 3D al scroll** (Scrollama, 2 KB). Hoy hay un botón «▶ Recorrido» que nadie
   aprieta. Es la mejor razón impacto/esfuerzo que queda.
2. **Partir `datos.json` por sección** y cargarlo bajo demanda.
3. **`fondo.jpg` y `paisaje.jpg` a WebP** (~300 KB menos).
4. Compartir un renderer entre los dos contextos WebGL.

## Verificación

`expediente/texto/` tiene 73 documentos del expediente extraídos a texto plano: es la base con la
que se verificó cada cifra. Los PDF originales (1,7 GB) no están en el repo; las URL de descarga
están en `docs/fuentes.md`.

**Antes de publicar cualquier cifra nueva, verifícala contra el texto original, no contra un
resumen.** Varias afirmaciones plausibles no sobrevivieron ese paso.

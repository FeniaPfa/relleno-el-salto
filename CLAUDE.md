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

`index.html` y `que-puede-pasar.html` son **generados**: no los edites a mano, se
sobreescriben. Edita `src/`.

La segunda página —el recorrido del expediente y sus desenlaces— sale de `src/plazos.html`.
Es estática: no usa `datos.json` ni los visores, así que lo único que recibe del build es el
bloque de variables de color, inyectado en el marcador `/*__TOKENS__*/` desde
`src/plantilla.html`. **Eso existe para que la paleta no pueda divergir entre las dos
páginas**: si cambias un color, cámbialo sólo en `plantilla.html`.

| archivo | qué es |
|---|---|
| `src/plantilla.html` | HTML, CSS y el script principal. Contiene `/*__DATOS__*/` y el marcador de empalme `})();\n</script>` |
| `src/v3d.js` | visor 3D del terreno (Three.js r128, controles de órbita propios) |
| `src/v3d2.js` | visor del corte del subsuelo, con plano de recorte y secciones geofísicas |
| `src/shader.js` | GLSL: tinte hipsométrico, sombreado de dos luces, fbm, curvas de nivel por `fwidth`, bilineal manual sobre el heightmap empaquetado |
| `src/datos.json` | el bundle completo (~255 KB), se inyecta en el marcador |
| `src/social.html` | etiquetas Open Graph; `{url}` lo reemplaza build.py |
| `src/plazos.html` | la vista «Qué puede pasar»: mapa del procedimiento y sus desenlaces |

`proyecciones.py` regenera las series de masa, metano y camiones desde la tabla de producción
anual del Capítulo 1. **No está conectado al build**: escribe `data/proyecciones.json` y sus
valores se copiaron a mano a las claves `proy` y `vial` de `src/datos.json`. Si lo vuelves a
correr, propaga el resultado a esas dos claves o la página seguirá mostrando lo anterior.

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

### Dos trampas que ya mordieron

**1. Medir distancias vértice a vértice.** Varios polígonos del expediente y de la SMA son muy
gruesos: el Sitio Prioritario trae **35 vértices** de origen, a escala 1:50.000. Comparar sólo
los vértices de dos polígonos sobreestima la distancia — en ese caso daba 337 m donde la
distancia real borde a borde es **255 m**, un 32 % de más. Usa siempre `shapely`:
`a.buffer(0).distance(b.buffer(0))`. Con receptores, que son puntos, la diferencia es menor
(3–15 m), pero entre polígonos cambia la conclusión.

**2. Series derivadas de una rampa inventada.** `proyecciones.py` calibraba una **rampa lineal**
para integrar las 30.741.988 t declaradas. El total salía exacto, así que nada fallaba a la
vista — pero los extremos no: daba 4.238 t/día en el año 25 donde la tabla de producción anual
del **Capítulo 1, p.71** declara **4.460** (y 2.466, no 2.500, en el año 1; las 2.500 son la
tasa de *diseño*). De ahí salían mal los camiones, los viajes/hora y el porcentaje de la losa de
lavado, mientras el texto de al lado ya citaba el 4.460 correcto. La tabla real crece ~2,5 %
anual y está ahora escrita en `proyecciones.py`.

**La lección común:** cuando una cifra agregada cuadra, no asumas que la serie que la produce
cuadra. Verifica los extremos.

## El archivo del expediente

`expediente/` es una copia de todo lo que el SEIA publicaba del expediente 2168892026:
60 documentos, 97 adjuntos, 4.335 páginas de PDF más 42 documentos que en el SEIA **sólo
existen como página web**. Se archiva porque el expediente es un sitio que el servicio
puede cambiar o retirar. Empieza por [`expediente/INDICE.md`](expediente/INDICE.md).

Al repositorio va sólo el texto (29 MB). Los binarios (1,5 GB) no caben;
`expediente/manifiesto.json` guarda URL, tamaño y SHA-256 de cada uno para rebajarlos y
comprobar que son los mismos. Los scripts que lo reconstruyen están en `archivo/`, con
las trampas documentadas en [`archivo/LEEME.md`](archivo/LEEME.md).

**Hay un pendiente abierto:** 268 páginas son imágenes sin capa de texto y siguen sin
extraer. Están señalizadas en el texto como `===== p.N · sin texto =====`, y
[`expediente/PENDIENTE-OCR.md`](expediente/PENDIENTE-OCR.md) lista cuáles son, cuáles
importan y cómo lanzarlo. Lo que más pesa ahí es `ORD_2132_SAG`, un pronunciamiento con
observaciones que está entero en imagen.

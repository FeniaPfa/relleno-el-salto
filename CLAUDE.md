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

`index.html`, `observaciones.html`, `especies.html`, `relato.html` y `tramite.html` son **generados** (y `que-puede-pasar.html`, que solo redirige a `tramite.html`: fue el nombre anterior): no los edites a mano, se
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
| `src/social.html` | etiquetas Open Graph, Twitter y JSON-LD; `{url}` lo reemplaza build.py |
| `src/social-img.html` | plantilla de `social.jpg` (1200×630). Se renderiza con Chrome headless, ver abajo |
| `src/plazos.html` | la vista «Qué puede pasar»: mapa del procedimiento y sus desenlaces |
| `src/especies.html` | las especies afectadas, una tarjeta `.esp` por especie con foto en `especies/`. `build.py` falla si una foto no existe o si hay menos créditos (`.cred`) que fotos |
| `src/observaciones.html` | las observaciones fundadas: cita textual, documento y página PDF, contradicción y pedido; se eligen y se arma un solo texto. Cada `.pide` de la principal enlaza a su `#obs-…` y `build.py` falla si el ancla no existe |

**`observaciones.html`, reglas que salieron del comité UX** (público: vecinos con poca experiencia
digital, en celular, muchos desde el navegador interno de WhatsApp):
- «Sumar a mi observación» y «Copiar» van **fuera** de todo `<details>`; estuvieron dentro y nadie
  podía elegir nada sin abrir el desplegable. Las pruebas y el texto sí van plegados.
- Copiar intenta primero `execCommand` (síncrono, dentro del toque: funciona en los WebView), después
  `navigator.clipboard`, y si todo falla deja el texto **seleccionado** con instrucciones. Nunca
  falla en silencio, y no copia si falta la población.
- La selección se guarda en `localStorage` **y** en `?e=` (el WebView puede no persistir).
- El conteo de observaciones aparece en la bajada, en la principal, en `plazos.html`, en `llms.txt` y
  en el README: si agregas una, cámbialo en todos.

`proyecciones.py` regenera las series de masa, metano y camiones desde la tabla de producción
anual del Capítulo 1. **No está conectado al build**: escribe `data/proyecciones.json` y sus
valores se copiaron a mano a las claves `proy` y `vial` de `src/datos.json`. Si lo vuelves a
correr, propaga el resultado a esas dos claves o la página seguirá mostrando lo anterior.

Los camiones **no se suponen**: salen de la flota que declara el titular en el Anexo 4.1 (carga por
camión de la Tabla 13 y viajes por año de su calculadora «Anexo D», escritos en `proyecciones.py`).
Ese script necesita la cartografía de `data/cartografia/`, que no está en el repo; el bloque de
camiones se puede correr solo. Las planillas `.xlsx` de los anexos **no están en `expediente/texto/`**:
para leerlas hay que bajar el `.rar` del SEIA (las URL están en `expediente/manifiesto.json`).

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
  ahora `.pila`. Cuidado al nombrar clases nuevas. Pasó otra vez con `.bq`: la barra de
  quemado de la tabla del incendio (110 × 10 px) encogía el encabezado del buscador del
  expediente, que ahora es `.bqh`. Antes de crear una clase, búscala con `grep -n "\.nombre\b"`. Y una tercera vez con `.seg` (segmento de la columna del
  subsuelo contra el selector «Mapa | Satélite», que ahora es `.vseg`).
- **Colisión de nombres entre los tres scripts:** comparten un solo IIFE, así que una
  `function nueva(){}` que choque con un `var` ya existente se pierde en silencio —el `var`
  la pisa al asignarse— y sólo falla al pulsar el control. Pasó con `modo`, que ya era el
  basemap carto/sat; el control de viento tuvo que llamarse `fijarViento`.
- **Los rótulos del visor se colocan por cajas reales, no por apilado.** El código
  anterior ordenaba por `y` y empujaba 18 px hacia abajo confiando en que no se
  tocaran; con 26 marcas colaba, con 115 no. Si vuelves a tocarlo, mide: recorre una
  vuelta completa comparando los `getBoundingClientRect()` de los `.tx` entre sí. El
  ancho del rótulo se mide una vez por marca (`m.wtx`) porque suponerlo fijo en 210 px
  dejaba pisarse los nombres largos.
- **Al cambiar la clase de una marca hay que invalidar `m.wtx`.** El ancho del rótulo se
  mide una vez y se cachea; `sot` y `fondo` cambian el cuerpo de letra, así que sin
  invalidarlo la caja queda obsoleta y los textos se pisan. Y `ALTO_TX` es 23, no el
  cuerpo de letra: la caja real mide algo más y dos filas contiguas se tocaban por un píxel.
- **Lo que flota sobre un visor 3D debe dejar pasar el toque** (`pointer-events:none`, salvo sus
  botones), y el contenedor `.cv` lleva el mismo `touch-action` que el lienzo. Si no, un arrastre que
  empieza cerca del borde cae sobre la ayuda o el panel de viento y mueve la página en vez del mapa.
  Y vigila el desborde horizontal a 320 px: una grilla sin `minmax(0,1fr)` o una tabla de ancho fijo
  bastan para que la página entera se deslice de lado.
- **Variables de ámbito en `ubicarMarcas()`:** un `var` declarado dentro de un callback de
  `forEach` no existe en el siguiente. Ya rompió los rótulos del 3D una vez.
- **Dos secciones remiten al visor del terreno** («actívalo como capa en el visor 3D del
  comienzo»): `incendio` y `cuenca` deben ir después de `terreno`.
- **Una `ShapeGeometry` tumbada al plano XZ queda mirando hacia abajo.** La forma vive en XY;
  al mapear (x,y)→(x,·,y) se invierte el giro de cada triángulo y el renderer descarta la cara.
  La tapa de la masa de residuos estuvo invisible así durante semanas sin que nada fallara.
  Hay que invertir el índice (ver `dibujarMasa`) o usar `DoubleSide`.
- **El pie no lleva firma**: se quitó el marcador `[nombre o colectivo · contacto]`. La fecha de
  actualización la inyecta `build.py` desde git.

## Color y tipografía: las reglas

- **Contraste medido, no a ojo.** Todo color de texto cumple 4,5:1 sobre los cuatro fondos de su modo
  (`--bg`, `--surf`, `--surf2`, `--sunk`), y `--lctl` (bordes de controles) 3:1. Si cambias un token,
  mídelo contra los cuatro: el que falla siempre es `--sunk` en claro y `--surf2` en oscuro.
- **El relato fuerza la paleta oscura** (`data-theme="dark"` en su `<html>`): sus fondos son oscuros
  fijos, y con la paleta clara el carmín quedaba a 2,3:1 sobre negro.
- **Serif solo desde 16 px.** Spectral queda para titulares, cifras y citas. Bajo 16 px va la
  condensada (`--cart`): rótulos cortos en mayúsculas con `letter-spacing:.06em`, líneas de fuente y
  cálculo en caja normal y al menos 13,5 px. Las versalitas de Spectral SC a 12–13 px medían 8 px de
  alto de letra: se retiraron, y con ellas el token `--sc` y sus dos woff2.

## Fuentes y Three.js, en el repo

Las fuentes (`fonts/`, subconjunto latino, SIL OFL) y Three.js r128 (`lib/`) se sirven desde la
misma página: no hay conexiones a terceros, el render no espera un CSS externo y el pie puede
afirmar «sin conexiones a terceros». Si se agrega un peso tipográfico nuevo, hay que bajar el
woff2 de Google Fonts con un User-Agent moderno (devuelve woff2 por rangos unicode) y declararlo
en el `@font-face` del `<head>`. Libre Franklin es variable: un archivo cubre 400 a 700.

## El relato con scroll (`relato.html`)

Publicada y enlazada desde la principal (acceso bajo el índice, botón «Recorrido narrado» del
visor y entrada del índice). Sale de `src/relato.html`: el build le
inyecta el CSS, las fuentes, el **marcado del visor** (el primer `<div class="v3">` de la
plantilla), los datos y el código del visor, así que reutiliza el visor tal cual. El relato lo
maneja con `window.VISOR` (definido en `v3d.js`): `poner` (cámara sin animar, la que usa el
scroll), `volar`, `volando`, `ojo` (la cámara que mira el relleno desde una población), `anio`,
`capa`, `troncal`, `correr` (desplaza el centro óptico para que la tarjeta no tape el sujeto).
La cámara se **interpola con el scroll** entre etapas: quieta en la primera mitad de cada una y
viajando a la siguiente en la segunda. Con la escena quieta el visor dibuja dos cuadros por
segundo y no recalcula rótulos; solo la portada y el cierre, con deriva, dibujan cada cuadro.
En la principal nadie lo llama. Cada `<section class="etapa">` declara su cámara, su año y sus
capas en atributos `data-`. **Ojo:** `.paso` ya es la cascada de la principal; por eso las etapas
se llaman `.etapa`, porque el relato hereda todo el CSS.

## SEO, buscadores con respuestas y motores generativos

- Las **preguntas frecuentes** (`<aside class="faq">` antes del pie) son la fuente única: `build.py`
  arma el `FAQPage` en JSON-LD leyendo ese HTML, así que lo que ve el buscador no puede divergir de
  lo que se lee. Toda respuesta nueva usa solo cifras ya publicadas y verificadas.
- El JSON-LD de la principal se arma en `ldjson()` de `build.py` (sitio, análisis, lugar con
  coordenadas, preguntas); `dateModified` y el `sitemap.xml` salen de la fecha del último commit.
- `llms.txt` resume los hechos con su fuente en el expediente; si cambia una cifra, cámbiala ahí.
- **El nombre del sitio y el ícono que muestra Google salen de la raíz del dominio**
  (`feniapfa.github.io`), que es un 404 de GitHub: por eso el resultado dice «GitHub Pages
  documentation» con un globo, aunque el `WebSite` y los íconos de este repo estén bien. Solo se
  arregla con el repo `FeniaPfa.github.io` o con un dominio propio; se decidió esperar (2026-10-23).
- **Las FAQ no dan resultado enriquecido** (desde 2023 Google lo reserva a sitios de gobierno y de
  salud). Se mantienen porque ayudan a leer y alimentan a los motores generativos.
- Los `<title>` se mantienen bajo ~60 caracteres: con 95, Google reemplazó el título por el h1.
- **`robots.txt` no tiene efecto aquí:** el sitio vive en `/seia-data/` y los buscadores solo leen el
  de la raíz del dominio. El sitemap hay que enviarlo a mano en Google Search Console.

## Imagen social

`social.jpg` se genera desde `src/social-img.html`, no se edita a mano. Cuando cambie una cifra
de la portada o el estado del plazo, hay que regenerarla y **cambiar la versión** en
`src/social.html` (`social.jpg?v=N`), porque WhatsApp y Facebook cachean la previsualización por URL:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --window-size=1200,630 --timeout=15000 --screenshot=/tmp/social.png \
  "file://$PWD/src/social-img.html"
sips -s format jpeg -s formatOptions 82 /tmp/social.png --out social.jpg
```

## Rásters: variantes WebP

`build.py` no las genera; se hacen con `cwebp` (Homebrew) y se versionan. El script elige WebP
si el navegador lo decodifica (`WEBP` en `plantilla.html`) y si no, el PNG/JPG original:

```bash
cwebp -q 75 -resize 1024 1024 textura.jpg -o textura-1024.webp   # satélite para celular
sips -z 1024 1024 -s format jpeg -s formatOptions 75 textura.jpg --out textura-1024.jpg
cwebp -q 70 fondo.jpg -o fondo.webp
cwebp -lossless -exact cicatriz.png -o cicatriz.webp              # con alfa: sin pérdida
cwebp -lossless -exact cuenca.png -o cuenca.webp
for f in ert/ert*_c.png; do cwebp -q 80 "$f" -o "${f%.png}.webp"; done
```

`cicatriz`, `cuenca` y la primera sección ERT se piden recién cuando su figura se acerca a la
pantalla (`difiere()`); `textura` se carga a 1024 px salvo en lienzos de más de 1200 px reales.

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

**Para ver la página a ancho de celular, fija el ancho del iframe (390 px) dentro de una ventana
de 600.** Chrome no abre ventanas de menos de ~500 px: con `--window-size=390` el viewport real
queda más ancho y la captura sale recortada por la derecha, lo que parece un desborde de la
página sin serlo.

Los rótulos de los mapas y gráficos SVG se reescalan en pantallas chicas (`escalaTexto`): ningún
texto baja de 12 px reales, y los que al crecer chocan entre sí o se salen del lienzo se ocultan.
En escritorio no interviene.

## La principal en celular: decisiones del comité UX (2026-10-23)

- **Un solo destino rojo: armar la observación.** El recuadro del plazo, el bloque tras los hallazgos,
  el botón principal de «Cómo se ingresa» y la barra fija llevan a `observaciones.html`, no al
  formulario del SEA: ir al SEA sin texto copiado termina en abandono. El SEA queda como botón
  secundario, después de armar.
- **La barra fija `.barra-cta`** tiene un solo botón y aparece solo cuando el recuadro del plazo ya
  salió de pantalla; se esconde sobre `#observar` y el pie. Su alto real (`--barra-h`, por
  `ResizeObserver`) reserva el espacio de abajo y el `scroll-padding`, porque con letra grande del
  sistema llegó a medir 167 px.
- **El acceso al relato** va después de los hallazgos, con botón de contorno, y su fondo es
  `relato-cta.webp` (34 KB), no la textura de 605 KB.
- **Pendientes que el comité dejó** (requieren reestructurar, van en otro PR): cargar Three.js y los
  dos visores solo al acercarse (hoy el script síncrono retrasa ~10 s todo en 3G); crear el visor del
  subsuelo con `difiere` y manejar `webglcontextlost`; plegar el desarrollo de cada sección en
  celular; reencuadrar los mapas SVG a 4:5; póster estático del visor 3D en celular.

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

**`expediente/` es solo el expediente 2168892026.** Precedentes de otros proyectos (el fallo de la
Corte Suprema sobre el relleno Santa Inés de Alto Hospicio, rol 112.449-2020) y normas (D.S. 189/2005)
se citan con su enlace en el texto que los usa, siempre atribuidos a su caso; **no se descargan dentro
del repo**. Si hace falta leer uno, va a una carpeta temporal y se borra al terminar.

### Trampas que ya mordieron

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

**3. Páginas de PDF.** Los marcadores `===== p.N =====` de `expediente/texto/` cuentan desde 0:
la página del PDF (la de `#page=`) es N+1, y no coincide con el folio impreso (en el Capítulo 1 la
tabla de producción está en el PDF p. 72, folio 62). `observaciones.html` cita siempre la del PDF.

**4. Dos clasificaciones de especies.** La línea de base de fauna (Cap. 3.11) pone a la culebra de cola
larga como Vulnerable citando el Reglamento de la Ley de Caza (DS 5/1998 MINAGRI); el Capítulo 5 y los PAS
usan la clasificación oficial del RCE (DS 16/2016 MMA): Preocupación menor. Parecía una contradicción del
expediente y no lo era. **La categoría de una especie es la del RCE**; antes de llamar «contradicción» a dos
cifras distintas, mira qué norma cita cada una.

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

## Fotos de especies (`especies/`)

Solo fotos con licencia **CC0, dominio público, CC BY o CC BY-SA**, verificada en la fuente de cada
foto, no en la de la especie: en Commons, `extmetadata` de la API; en iNaturalist,
`api.inaturalist.org/v1/observations/<id>` y el `license_code` de *esa* foto (una misma observación
mezcla licencias, y muchas son NC o «todos los derechos»). El crédito va en el `figcaption.cred` con
autor y licencia enlazados. Se convierten a WebP de ~900 px de ancho (`cwebp -q 58 -resize 900 0`)
con `width` y `height` reales en el `<img>`, que va con `loading="lazy"`.

# Auditoría de entrega de información y accesibilidad

Fecha: 21 de octubre de 2026, sobre `main` en `c06bc9c`. Cuatro revisiones independientes
(entrega de información, accesibilidad WCAG 2.2 AA, rendimiento en celular, compartibilidad y
robustez), cruzadas y deduplicadas. Toda referencia `plantilla:N` es a `src/plantilla.html`.
Los hallazgos marcados **[verificado]** se comprobaron dos veces, por el agente y por separado.

## Estado al 21 de octubre (rama `auditoria-2026-10-21`)

**Hecho:** 1, 3, 5, 6 (primer corte: pan-y, nombre, teclado, botones), 7 (variantes WebP y
diferido; faltan fuentes autohospedadas y three.js local), 8 (formato y peso en enlaces;
faltan los 21 `href` de las tarjetas), 9, 10 (parcial: botadero, falla, polar, contador del
visor; faltan espesores y universos de poblaciones), textos modelo (2), glosario, pausa de
animaciones, contraste, barra fija en móvil, impresión, noscript, JSON-LD, robots y sitemap.

**Hecho después:** petición explícita en todas las secciones, Cap. 3.8 y PREMVAL en «admite»,
citas enlazadas (las del Resumen Ejecutivo, Cap. 2, 3.8, 9 y 14 van a la ficha del expediente
porque el listado del SEA es dinámico y no expone la URL del archivo), fuentes y Three.js en el
repo, `reordenar.py` corregido.

**Pendiente:** firma real en el pie (placeholder), reorden de secciones (decisión editorial;
`reordenar.py` ya funciona), `visores.js` diferido, OG por sección, unificar espesores y
universos de poblaciones en el texto.

## Diez cosas primero

Ordenadas por impacto sobre el objetivo de la página: que una vecina entienda y presente una
observación que el titular deba responder.

| # | Qué | Por qué | Esfuerzo |
|---|---|---|---|
| 1 | **Corregir la previsualización social** [verificado]: `src/social.html:8` y el texto horneado en `social.jpg` dicen «casas a 820 metros»; la página dice 676 m (`plantilla:643`). | Es lo único que lee quien recibe el enlace por WhatsApp y no abre. Contradice la página. Después, purgar caché en Facebook Debugger y versionar la URL de la imagen (`social.jpg?v=2`). | 30 min |
| 2 | **Textos modelo de observación, copiables**, en `#observar` y al pie de cada sección que los sustenta. Hoy solo `falla` y `proyecciones` dicen qué pedir. | Es la brecha más grande entre el objetivo y lo entregado. Ver los tres modelos al final. | 2 h |
| 3 | **Texto de mapas y gráficos legible en celular.** Los rótulos van en unidades del viewBox y a 375 px miden 3,8 a 4,6 px (`plantilla:134, 197, 459, 469`). | El público llega por celular y no puede leer ni un nombre en los mapas. | 3–4 h |
| 4 | **Firmar la página**: autor, contacto, fecha de publicación y actualización, licencia, enlace al repo, en el footer (`plantilla:1502–1519`). | «No se puede descartar como activismo» exige que alguien firme. | 1 h |
| 5 | **Cuenta regresiva** [verificado]: `plantilla:1532` fija el fin a las 00:00 del 3 de noviembre; ese día marca «0 días» con el plazo abierto, y después queda en «0 días» para siempre. | Estados: «N días», «último día», «cerrado» con qué viene (Adenda, nuevo período si cambia el proyecto). | 1 h |
| 6 | **Visores 3D**: `touch-action:none` atrapa el scroll en dos lienzos de 340 px en celular (`v3d.js:523`, `v3d2.js:296`); sin zoom táctil, sin teclado, sin nombre accesible. | Cambiar a `pan-y`, botones girar y acercar, `role="img"` con `aria-label`, flechas en `keydown`. | 1,5 h el primer corte |
| 7 | **Rásters**: `textura.jpg` 1,78 MB a 2048 px para un lienzo de 780 px; `fondo.jpg` 513 KB al arrancar; `cicatriz`, `cuenca` y `ert01_c` se bajan al arrancar siendo secciones 5, 14 y 6. | Arranque de 1,46 MB a unos 0,95 MB; satélite de 1,78 MB a 0,34 MB. | 2–3 h |
| 8 | **Fuentes de cifras sin enlace**: 21 citas bajo tarjetas sin `href`; 11 enlaces a `.rar` (hasta 94 MB) sin peso ni aviso; las fuentes viven dentro de los `h2` (15 casos) [verificado]. | Trazabilidad usable en celular y navegación por títulos en lector de pantalla. | 2 h |
| 9 | **Estructura**: sin `<main>`, sin `<nav>`, la sección inicial sin `h2` [verificado]; tablas apiladas en móvil sin `data-th` en `#tbl-fuego` (`plantilla:2633`) y `#tbl-barrera` sin `th`. | En celular «cero menciones de red húmeda» llega como «0 / 0». | 1,5 h |
| 10 | **Unificar cifras**: 820/676 m; Botania 2,79 vs 3,23 km; carga por camión 10 t (visor) vs 14 t (gráfico); espesor 80/54/60/59,9 m; falla a 500 o 600 m; 14 vs 12 comunidades en el polar. | Cada par es un flanco. Ver la lista completa abajo. | 2 h |

## 1. Entrega de información

### Accionabilidad por sección

5 = afirmación del titular contra el titular y dice qué pedir; 1 = análisis propio que el
titular responde con «ya lo modelamos».

| sección | afirmación central | pts | mejora |
|---|---|---|---|
| hallazgos | 21 receptores del titular, el más cercano a 676 m | 3 | Cerrar con una frase puente hacia las observaciones. Quitar «El aire ya está casi lleno» (`:660`), única frase editorial. |
| admite | 23 causales, 1 significativa, 4 páginas de seguimiento | 4 | Sumar el segundo impacto significativo del Cap. 3.8 (`texto/CAP38…:5626`): «1 según el Cap. 5, 2 según su propio Cap. 3.8». |
| terreno | 80 m (Tabla 40) vs 54 m (capacidad ÷ superficie) | 2 | La pregunta se pierde entre 192 palabras de método (`:841–850`). Nota a `<details>` y formular la petición. |
| mapa | sin frase central; lo fuerte está en la nota: «El relleno no es vecino del Sitio Prioritario: entra en él» (`:902`) | 3 | Subirlo a primera frase. La tabla de distancias es la pieza más citable: ponerle «cómo citar esta fila». |
| incendio | 99,7 % quemado; lixiviados 100 % | 4 | Formular: qué red húmeda, reserva y brigada compromete. Dos notas de dNBR casi idénticas (`:967`, `:995`). |
| subsuelo | 15–40 m de maicillo; el titular admite infiltración | 3 | Pregunta no escrita: monitoreo de aguas subterráneas bajo el vaso. Verificar la atribución de la cita (`:1033` dice informe hidrogeológico; el texto está en Cap. 4). |
| falla | falla potencialmente activa, 6,8 Mw, 49,5 % g | 5 | Modelo a copiar. |
| escorrentía | 120 recorridos propios al Marga-Marga | 2 | La nota admite que el titular ya modeló esto. Reemplazar el eje por los datos del titular verificados sin publicar: un solo día de muestreo, coliformes 2.400 contra norma 1.000, informes «no puede ser presentado ante la SMA». |
| vial | 182 viajes sin carga vs 2.466 a 4.460 t/día | 4 | Párrafo «qué pedir»: camiones por año, carga, rutas urbanas, derrames en ida. |
| pluma | 14 al norte; el viento del titular sopla al norte | 2 | Reducir a la geometría defendible o pedir las concentraciones del Anexo 4.4 por unidad. |
| influencia | AI de 3.487 ha, 2 dentro, 24 fuera | 4 | Decide si la lectora es parte afectada. Petición: «que se me incluya en el AI». Cita textual del Cap. 2. |
| proyecciones | el gas sigue 35 años tras el cierre | 4 | Abrir con lo que es del titular (104,8 M m³, 75 % captación, 20 años post-cierre) y LandGEM como contraste. |
| paisaje | un solo fotomontaje, de cierre | 4 | Petición obvia: fotomontajes de operación. Sumar «Cap. 3.15 sin Etapa 4». |
| cuenca | 15 de 16 ven el macizo | 3 | Fundir con paisaje. «No obstruye vistas relevantes» necesita página. |
| pronunciamientos | 19 de 25 con observaciones | 2 | No dice qué objetó nadie. Una línea textual por oficio clave (Salud, SERNAGEOMIN, DGA, MMA, MINVU). |
| observar | 5 pasos | 3 | Sin texto modelo. Falta cerrar el circuito: observación → ICSARA → Adenda. |

### Orden propuesto

Quien lee tres secciones hoy recibe cifras, el embudo y un visor con la pregunta enterrada.
Las dos secciones con mejor pregunta (falla, influencia) llegan en las posiciones 7 y 11.

hallazgos → admite → **influencia** → **falla** → vial → terreno → mapa (o fundido en terreno)
→ incendio → subsuelo → proyecciones → paisaje+cuenca → pluma+escorrentía → pronunciamientos
→ observar. Respeta que incendio y cuenca van después de terreno. `reordenar.py` necesita
antes la corrección de ruta (`web/` → `src/`).

### Lo verificado sin publicar, por fuerza de la pregunta

1. Segundo impacto significativo del Cap. 3.8 (ruido): contradice al Cap. 5. A `admite`.
2. PREMVAL sin resolver por admisión propia (Cap. 9 y 14; ZEU 2 prohíbe rellenos).
3. Calidad de agua un solo día, coliformes 2.400 vs 1.000, informes no presentables ante la SMA. Reemplaza al D8 en `escorrentía`.
4. Hueco 45–55 en CONESA: 0 de 143 registros en el umbral.
5. 48 años, no 25. A `proyecciones`.
6. Cap. 3.15 sin Etapa 4. A `paisaje`.
7. Compostaje sin emisiones de proceso; 75 % de abatimiento «conservador».
8. 13 plantas a rescatar de 173 amenazadas.

### Contradicciones de cifras (archivo:línea)

1. **820 vs 676 m**: `social.html:8` vs `plantilla:643`.
2. **Botania 2,79 vs 3,23 km**: «al deslinde» en distancias y polar; «al botadero» en `influencia` (`:1320`, `:2313`), que es a la zona de disposición.
3. **Vocabulario**: perímetro (`:643`), deslinde (`:919`), zona de disposición (`:920`), botadero (`:1320`, `:2116`, `:2313`). «Botadero» es palabra de campaña.
4. **Rumbos**: «desde el deslinde» (`:1290`) vs «desde el centroide» (`:1298`).
5. **Cuántas poblaciones**: 21 (`:642`), 14 (`:1270`), 16 (`:1428`), 26 (`:1310`), «las otras quince» (`:2581`). Cuatro universos sin explicar.
6. **Carga por camión**: 10 t en el contador del visor (`v3d.js`, `proy.carga_camion_t`) vs 14 t en «tres cifras». `hallazgos.md:34` tiene 179–303, que ya no coincide.
7. **Espesor**: 80 y 54 (`:767`), 60 (`:1354`, `:1429`), 59,9 (`:2134`). Dos huellas (45 vs 51 ha). Con densidad 1,0 t/m³, 30,7 Mt no caben en 24,3 Mm³: eso es una pregunta para el titular.
8. **24,3 millones de m³ vs 30,7 millones de t** sin una línea que los relacione.
9. **Falla a 600 vs 500 m**: `:737` y `:1082` dicen 600; `:1109` reconoce 500 o 600. El Cap. 3.5 trae ambas.
10. **Sitio Prioritario**: 3,79 ha (`:899`) y 3,85 ha (`:901`); el mismo hecho dos veces en `admite` (`:731`, `:748`).
11. **Polar**: texto dice 14 comunidades, la lista muestra 12 (`:2443` corta en 12). El pie cita a Argentina, que no está en la lista.
12. **«casi todo el año»** (`:643`): la página nunca da la frecuencia del viento.
13. **Horizonte del gas**: 35 más, 60, 70, 20 años (`:1341`, `:2116`, `:1385`, `:1386`) sin una frase que los ordene.

## 2. Accesibilidad (WCAG 2.2 AA)

Confirmado con axe-core 4.10 en headless: `color-contrast` (16 nodos), `landmark-one-main`,
`region` (142 nodos fuera de landmarks). Lo demás, revisión manual con mediciones.

**Crítico**
- Texto de mapas, gráficos y canvas de 3,8 a 8,8 px en celular (1.4.4). Escalar `font-size` por `viewBox.width / clientWidth` al redimensionar, o rótulos HTML posicionados como las `.marca` del 3D.
- Visores 3D: sin rol ni nombre, sin foco, sin teclado, zoom solo con rueda, arrastre sin alternativa (2.5.7), `touch-action:none` atrapa el scroll (2.1.1, 1.1.1, 4.1.2).

**Alto**
- `#tbl-fuego` sin `data-th` (`:2633`); `#tbl-barrera` sin `thead` ni `th` (`:1078`, `:2515`) (1.3.1).
- Animaciones automáticas sin pausa y sin leer `prefers-reduced-motion` en JS (2.2.2, 2.3.3): pluma, escorrentía, arcos, camiones. Botón «Pausar simulación» en `.v3bar` y arrancar apagado si el sistema lo pide.
- Enlaces dentro de `h2` (15), `target=_blank` sin aviso (25), `.rar` directo (11), PDF sin peso (2.4.4, 2.4.6).
- Sin `main`, `nav`, `h2` en la primera sección (1.3.1, 2.4.1). Un índice bajo la cabecera con «Cómo observar» primero.
- Contraste: `.lit.sig` en tema oscuro 2,5:1 (`:543–544`); `.seg i` sobre maicillo 3,0 (`:490`); «días» 4,2 (`:83`); `.mx .x` 2,6 (`:179`); «límite del área de influencia» 2,3 (`:2300`); `.atrib` y `.escala` sobre terreno; bordes de `.tg` 2,8 (1.4.3, 1.4.11).

**Medio**
- Tooltips solo con `mouseenter` para 188 receptores (`:1690`, `:2015`).
- Lista polar marca «en la pluma» solo con color (1.4.1).
- Botones ERT «01…11» con nombre ambiguo; símbolos ▶ ❚❚ leídos literalmente; `#tl` sin `aria-valuetext`.
- Lenguaje: 22 frases de más de 35 palabras; sin definir titular, Adenda, lixiviados, PAS, WRF, GCL, dNBR, AI, cota, literal. Cero `<abbr>`.
- Sin barra fija de acción en móvil (el comentario en `:238` la promete); el formulario exige ClaveÚnica y solo se dice en `:1486`.
- `.pila` recorta texto ya al 100 % (`:484`, `:486`).

**Bajo**: 45 objetivos bajo 24 px (`.src a`), `title` en div (`:664`), «19con observaciones» sin espacio (`:1467`), `th` sin `scope`, tamaños en px (no `rem`), `alt` del fotomontaje incompleto, `lang="es"` mejor `es-CL`.

## 3. Rendimiento en celular

Medido en el repo y en el sitio vivo. Tiempos estimados con 3G a 1,5 Mb/s y 300 ms de RTT.

| Recurso | Transferido | Cuándo |
|---|---|---|
| `index.html` | 125 KB gzip (datos incrustados: 61 KB de eso) | 0 |
| Fuentes | 13 woff2, 246 KB, CSS externo bloqueante | al maquetar |
| three.min.js | 121 KB br, síncrono en `body`, el scanner lo ve tarde | al llegar a la línea |
| `altura.png` | 248 KB, se decodifica dos veces (`v3d.js:472`, `v3d2.js:385`) | arranque |
| `fondo.jpg` | 513 KB | arranque, 4 mapas |
| `cicatriz.png`, `cuenca.png`, `ert01_c.png` | 142 + 22 + 174 KB | arranque, aunque son secciones 5, 14 y 6 |
| `textura.jpg` | 1.780 KB a 2048 px | botón Satélite |

Arranque real: **1,46 MB** antes del primer cuadro 3D. Texto visible a 2,5 s en 3G, primer mapa a 9 s, 3D a 10 s. En 4G manda la CPU: 1 a 1,6 s de hilo bloqueado en un Android medio.

Plan en orden de ahorro:
1. Rásters: `textura` a 1024 px WebP (340 KB), `fondo` WebP q70 (266 KB) o 1024 px por DPR, `cicatriz`, `cuenca` y `altura` WebP sin pérdida, ERT `_c` a WebP q80 (de 1.884 a 270 KB en total). Con detección de WebP y respaldo. 1–2 h.
2. Diferir cicatriz, cuenca, ERT-01 y el renderer del subsuelo con IntersectionObserver; `width`/`height` en `paisaje.jpg` y `#ert-img` (salto de 219 px); `<noscript>`. 1 h.
3. Fuentes autohospedadas con `@font-face` inline, sin las 5 caras sin uso (84 KB), `size-adjust` de respaldo. 2–3 h.
4. `preconnect` y `preload` de three.js en el `head` (10 min); después, `visores.js` cargado al acercarse a `#cv`.
5. `residencial` (27 KB gz) a `fetch` diferido; compartir `H` entre visores; 30 fps y render solo al cambiar; `antialias:false` en DPR 2; cachear rects en `ubicarMarcas`. 2 h.

Resultado esperado tras los cinco pasos: arranque 0,7 MB, texto 1,5 s, 3D 6 s en 3G.

## 4. Compartibilidad y robustez

- **Firma**: `author` es «Análisis independiente»; sin nombre, contacto, fecha ni enlace al repo en la página. Inyectar fecha con `git log -1 --date=short` desde `build.py`.
- **Cuenta regresiva**: `fin=new Date(2026,10,3)` → usar el 4 a las 00:00 y tres estados.
- **Fuentes sin enlace**: 21 citas bajo tarjetas; «Resumen Ejecutivo» y «Cap. 2» no tienen URL en `docs/fuentes.md`; «Cap. 5, p. 79» puede ir con `#page=79`.
- **`.rar`**: Anexo 1.5 Planos 93,7 MB, Cap. 3.3 90,3 MB, Cap. 3.5 49,2 MB, Cap. 3.19 35 MB. Indicar peso y formato; subir al repo el dato extraído (tabla o página) citado.
- **WebGL**: `new THREE.WebGLRenderer` sin `try/catch` (`v3d.js:24`, `v3d2.js:34`). Si falla el contexto, la excepción corta el IIFE antes de `v3d2`. Envolver y mostrar una captura estática de respaldo.
- **Chrome < 87 / Safari < 14.1**: `inset:` en `:127` y `:513` hace desaparecer las barras de 96,6 % y 99,7 %. Reemplazar por `top/left/bottom`. Añadir `-webkit-backdrop-filter`.
- **Three.js** sin `integrity`; copiarlo al repo o `integrity` + `onerror` con copia local.
- **SEO**: título «Expediente COSEMAR El Salto»; «relleno sanitario» aparece 0 veces en el texto visible, «participación ciudadana» 0. Sin JSON-LD, `robots.txt`, `sitemap.xml`. Meta description de 213 caracteres (corta a 155).
- **Open Graph**: falta `og:image:alt`, `og:image:type`, `twitter:*`. `social.jpg` 1200×630, 164 KB, cumple.
- **Sin `@media print`**: la sección «observar» imprime en negro con visores vacíos.
- **Enlaces profundos**: los 16 `id` funcionan, pero no hay botón «copiar enlace» ni OG por sección.
- **Privacidad**: sin analítica ni rastreadores. Terceros: cdnjs y Google Fonts. Declararlo.
- **Consola**: cero errores de la página en headless. Los 25 enlaces externos responden 200.

## 5. Tres observaciones modelo

Basadas solo en lo que la página ya afirma. Cada una con botón «Copiar» en `#observar` y
repetida al pie de la sección que la sustenta.

**La falla y la geomembrana**
> Soy vecina del sector [población]. El informe geológico-estructural de noviembre de 2023, encargado por el propio titular y acompañado en el Capítulo 3.5, dice que existe una «falla potencialmente activa» de la Zona de Fallas Marga-Marga «la cual compromete el cierre perimetral», con un sismo posible de magnitud 6,8 y aceleración de 49,5 % de la gravedad. El Capítulo 1 describe como barrera una geomembrana HDPE de 1,5 mm, y el Capítulo 4, que evalúa los impactos, no menciona ni la falla, ni el sismo, ni la geomembrana. Solicito que en la Adenda el titular evalúe cómo se comporta el sistema de impermeabilización basal bajo esa aceleración, y que esa evaluación tenga medida y plan de seguimiento en los Capítulos 6 y 7.

**Un solo impacto y ningún monitoreo**
> El Capítulo 5 evalúa 23 causales del Artículo 11 y reconoce una sola como significativa: la pérdida de tres especies de flora. Por eso el Capítulo 7 compromete seguimiento solo de esas plantas y el Capítulo 20 no compromete monitoreo participativo. El mismo Capítulo 5 califica perder «80,39 hectáreas» de ecosistema con su fauna como «moderado y no significativo». Durante 25 años de operación y 20 de post-cierre no habrá seguimiento obligatorio de aire, olor, ruido, lixiviados ni aguas. Solicito que el titular explique ese criterio y comprometa un plan de monitoreo de aire, olor, ruido, aguas superficiales y subterráneas y biogás, con resultados públicos, durante toda la operación y el post-cierre.

**Los camiones que no cuadran**
> El Estudio de Impacto Vial (Capítulo 3.18) modela 182 viajes de camión al día, solo para 2027 y 2028, sin decir cuánto carga cada camión. La tabla de producción anual del Capítulo 1 (p. 71) declara de 2.466 a 4.460 toneladas por día. La losa de lavado del Anexo 9.6 (PAS 141, Tabla 55) se dimensionó para 65 camiones al día. Según el mismo estudio, los camiones entran por Agua Santa, Álvarez y Viana. Solicito que el titular informe cuántos camiones ingresarán cada año y con qué carga, por qué calles urbanas, y qué medidas impiden derrames de líquidos durante el viaje cargado, que el expediente no menciona.

Una cuarta, la más personal, sale de `influencia`: «vivo en Botania, quedo 72 m fuera del área de influencia que dibujó el titular, su Tabla 11 pone casas a 676 m y su viento sopla hacia nosotros; pido que se me incluya como parte afectada».

## 6. Glosario para la primera aparición

| término | definición de una línea |
|---|---|
| titular | La empresa que presenta el proyecto, Cosemar. |
| EIA | Estudio de Impacto Ambiental: el documento que el titular presenta para que el Estado apruebe o rechace el proyecto. |
| Artículo 11 / literal | La lista de la ley de los efectos graves que obligan a hacer un EIA; cada «literal» es una letra de esa lista. |
| Adenda | El documento donde el titular responde, una por una, las observaciones del Estado y de las personas. |
| AI | Área de Influencia: el territorio donde el titular reconoce que su proyecto afecta a alguien. |
| PAS | Permiso Ambiental Sectorial: permiso específico que se tramita dentro del EIA. |
| lixiviados / percolado | El líquido oscuro que escurre de la basura cuando se pudre o se moja. |
| geomembrana / HDPE | Lámina de plástico de 1,5 mm, el espesor de una tarjeta de crédito, que separa la basura del suelo. |
| GCL | Capa de arcilla entre dos telas, de unos 6 mm, bajo la geomembrana. |
| maicillo | Granito desmenuzado, como arena gruesa, por donde el agua pasa con facilidad. |
| ERT | Tomografía eléctrica: una radiografía del subsuelo hecha con electrodos clavados en el terreno. |
| dNBR | Comparación de dos fotos satelitales, antes y después, que mide cuánto se quemó cada punto. |
| WRF / CALPUFF | Programas que simulan el viento y hacia dónde viaja lo que se emite. |
| sotavento / barlovento | Sotavento: donde el viento llega. Barlovento: de donde viene. |
| cota / m.s.n.m. | Altura sobre el nivel del mar. |
| Holoceno | Los últimos 11.700 años; una falla «activa» es la que se movió en ese período. |
| D8 | Método que sigue, celda a celda, hacia dónde bajaría el agua por la pendiente. |
| LandGEM | Calculadora pública de la agencia ambiental de EE. UU. para estimar el gas de un relleno. |
| SEA / SEIA | El servicio del Estado que evalúa, y el sistema por el que se tramita. |
| RCA | La resolución que aprueba o rechaza el proyecto. |

## 7. Plan por tandas

**Tanda 1, un día: lo que no puede esperar.** Previsualización social (1), cuenta regresiva (5), firma (4), `inset` y `try/catch` de WebGL, tablas sin encabezado, «19con», espacio en `h2`.

**Tanda 2, dos días: que la vecina salga con una observación.** Textos modelo (2), petición explícita en cada sección, reordenar (influencia y falla a 3 y 4), unificar cifras (10), incorporar Cap. 3.8 y PREMVAL, enlaces de fuentes con formato y peso (8), índice de navegación y `main`.

**Tanda 3, dos días: que se pueda leer en celular.** Texto de mapas y gráficos (3), visores 3D (6), rásters y diferidos (7), contraste del tema oscuro, pausa de animaciones, glosario con `<abbr>`, barra fija de acción, `@media print`.

**Tanda 4, cuando haya tiempo.** Fuentes autohospedadas, three.js local, `visores.js` diferido, JSON-LD y título buscable, OG por sección, service worker.

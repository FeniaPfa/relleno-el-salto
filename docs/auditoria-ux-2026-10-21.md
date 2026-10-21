# Auditoría UX y UI: impacto, legibilidad y profesionalidad

Fecha: 21 de octubre de 2026, sobre la rama `auditoria-2026-10-21`. Tres revisiones
independientes (componentes de cifra, gráficos de datos, experiencia de lectura), cruzadas.
Intención editorial declarada: **generar alerta fundada**. Criterio de todo lo que sigue: que cada
cifra y cada gráfico entreguen su alarma en tres segundos, sin perder el activo de que todo sale
del expediente.

## Diagnóstico en una página

- **La página no alarma en la primera pantalla.** Kicker «Servicio de Evaluación Ambiental»,
  h1 con el nombre comercial del proyecto, coordenadas sexagesimales, y una caja que dice
  «14 días» sin decir para qué. En celular la primera cifra (676 m) aparece a 1.130 px, en la
  pantalla 2,4. La palabra «basura» no aparece sobre el pliegue. Parece una página del SEA.
- **El rojo está gastado.** `--acc` es a la vez el color de alerta y el color de todo enlace.
  En la tarjeta «1 / 23» hay cuatro rojos: la cifra y tres enlaces a capítulos.
- **Las cifras no mandan en sus tarjetas.** En portada la cifra es el 9 % del alto de la
  tarjeta; la afirmación y la fuente, el resto. Grilla de 4 con 5 tarjetas: una huérfana.
  Nueve tamaños de cifra en la página; no hay escalones, hay valores.
- **La página es plana y larga.** 66 pantallas de celular, 47 minutos de lectura. Quince
  secciones con el mismo folio y el mismo ritmo. Lo más grave (la falla) está en la pantalla
  33; lo más largo y menos alarmante (las 23 causales) ocupa 9 pantallas al principio.
- **Los gráficos describen, no afirman.** Casi ningún gráfico lleva su cifra escrita encima.
  Dos invierten la alarma: en el área de influencia la barra más larga es la menos grave; en
  el polar se dibuja la franja ±35° que es supuesto propio y se omite el rango 0°–20° que es
  del titular.
- **La barra de 1,5 mm no existe.** La sección del subsuelo tiene un héroe de 116 px que dice
  «1,5 mm» y una barra estratigráfica que no dibuja la geomembrana.
- **Los bloques «Qué pediría una observación aquí»** son lo que produce lo que el titular debe
  responder y van con estilo de nota al pie, en gris, doce veces.

## Reglas de sistema (adoptar antes de rediseñar nada)

1. **Cuatro escalones de cifra, no nueve.** Héroe `clamp(70px,14vw,116px)`, una vez por
   página. Grande 56–60 px: portada y duelo. Media 30–36 px: tally, contadores, pila.
   Inline 22–26 px. Unidad siempre a `.4em` en `--ink2`.
2. **El rojo se gana.** `--acc` solo para una cifra que sale de un documento del titular o del
   Estado y que por sí sola funda una observación; su fuente a menos de 20 px. Un rojo por
   grupo. Los enlaces dejan de ser rojos: `a{color:inherit;text-decoration-color:var(--bistre)}`.
3. **Azul para lo que calculó esta página** (D8, LandGEM, dNBR, distancias sobre cartografía),
   con el rótulo «cálculo de esta página». Ámbar para proximidad a un umbral o dato con reserva.
   Verde para lo favorable al titular, sin miedo: es la prueba de equidad. Tinta para estados
   de control y conteos neutros.
4. **Títulos que afirman la cifra.** Cada gráfico lleva un `h3` con sujeto, número y unidad, y
   esa cifra se escribe dentro del gráfico una vez, a 20 px o más. El rótulo de método va aparte.
5. **Un color saturado por gráfico, siempre el mismo sujeto.** El relleno y lo que afecta.
   Todo lo demás en dos grises y un verde azulado apagado. El amarillo deja de significar tres
   cosas (área de influencia, salud, viento): queda para el viento.
6. **Anotación antes que leyenda.** Máximo cuatro o cinco rótulos directos por mapa, con línea
   guía y desapilado en X e Y; el resto a una lista lateral. Las referencias (90 m, 72 m, 35
   años) se cotan sobre el dibujo.
7. **Una barra solo si el resto se ve.** Nada de barras al 99,7 %.

## Plan por tandas

### Tanda A: una mañana, todo CSS y marcado, sin decisiones editoriales

**Hecha el 21 de octubre.** Decisiones tomadas al aplicarla: el 99,7 % de la portada va en azul
porque es medición satelital de esta página (regla 3), con «Medición de esta página» en su
detalle; la caja del plazo, el botón de la sección 15 y la barra fija comparten el carmín fijo
`#9c1f28`; la tarjeta de 12,4 km de escorrentía se quitó; los bloques «Qué pediría» llevan un
enlace «Cómo ingresarla →» en vez de botón de copiar, porque su redacción no siempre arranca
como solicitud.

| # | Qué | Dónde | Esfuerzo |
|---|---|---|---|
| A1 | Enlaces fuera del rojo; el rojo interactivo queda en `.btn`, `.plazo`, `.barra-cta .ir` | `a{}` en plantilla | 20 min |
| A2 | `.pide` como bloque de acción: fondo `--surf`, texto `--ink` 16 px, rótulo en versalitas rojas, botón «Copiar» | `.pide` | 30 min |
| A3 | Portada 3+2 (propuesta A): cifra a 56–60 px, afirmación de una línea con peso 500, detalle y fuente en `<details>`, mini barra con riel `--sunk` y borde, sin barra en 99,7 %; en celular una fila por cifra, cifra a la izquierda | `#hallazgos .find` | 2 h |
| A4 | `.pila` con la geomembrana dibujada: línea blanca de 1 px entre basura y maicillo con la llamada «1,5 mm, dibujada mil veces más gruesa»; anotar «24.331.032 m³» y «permeable» | `.pila` | 1 h |
| A5 | Duelo de la falla: 1,5 mm en tinta (es dato), 0,495 g en rojo (es riesgo), «frente a» horizontal legible | `.duelo` | 20 min |
| A6 | Tally de pronunciamientos con barra apilada 19·2·1·3 y el 19 más grande que los demás | `.tally` | 40 min |
| A7 | Contadores del visor a 30 px con rótulos en Fira; «Año 25» en tinta; cascada 1·1·1 a tres columnas también en celular | `.tlg`, `.cascada` | 30 min |
| A8 | Cálculos propios en azul con rótulo: escorrentía (1,5 km, 90 m), proyecciones (155, 59,9); quitar la tarjeta de 12,4 km | `.find` de esas secciones | 30 min |
| A9 | Caja del plazo en carmín fijo con texto hueso en ambos temas; cinta de peligro a filete ámbar o fuera; «Necesitas ClaveÚnica» en la caja | `.plazo`, `.cinta` | 20 min |
| A10 | Índice plegado en `<details>` en celular; numerado | `.indice` | 20 min |

### Tanda B: un día, gráficos (por impacto esperado)

| # | Gráfico | Cambio | Esfuerzo |
|---|---|---|---|
| B1 | Área de influencia `#c-filo` | Eje de distancia con el límite como línea en 0, puntos dentro y fuera, escala real 0–150 m, solo 72 y 77 en rojo, cifra escrita «6 poblaciones a menos de 150 m del borde». Tabla a `<details>` | 4 h |
| B2 | Polar `#c-polar` | Sector 0°–20° saturado («lo que declara el Anexo 4.2»), ±35° como velo «supuesto propio», Botania, Cumbres y Argentina rotuladas con línea guía, «14 de 14 a sotavento · 0 a barlovento» en el cuadrante vacío, anillos 1, 3 y 5 | 3 h |
| B3 | Escorrentía `#m4` | Esteros en gris azulado 2 px; los 120 recorridos en un color propio con el troncal a 3 px; cotas «90 m al Quilpué», «120 m al humedal», «al Marga-Marga a 1,5 km»; reencuadre; título «Los 120 recorridos terminan en el mismo estero» | 4 h |
| B4 | Incendio `#m3` | «99,7 % del predio quemado» escrito dentro del predio; rampa de un solo tono; cuatro rótulos; flecha de viento fuera del texto; tabla de anillos como barras horizontales; los ceros de medios de extinción grandes y rojos | 3 h |
| B5 | Mapa `#m1` y `#m2` | Un solo sujeto saturado; anillos 1-2-3 km; rótulos solo con distancia y desapilado en X e Y o callout lateral; dos toggles en vez de seis; achurar las 3,79 ha de solape con el Sitio Prioritario en `#m2`, que es la frase más fuerte de la sección y no tiene gráfico | 1 día |
| B6 | Vial `#c-tres` y `#t-canvas` | Tres cifras como pieza principal: etiqueta encima de cada barra (resiste 390 px), eje 0-100-200-300, línea en 65 «la losa lava 65». Canvas con camiones escalados por `fk()`, ×2,6 escrito dentro, sin slider de año | 4 h |
| B7 | Proyecciones `#c-ch4` y `#c-masa` | Ejes redondos; franja 25–60 sombreada «35 años después del cierre»; línea «cierre» en 25; la masa como silueta de 60 m junto a un edificio de 20 pisos en vez de curva de toneladas | 3 h |
| B8 | Subsuelo 3D | Leyenda de resistividad en una línea; plano de la cota 200 | 1 h |
| B9 | Fotomontaje `#fsvg` | Arrancar en «Lo que no muestra» o comparador de cortina; en celular, números en la foto y lista debajo | 3 h |
| B10 | Cuenca `#m5` | Pintar solo el suelo residencial con vista en rojo sobre relieve gris; rótulos solo bajo 100 %; «15 de 16 ven el macizo» en el mapa. Requiere intersección precalculada en Python | 1 día |

### Tanda C: decisiones editoriales (necesitan a la autora)

- **Cabecera nueva.** Kicker «Análisis independiente del expediente SEIA 2168892026 · no es
  del SEA». h1 «Un relleno de 30 millones de toneladas de basura en El Salto. Esto es lo que
  dice su propio estudio». El nombre oficial baja al subtítulo. Caja del plazo con «Se hace en
  5 minutos con ClaveÚnica». Tres cifras en una línea cada una (676 m, 99,7 %, 1 de 23) y
  «Lo más grave» con enlace a la falla.
- **Bloque «Lo más grave»** bajo la portada: tres tarjetas numeradas (falla, incendio sin red
  de agua, 1 de 23 sin monitoreo) con «Leer» y «Observar sobre esto».
- **Reorden y dos niveles**: la grilla de 23 causales y las diez tarjetas de «admite» a
  `<details>`; secciones de contexto y de profundización con h2 menor. `reordenar.py` ya funciona.
- **Camino «Hazlo en 5 minutos»**: chips para elegir un modelo en vez de cuatro seguidos;
  campos [población] y [metros] que rellenan el texto; «Copiado, ahora abre el formulario»
  persistente; enlace a cómo obtener ClaveÚnica; la barra fija aterriza en los pasos, no en el
  Artículo 29.
- **Compartir**: botón por sección con `navigator.share` o `wa.me`, y cinco tarjetas de cifra
  como imagen para WhatsApp.
- **Tono**: quitar «un estudio que nadie ha citado» (no verificable), «míralo crecer» (tono
  de juguete), «veinte megabytes». Títulos acertijo («La palabra que no aparece», «Lo que hay
  debajo») a títulos que afirman.
- **Firma real** en el pie y descargo «no es del SEA» arriba.

## Lo que ya funciona y no hay que tocar

La matriz de 23 causales con una sola roja; el fotomontaje anotado en escritorio; el buscador
de palabras de la falla; «Démoslo por resuelto» y «un conteo en cero no prueba…» como tono; el
sistema tipográfico; el héroe de 1,5 mm; `.tpies` del vial, el único grupo donde el rojo marca
exactamente la cifra que contradice al titular.

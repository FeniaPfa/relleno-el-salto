# Fuentes

Todo se descargó entre el **19 y el 20 de octubre de 2026**.

## Expediente SEIA 2168892026

- Ficha: `seia.sea.gob.cl/expediente/ficha/fichaPrincipal.php?modo=ficha&id_expediente=2168892026`
- Lista de documentos: `seia.sea.gob.cl/elementosFisicos/enviados.php?id_documento=2168892030`
- Formulario PAC: `seia.sea.gob.cl/pacEia/publico/solicitarPacEia.php?id_expediente=2168892026`

La tabla de documentos se carga por AJAX: no sirve un fetch directo a la ficha. La lista de
anexos sí se puede pedir con `curl` y un User-Agent; los enlaces son rutas
`/archivos/AAAA/MM/DD/`.

```bash
curl -s -A "Mozilla/5.0" \
  "https://seia.sea.gob.cl/elementosFisicos/enviados.php?id_documento=2168892030" \
  -o anexos.html
# los href con /archivos/ son las descargas
```

## Cómo volver a extraer

Los `.rar` del SEIA se abren en macOS sin instalar nada:

```bash
bsdtar -xf archivo.rar -C destino     # libarchive lee RAR5
```

Los `.kmz` son zip con un `doc.kml` dentro; las coordenadas van en `<coordinates>` en EPSG:4326.

Para PDF a texto, `lee.py` usa PyMuPDF. El Python del sistema no trae librerías y `pip` está
bloqueado por PEP 668: hace falta un venv.

## Datos externos

- **Elevación** — Terrain Tiles de Mapzen/AWS, sin cuenta:
  `s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` · z14, x 4934–4942 / y 9784–9792
- **Ortoimagen** — Esri World Imagery, atribución obligatoria «Esri, Maxar, Earthstar Geographics»:
  `server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` · z16
- **Entorno del modo foto** — las mismas dos fuentes, más gruesas, en un cuadrado de 5 bloques: elevación z12 e imagen
  z13. Lo arma `entorno.py`
- **Cicatriz del incendio (dNBR)** — Earth Search STAC, `sentinel-2-l2a`, escenas
  `S2B_19HBD_20240118` (previa) y `S2A_19HBD_20240212` (posterior), bandas B8A y B12,
  umbrales de severidad USGS
- **OpenStreetMap** — Overpass API (requiere User-Agent o devuelve 406)
- **Sitio Prioritario Palmar Las Siete Hermanas – El Salto** — ArcGIS de la SMA:
  `ideserver.sma.gob.cl/arcgis/rest/services/IDE/Biodiversidad/MapServer/3/query`,
  **OBJECTID 316**, escala 1:50.000, 2.234,5 ha, formato `f=json`
- **LandGEM v3.02** (US EPA) para el biogás, parámetros por defecto `k=0,05`, `L0=170 m³/Mg`

## Lo que no se consiguió

- Polígono del Santuario de la Naturaleza Palmar El Salto: la relación OSM 20060875 está vacía
- Cartografía de zonificación del PREMVAL (necesaria para mapear la ZEU 2)
- Traza georreferenciada de la falla Marga-Marga
- Coordenadas en el Cap. 3.16: solo figuras sin georreferenciar

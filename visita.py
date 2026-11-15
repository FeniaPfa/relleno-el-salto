#!/usr/bin/env python3
"""Arma visita.json: los datos de la guía para ir a ver el terreno (visita.html).

    python3 visita.py                 # baja calles y cursos de agua de OpenStreetMap (Overpass)
    python3 visita.py calles.json agua.json   # o usa respuestas de Overpass ya bajadas

Escribe:
  - calles y cursos de agua de OpenStreetMap (ODbL: la página lo atribuye), recortados a la ventana del mapa,
    simplificados a 4 m y cuantizados a 1e-5° en diferencias, por clase;
  - la cuenca visual de cuenca.png reducida a una máscara de 256 × 256 bits sobre la ventana de D.terr
    (filas en Mercator, como el PNG), para responder «¿desde aquí hay línea de vista?» sin cargar el PNG;
  - los seis puntos de observación del paisaje que declara el titular (Cap. 3.15, Tabla 4, PDF pp. 21-24; lo que dice de su visibilidad, p. 30),
    con sus coordenadas UTM 19S convertidas a WGS84. Comprobación: el P.O.1, que el titular sitúa «dentro del
    cerco perimetral», cae dentro del predio, y el P.O.2, «a aproximadamente 1 km», queda a 1.087 m del deslinde.

Necesita shapely, pyproj, numpy y pillow. No está conectado al build: si lo vuelves a correr, reconstruye
(python3 build.py) y revisa el mapa, porque OpenStreetMap cambia.
"""
import io, os, sys, json, base64, urllib.request, urllib.parse
import numpy as np
from PIL import Image
from pyproj import Transformer
from shapely.geometry import LineString, box, mapping
import shapely

AQUI = os.path.dirname(os.path.abspath(__file__))
VENTANA = (-71.515, -33.094, -71.450, -33.040)        # lon0, lat0, lon1, lat1: predio, P.O. y poblaciones del norte
Q = 1e5                                               # cuantización: 1e-5° ≈ 1 m
UA = 'relleno-el-salto/1.0 (analisis ciudadano; github.com/FeniaPfa/relleno-el-salto)'

CLASE = {'motorway': 'm', 'motorway_link': 'm', 'trunk': 'm', 'trunk_link': 'm',
         'primary': 'p', 'primary_link': 'p', 'secondary': 'p',
         'tertiary': 't', 'unclassified': 't',
         'residential': 'r', 'living_street': 'r', 'track': 'c'}

# Cap. 3.15 Estudio de Paisaje y Turismo, Tabla 4 «Coordenadas puntos de observación» (PDF pp. 21-24) y p. 30
PO = [
    (1, 267617, 6337250, 21, 'Portón de acceso del proyecto',
     'donde se ubicará el portón de acceso en el cierre perimetral',
     'Dentro del predio: es propiedad privada y no se puede entrar.'),
    (2, 268647, 6338817, 22, 'Viaducto Marga-Marga, Ruta 60',
     'vista hacia área del proyecto desde viaducto Marga-Marga, Ruta 60',
     'Está sobre la autopista: no te detengas en el viaducto ni en la berma.'),
    (3, 268694, 6339210, 22, 'Poblaciones de las colinas del norte',
     'vista hacia el área de proyecto desde áreas pobladas en las colinas del frente norte',
     'Calle de población: se puede mirar desde la vereda.'),
    (4, 270568, 6339167, 23, 'Peaje Troncal Sur',
     'vista hacia el área de proyecto desde el Peaje Troncal Sur',
     'Está en la autopista: no te detengas en la plaza de peaje ni en la berma.'),
    (5, 269144, 6340471, 23, 'Argentina Alto, Quilpué',
     'vista desde el punto más lejano, ubicado en los centros poblados de Argentina Alto en la comuna de Quilpué',
     'Calle de población: se puede mirar desde la vereda.'),
    (6, 266385, 6340271, 24, 'Acceso al Jardín Botánico',
     'desde el acceso hacia el Jardín Botánico mirando hacia el área del proyecto',
     'Camino de acceso al Jardín Botánico: estaciona fuera de la calzada.'),
]

def overpass(q):
    req = urllib.request.Request('https://overpass-api.de/api/interpreter',
        data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': UA, 'Accept': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=180))

def bajar():
    s, w, n, e = VENTANA[1] - .005, VENTANA[0] - .005, VENTANA[3] + .005, VENTANA[2] + .005
    bb = '(%s,%s,%s,%s)' % (s, w, n, e)
    calles = overpass('[out:json][timeout:90];way["highway"~"^(%s)$"]%s;out geom tags;' % ('|'.join(CLASE), bb))
    agua = overpass('[out:json][timeout:90];way["waterway"~"^(river|stream)$"]%s;out geom tags;' % bb)
    return calles, agua

A_UTM = Transformer.from_crs(4326, 32719, always_xy=True)
A_GEO = Transformer.from_crs(32719, 4326, always_xy=True)

def lineas(elementos, clase_de):
    """[(clase, nombre, [[x0,y0,dx,dy,...]])]: recortadas, simplificadas a 4 m, en diferencias de 1e-5°."""
    marco = box(*VENTANA)
    out = []
    for e in elementos:
        k = clase_de(e['tags'])
        if not k or len(e.get('geometry', [])) < 2: continue
        g = LineString([(p['lon'], p['lat']) for p in e['geometry']]).intersection(marco)
        if g.is_empty: continue
        partes = list(g.geoms) if hasattr(g, 'geoms') else [g]
        for p in partes:
            if p.geom_type != 'LineString': continue
            u = shapely.transform(p, lambda c: np.column_stack(A_UTM.transform(c[:, 0], c[:, 1]))).simplify(4)
            p = shapely.transform(u, lambda c: np.column_stack(A_GEO.transform(c[:, 0], c[:, 1])))
            pts = [(round((x - VENTANA[0]) * Q), round((y - VENTANA[1]) * Q)) for x, y in p.coords]
            seq = [pts[0][0], pts[0][1]]
            for (a, b), (c, d) in zip(pts, pts[1:]):
                if (c, d) != (a, b): seq += [c - a, d - b]
            if len(seq) >= 4: out.append([k, e['tags'].get('name', ''), seq])
    return out

def mascara():
    """Cuenca visual de cuenca.png (alfa > 0 = con línea de vista), a 256 × 256 por mayoría, en bits."""
    datos = json.load(io.open(os.path.join(AQUI, 'src', 'datos.json'), encoding='utf-8'))
    a = np.array(Image.open(os.path.join(AQUI, 'cuenca.png')).convert('RGBA'))[:, :, 3] > 0
    n = 256; f = a.shape[0] // n
    m = a.reshape(n, f, n, f).mean(axis=(1, 3)) >= .5
    T = datos['terr']
    return {'lon0': T['lon0'], 'lon1': T['lon1'], 'lat0': T['lat0'], 'lat1': T['lat1'], 'n': n,
            'bits': base64.b64encode(np.packbits(m.reshape(-1)).tobytes()).decode()}, m, T

def main():
    if len(sys.argv) == 3:
        calles, agua = (json.load(io.open(p, encoding='utf-8')) for p in sys.argv[1:])
    else:
        calles, agua = bajar()
    C = lineas(calles['elements'], lambda t: CLASE.get(t.get('highway')))
    A = lineas(agua['elements'], lambda t: {'river': 'e', 'stream': 'q'}.get(t.get('waterway')))
    M, m, T = mascara()
    import math
    def visto(lon, lat):
        yM = lambda la: math.log(math.tan(math.pi / 4 + la * math.pi / 360))
        c = int((lon - T['lon0']) / (T['lon1'] - T['lon0']) * 256)
        r = int((yM(T['lat1']) - yM(lat)) / (yM(T['lat1']) - yM(T['lat0'])) * 256)
        return bool(m[r, c]) if 0 <= r < 256 and 0 <= c < 256 else None
    po = []
    for n_, e, nn, pag, nombre, cita, acceso in PO:
        lon, lat = A_GEO.transform(e, nn)
        po.append({'n': n_, 'lon': round(lon, 5), 'lat': round(lat, 5), 'utm': [e, nn], 'pag': pag,
                   'nombre': nombre, 'cita': cita, 'acceso': acceso, 'vista': visto(lon, lat)})
    salida = {'ventana': VENTANA, 'q': Q, 'calles': C, 'agua': A, 'cuenca': M, 'po': po,
              'osm': calles.get('osm3s', {}).get('timestamp_osm_base', '')[:10]}
    ruta = os.path.join(AQUI, 'visita.json')
    io.open(ruta, 'w', encoding='utf-8').write(json.dumps(salida, ensure_ascii=False, separators=(',', ':')))
    print('visita.json  %.1f KB · %d calles · %d cursos de agua · OSM %s' % (
        os.path.getsize(ruta) / 1024, len(C), len(A), salida['osm']))
    for p in po: print('  P.O.%d  %.5f, %.5f  línea de vista: %s' % (p['n'], p['lat'], p['lon'], p['vista']))

if __name__ == '__main__':
    main()

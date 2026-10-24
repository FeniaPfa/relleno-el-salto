"""Obras del titular para el visor del relato: edificios, piscinas de lixiviados, antorchas y chimeneas.

Fuentes (ninguna está en el repo; URL y SHA-256 en expediente/manifiesto.json):
  - Huellas de edificios: shapefiles del titular («Zona de Instalaciones…», «Zona de Reciclaje»,
    «Zona de Compostaje», «Zona de tratamiento de lixiviados», «Zona de tratamiento de biogás»),
    con el nombre de cada obra en su atributo NOM_PYO.
  - Piscinas: plano 3.6 «Piscinas lixiviados» del Anexo 1.5 (borde de coronamiento, línea verde,
    georreferenciado con la grilla del plano a 1:1.250), su tabla de coordenadas con cota, y sus
    cuadros de volúmenes (elevación mínima 197,900 y 194,677 m). El fondo es el polígono
    «Piscinas de lixiviados» del shapefile.
  - Antorchas: plano 10.2 «Layout planta quema biogás». La planta a 1:200 mide 70 × 33 m, igual que el
    polígono «Planta tratamiento biogás» del shapefile; con eso se ubican las 4 antorchas. Altura y
    diámetro medidos en su «Vista elevación sur»: ≈8,2 m y ≈2,3 m.
  - Chimeneas: plano 10.1 «Distribución de pozos y redes de captación»: 81 marcas, georreferenciadas
    con la grilla del plano (1:2.500). El mismo plano dice «N° de Chimeneas proyectadas 80» en su
    cuadro; el dibujo y el texto del Anexo 1.6 y del Cap. 1 dicen 81.

Alturas de edificios: el expediente solo declara la de los galpones de reciclaje y de compostaje
(«altura libre suficiente (mínimo 8 m)», PAS 140). El resto va con una altura esquemática (ESQ) y así
se rotula en la página.

Uso:  python3 geometria_obras.py CARPETA_CON_SHAPEFILES_Y_PLANOS
Requiere: pymupdf, pyshp, shapely, pyproj.
"""
import sys, os, re, json, glob, math
import fitz, shapefile
from shapely.geometry import shape, LineString, Polygon, Point
from shapely.ops import polygonize, unary_union
from pyproj import Transformer

A_GEO = Transformer.from_crs('EPSG:32719', 'EPSG:4326', always_xy=True)
def geo(e, n): lon, lat = A_GEO.transform(e, n); return [round(lon, 7), round(lat, 7)]
ESQ = 4.0          # altura esquemática, m
GALPON = 8.0       # «mínimo 8 m», PAS 140 de reciclaje (p. 46) y de compostaje (p. 55)

EDIFICIOS = {      # nombre del shapefile → altura (None = no se extruye: canchas, caminos, etc.)
    'Galpón de reciclaje': GALPON, 'Galpón de mantención': ESQ, 'Galpón losa lavado de camiones': ESQ,
    'Oficina administrativas y operativas': ESQ, 'Oficina reciclaje': ESQ, 'Oficinas compostaje': ESQ,
    'Oficina planta tratamiento lixiviados': ESQ, 'Oficina planta tratamiento biogás': ESQ,
    'Bodega RESPEL galpón de mantención': ESQ, 'Bodega RESPEL tratamiento lixiviados': ESQ,
    'Caseta control de acceso 1': ESQ, 'Caseta control de acceso 2': ESQ, 'Caseta de pesaje': ESQ,
    'Planta tratamiento lixiviados': ESQ,
}

def edificios(carpeta):
    out = []
    for shp in glob.glob(os.path.join(carpeta, '**', '*.shp'), recursive=True):
        r = shapefile.Reader(shp)
        for s, rec in zip(r.shapes(), r.records()):
            nom = rec[0]; alto = EDIFICIOS.get(nom)
            if alto is None: continue
            g = shape(s.__geo_interface__)
            # la planta de lixiviados de 1.776 m² es el recinto, no un edificio: va plana
            if nom == 'Planta tratamiento lixiviados' and g.area > 1000: continue
            for pol in getattr(g, 'geoms', [g]):
                out.append({'n': nom, 'alto': alto, 'esq': alto == ESQ,
                            'p': [geo(e, n) for e, n in list(pol.exterior.simplify(0.15).coords)[:-1]]})   # los estanques vienen con 360 vértices
    return out

def piscinas(carpeta):
    pdf = glob.glob(os.path.join(carpeta, '**', '3.6 Piscinas*.pdf'), recursive=True)[0]
    p = fitz.open(pdf)[0]
    # grilla del plano: 268200 en x = 370,2 y 268500 en x = 1050,45 (2,2675 pt/m); 6337500 en y = 321,2
    K = (1050.45 - 370.2) / 300
    utm = lambda x, y: (268200 + (x - 370.2) / K, 6337500 - (y - 321.2) / K)
    lin = []
    for d in p.get_drawings():
        c = d['color']
        if not c or c[1] < .9 or c[0] > .1 or c[2] > .1 or d['rect'].x1 > 1190 or d['rect'].y1 > 990: continue
        pts = []
        for it in d['items']:
            if it[0] == 'l': pts += [it[1], it[2]]
            elif it[0] == 'c': pts += [it[1], it[4]]
        if len(pts) > 1: lin.append(LineString([utm(q.x, q.y) for q in pts]))
    # la línea verde no cierra en los vértices: se engrosa 0,5 m y el borde es el hueco que encierra
    U = unary_union(lin).buffer(0.5)
    anillos = [Polygon(h).buffer(0.5) for g in getattr(U, 'geoms', [U]) for h in g.interiors if Polygon(h).area > 2000]
    # tabla de coordenadas del plano: punto, elevación, norte, este
    filas = {}
    for w in p.get_text('words'):
        if w[0] > 2000 and 690 < w[1] < 970: filas.setdefault(round((w[1] + w[3]) / 6), []).append((w[0], w[4]))
    tabla = []
    for v in filas.values():
        v = [t for _, t in sorted(v)]
        if len(v) >= 4 and v[0].isdigit(): tabla.append(tuple(float(x.replace(',', '.')) for x in v[1:4]))
    fondos = []
    for shp in glob.glob(os.path.join(carpeta, '**', '*lixiviados.shp'), recursive=True):
        r = shapefile.Reader(shp)
        fondos += [shape(s.__geo_interface__) for s, rec in zip(r.shapes(), r.records()) if rec[0] == 'Piscinas de lixiviados']
    Z_FONDO = {'Piscina 1': 197.9, 'Piscina 2': 194.677}   # cuadros de volúmenes del plano 3.6
    out = []
    for f in sorted(fondos, key=lambda g: g.area):
        nom = 'Piscina 1' if f.area < 3500 else 'Piscina 2'
        borde = max(anillos, key=lambda a: a.intersection(f.buffer(30)).area)
        cerca = [(z, n, e) for z, n, e in tabla if borde.exterior.distance(Point(e, n)) < 15]
        def zc(e, n):   # cota del coronamiento: inverso de la distancia a los puntos de la tabla
            w = [(1 / max(1, math.hypot(e - ee, n - nn)) ** 2, z) for z, nn, ee in cerca]
            return round(sum(a * z for a, z in w) / sum(a for a, _ in w), 2)
        dist = [borde.exterior.distance(Point(e, n)) for _, n, e in cerca]
        print('%s: borde %.0f m² · fondo %.0f m² · %d puntos de la tabla, a %.1f m (máx.) del borde' % (
            nom, borde.area, f.area, len(cerca), max(dist)))
        out.append({'n': nom, 'z_fondo': Z_FONDO[nom],
                    'borde': [geo(e, n) + [zc(e, n)] for e, n in list(borde.exterior.simplify(0.5).coords)[:-1]],
                    'fondo': [geo(e, n) for e, n in list(f.exterior.coords)[:-1]]})
    return out

def antorchas(carpeta):
    p = fitz.open(glob.glob(os.path.join(carpeta, '**', '*Layout planta quema biogas*.pdf'), recursive=True)[0])[0]
    marco = fitz.Rect(119.76, 183.88, 1112.04, 651.52)          # recinto de la planta, a 1:200
    centros = []
    for d in p.get_drawings():
        r = d['rect']
        if marco.contains(r) and abs(r.width - 48) < 1 and abs(r.height - 48) < 1 and r.y0 > 500:
            centros.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    centros = sorted(set((round(x, 1), round(y, 1)) for x, y in centros))
    shp = glob.glob(os.path.join(carpeta, '**', '*biog*s.shp'), recursive=True)[0]
    r = shapefile.Reader(shp)
    planta = [shape(s.__geo_interface__) for s, rec in zip(r.shapes(), r.records()) if rec[0] == 'Planta tratamiento biogás'][0]
    c = list(planta.exterior.coords)
    no, ne, so = c[0], c[1], c[5]                                  # NO, NE y SO del recinto
    ux, uy = ne[0] - no[0], ne[1] - no[1]; vx, vy = so[0] - no[0], so[1] - no[1]
    out = []
    for x, y in centros:
        a = (x - marco.x0) / marco.width; b = (y - marco.y0) / marco.height
        out.append(geo(no[0] + a * ux + b * vx, no[1] + a * uy + b * vy))
    print('antorchas: %d · recinto %.0f × %.0f m (plano: 70 × 33)' % (len(out), math.hypot(ux, uy), math.hypot(vx, vy)))
    return {'alto': 8.2, 'diam': 2.3, 'p': out}

def chimeneas(carpeta):
    p = fitz.open(glob.glob(os.path.join(carpeta, '**', '*Pozos y redes*.pdf'), recursive=True)[0])[0]
    K = 340.2 / 300                                                # 1:2.500; 267600 en x = 93,6; 6336600 en y = 998,45
    out = []
    for d in p.get_drawings():
        r, col = d['rect'], d['color']
        if (col and abs(r.width - 6.8) < .2 and abs(r.height - 6.8) < .2 and r.x1 < 1190
                and col[1] > .8 and col[0] < .1 and any(it[0] == 'c' for it in d['items'])):
            x, y = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
            out.append(geo(267600 + (x - 93.6) / K, 6336600 + (998.45 - y) / K))
    print('chimeneas: %d' % len(out))
    return out

# superficies planas, para drapear sobre el terreno del visor (Cap. 1: acceso asfaltado, p. 169 y 208;
# caminos interiores de «carpeta de estabilizado», p. 174)
# El polígono de cada camino incluye sus cortes y terraplenes; el «(sin remoción de masa)», contenido en él y de
# unos 8,5 m de ancho, es la calzada. Lo demás se dibuja como talud.
TIPOS = {'Camino acceso desde ruta 60-Troncal Sur': 'talud', 'Camino de acceso (sin remoción de masa)': 'asfalto',
         'Empalme de acceso': 'asfalto', 'Caminos interiores': 'talud', 'Caminos interiores (sin remoción de masa)': 'ripio',
         'Estacionamientos': 'patio', 'Báscula de pesaje': 'patio', 'Cancha contenedores reciclaje': 'patio',
         'Cancha acopio material estructurante': 'patio', 'Zona de trincheras': 'tierra', 'Zona de maduración': 'tierra'}

def superficies(carpeta):
    """Por tipo: una malla triangulada (vértices en decímetros UTM desde un origen) y los bordes. Para el visor se
    da la transformación afín de UTM a (lon, lat), exacta a < 0,1 m en estos 4 km; los vértices van redondeados a 25 cm."""
    from collections import defaultdict
    grupos = defaultdict(list)
    for shp in glob.glob(os.path.join(carpeta, '**', '*.shp'), recursive=True):
        r = shapefile.Reader(shp)
        for s, rec in zip(r.shapes(), r.records()):
            t = 'plataforma' if rec[0].startswith('Plataforma ') else TIPOS.get(rec[0])
            if t: grupos[t].append(shape(s.__geo_interface__).buffer(0))
    calzadas = unary_union(grupos['asfalto'] + grupos['ripio'])
    out = []
    for t, gs in grupos.items():
        u = unary_union(gs)
        if t == 'talud': u = u.difference(calzadas.buffer(0.5))
        # triangulación restringida con bordes densificados cada 5 m; en las superficies anchas, los triángulos se
        # parten por la mitad del lado mayor hasta que ninguno pase de 22 m (la celda del modelo de terreno es de 20 m), para que sigan el relieve. Bordes exactos,
        # sin escalones de grilla.
        import shapely
        vs, idx, ix = [], [], {}; ox, oy = u.bounds[0], u.bounds[1]
        def v(q):
            k = (round(q[0], 2), round(q[1], 2))
            if k not in ix: ix[k] = len(vs) // 2; vs.extend([round((k[0] - ox) * 4), round((k[1] - oy) * 4)])
            return ix[k]
        def partir(a, b, c):
            ls = [math.dist(a, b), math.dist(b, c), math.dist(c, a)]
            if max(ls) <= 22 or t in ('asfalto', 'ripio'):
                idx.extend([v(a), v(b), v(c)]); return
            k = ls.index(max(ls)); a, b, c = [(a, b, c), (b, c, a), (c, a, b)][k]
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            partir(a, m, c); partir(m, b, c)
        for g in getattr(u, 'geoms', [u]):
            if g.area < 30: continue
            g = shapely.segmentize(g.simplify(0.4), 5.0)
            for tri in shapely.constrained_delaunay_triangles(g).geoms:
                partir(*list(tri.exterior.coords)[:3])
        bordes = [[geo(e, n) for e, n in g.exterior.simplify(0.8).coords] for g in getattr(u, 'geoms', [u]) if g.area > 30]
        # vértices en cuartos de metro desde (ox, oy), con la afín de UTM a (lon, lat) por cuarto de metro
        a, b2, c = geo(ox, oy), geo(ox + 1000, oy), geo(ox, oy + 1000)
        out.append({'t': t, 'o': a, 'di': [(b2[0] - a[0]) / 4e3, (b2[1] - a[1]) / 4e3],
                    # en diferencias con el valor anterior (x con x, y con y; índice con índice): sin pérdida, y con
                    # brotli pesa un 21 % menos; el visor los reconstruye sumando
                    'dj': [(c[0] - a[0]) / 4e3, (c[1] - a[1]) / 4e3],
                    'v': vs[:2] + [vs[k] - vs[k - 2] for k in range(2, len(vs))],
                    'i': idx[:1] + [idx[k] - idx[k - 1] for k in range(1, len(idx))],
                    'b': [[[round(x, 6) for x in q] for q in B] for B in bordes] if t != 'talud' else []})
        print('superficie %-10s %5.1f ha · %d triángulos' % (t, u.area / 1e4, len(idx) // 3))
    return out

if __name__ == '__main__':
    carpeta = sys.argv[1]
    bandejas = []
    for shp in glob.glob(os.path.join(carpeta, '**', '*lixiviados.shp'), recursive=True):
        r = shapefile.Reader(shp)
        bandejas += [[geo(e, n) for e, n in list(shape(s.__geo_interface__).exterior.coords)[:-1]]
                     for s, rec in zip(r.shapes(), r.records()) if rec[0] == 'Bandejas evaporación']
    o = {'fuente': 'Shapefiles y planos 3.6, 10.1 y 10.2 del Anexo 1.5 del titular (geometria_obras.py)',
         'edificios': edificios(carpeta), 'piscinas': piscinas(carpeta), 'bandejas': bandejas,
         'antorchas': antorchas(carpeta), 'chimeneas': chimeneas(carpeta), 'superficies': superficies(carpeta)}
    json.dump(o, open('obras.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('obras.json · %d edificios · %.1f KB' % (len(o['edificios']), os.path.getsize('obras.json') / 1024))

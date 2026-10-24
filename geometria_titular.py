"""Geometría del titular para el visor del relato: la superficie final del relleno.

Lee el plano 3.8 «Manto general» del Anexo 1.5 (Anexo_15_Planos_12.rar del SEIA; no está en el repo:
la URL y el SHA-256 están en expediente/manifiesto.json), extrae sus curvas de nivel principales,
las georreferencia con la grilla UTM del propio plano y escribe manto.json, una grilla de elevación
que el relato usa en lugar de la masa estimada.

Uso:  python3 geometria_titular.py RUTA/AL/3.8_Manto_general.pdf
Requiere: pymupdf, numpy, scipy, shapely, pyproj.

Validación (2026-10-23):
  - Georreferencia: los 16 vértices del borde que el plano lista en su «Tabla de puntos» caen a una
    mediana de 0,6 m (máx. 2,4 m) del borde dibujado, transformados con la grilla.
  - Cotas: contra las tablas «cotas manto» de los tres perfiles del mismo plano, la diferencia mediana
    es de 0,9 m (Perfil 1), 1,7 m (Perfil 2) y 1,0 m (Perfil 3), con el 90 % de los puntos bajo 3,2 m.
    La cima da 350 m, la del Perfil 3. (En la tabla del Perfil 1 los rótulos de fila están desfasados:
    la fila con las cotas del manto es la que está junto a «COTAS EXCAVACIÓN».)
  - La máscara es el borde del manto (trazos azules del plano): 44,4 ha, frente a 44,9 ha declaradas
    en la Tabla 40 del Cap. 1.

Trampas que ya se encontraron:
  - Los números de 9 pt de la planta son distancias a lo largo de los perfiles, no cotas (cotas: 6,4 pt).
  - Las curvas se cortan donde va su rótulo: un anillo «cerrado» tiene una abertura de hasta ~20 pt.
  - La meseta de coronamiento no tiene curva principal: la dan las secundarias (346 a 349) y el centro.
  - La «zona de disposición» de la cartografía (51,3 ha) es más grande que el manto y contiene un cerro
    natural de más de 350 m: medir el máximo sobre ella da una cima falsa.
"""
import sys, re, json, math, base64, collections
import numpy as np, fitz
from scipy.interpolate import LinearNDInterpolator
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import transform, polygonize, unary_union
from pyproj import Transformer

# Grilla UTM 19S del plano (centros de los rótulos de borde): 340,15 pt cada 300 m, norte arriba (1:2.500)
X0, E0, Y0, N0, K = 129.1, 267600, 1131.9, 6336600, 340.15 / 300
def a_pagina(e, n): return X0 + (e - E0) * K, Y0 - (n - N0) * K
PLANTA = fitz.Rect(83, 67, 1270, 1195)          # recuadro de la «Planta manto»
GRIS_PRINCIPAL = (0.33, 0.33, 0.33)              # curvas principales, cada 5 m
AZUL_BORDE = (0.48, 0.69, 0.87)                  # borde del manto y límites de etapa

def huella(p):
    """El borde del manto: las caras de más de 1 ha que encierran los trazos azules. Suman 44,0 ha,
    frente a las 44,9 ha que declara la Tabla 40 del Cap. 1; la «zona de disposición» de la cartografía
    (51,3 ha) incluye otras obras, y usarla dibujaba una cuña falsa en el borde este."""
    caras = polygonize(unary_union([LineString(l) for l in lineas(p, AZUL_BORDE)]))
    u = unary_union([c for c in caras if c.area / K / K / 1e4 > 1]).buffer(1).buffer(-1)
    # solo el contorno exterior: las caras chicas sin trazo azul quedaban como agujeros (la meseta, entre ellas)
    return unary_union([Polygon(g.exterior) for g in getattr(u, 'geoms', [u])])

def lineas(p, color, tol=.02):
    out = []
    for d in p.get_drawings():
        c = d['color']
        if not c or any(abs(a - b) > tol for a, b in zip(c, color)) or not PLANTA.contains(d['rect']): continue
        seg = []
        for it in d['items']:
            if it[0] == 'l':
                if seg and (seg[-1][0] - it[1].x) ** 2 + (seg[-1][1] - it[1].y) ** 2 > 0.01:
                    if len(seg) > 1: out.append(seg)
                    seg = []
                if not seg: seg = [(it[1].x, it[1].y)]
                seg.append((it[2].x, it[2].y))
            elif it[0] == 'c':
                if not seg: seg = [(it[1].x, it[1].y)]
                a, b, c2, d2 = it[1], it[2], it[3], it[4]
                for t in (0.25, 0.5, 0.75, 1):
                    s = 1 - t
                    seg.append((s**3*a.x + 3*s*s*t*b.x + 3*s*t*t*c2.x + t**3*d2.x,
                                s**3*a.y + 3*s*s*t*b.y + 3*s*t*t*c2.y + t**3*d2.y))
        if len(seg) > 1: out.append(seg)
    return out

def rotulos(p):
    """Cotas de las curvas: cuerpo de 6,4 pt. Los números de 9 pt son distancias a lo largo de los
    perfiles (50, 100… 350 m) y no cotas: tomarlos como cotas daba elevaciones falsas."""
    r = []
    for b in p.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                t = s['text'].strip().replace(',', '.')
                if (re.fullmatch(r'\d{3}(\.0+)?', t) and 180 <= float(t) <= 380 and s['size'] < 8
                        and PLANTA.contains(fitz.Rect(s['bbox']))):
                    x0, y0, x1, y1 = s['bbox']; r.append(((x0 + x1) / 2, (y0 + y1) / 2, float(t)))
    return r

def superficie(pdf):
    p = fitz.open(pdf)[0]
    borde = huella(p)
    L = lineas(p, GRIS_PRINCIPAL); geo = [LineString(l) for l in L]
    # cada rótulo marca la curva más cercana; si una curva recibe dos cotas distintas, se descarta
    cand = collections.defaultdict(set)
    for x, y, z in rotulos(p):
        d, i = min((g.distance(Point(x, y)), i) for i, g in enumerate(geo))
        if d <= 6: cand[i].add(z)
    cota = [next(iter(s)) if len(s) == 1 else None for s in (cand.get(i, set()) for i in range(len(L)))]
    def puntos(i, paso=2.0):
        g = geo[i]; n = max(2, int(g.length / paso))
        return [g.interpolate(k / (n - 1), normalized=True).coords[0] for k in range(n)]
    extra = []                                       # puntos de cota fija fuera de las principales (cimas)
    def interp(con_arbol=False):
        xs, zs = [q for q, _ in extra], [z for _, z in extra]
        for i, c in enumerate(cota):
            if c is not None:
                for q in puntos(i): xs.append(q); zs.append(c)
        f = LinearNDInterpolator(np.array(xs), np.array(zs))
        return (f, borde) if con_arbol else f
    # curvas sin rótulo: se aceptan solo si la superficie provisional las pone, pareja, en un múltiplo de 5 m
    for _ in range(4):
        f = interp()
        for i, c in enumerate(cota):
            if c is not None: continue
            v = f(np.array(puntos(i, 4))); v = v[~np.isnan(v)]
            if len(v) < 3: continue
            m = float(np.median(v)); r = round(m / 5) * 5
            if abs(m - r) < 1.5 and np.percentile(np.abs(v - r), 80) < 2.5: cota[i] = r
    # cimas. Las curvas se cortan donde va su rótulo, así que «cerrada» admite una abertura de 25 pt.
    # Una curva principal cerrada que no encierra otra principal es un punto alto: adentro, las secundarias
    # (cada 1 m) suben z+1, z+2… de afuera hacia adentro, y el centro queda un nivel más arriba. Así sale
    # la meseta de coronamiento: 345 m en la principal, 346 a 349 en las secundarias y 350 en el centro,
    # que es la cota máxima del manto en el Perfil 3 del mismo plano.
    def anillo(l): return Polygon(l + [l[0]]).buffer(0) if len(l) > 3 and math.dist(l[0], l[-1]) < 25 else None
    principales = {i: a for i, a in ((i, anillo(L[i])) for i in range(len(L))) if a is not None and a.area > 0}
    secundarias = [(a, l) for a, l in ((anillo(l), l) for l in lineas(p, (0.5, 0.5, 0.5))) if a is not None and a.area > 0]
    for i, A in principales.items():
        if cota[i] is None or any(A.contains(principales[j]) for j in principales if j != i): continue
        dentro = sorted([(a, l) for a, l in secundarias if A.contains(a) and a.area > 0.02 * A.area],
                        key=lambda t: -t[0].area)[:4]
        for k, (a, l) in enumerate(dentro, 1):
            extra.extend((q, cota[i] + k) for q in l)
        cima = (dentro[-1][0] if dentro else A).representative_point()
        extra.append((cima.coords[0], cota[i] + len(dentro) + 1))
    return interp(con_arbol=True)

def main(pdf, salida='manto.json', paso=5.0):
    f, borde = superficie(pdf)
    print('huella del manto: %.1f ha' % (borde.area / K / K / 1e4))
    D = json.load(open('src/datos.json', encoding='utf-8'))
    M = D['terr']
    my = lambda lat: math.log(math.tan(math.pi / 4 + lat * math.pi / 360))
    MY0, MY1 = my(M['lat0']), my(M['lat1'])
    res = [x for x in D['proyecto'] if x['id'] == 'residuos'][0]
    a_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32719', always_xy=True)
    poly = transform(lambda x, y, z=None: a_utm.transform(x, y), shape(res['g'])).buffer(0)
    lon0, lat0, lon1, lat1 = shape(res['g']).bounds
    u0 = (lon0 - M['lon0']) / (M['lon1'] - M['lon0']); u1 = (lon1 - M['lon0']) / (M['lon1'] - M['lon0'])
    v0 = (my(lat0) - MY0) / (MY1 - MY0); v1 = (my(lat1) - MY0) / (MY1 - MY0)
    nu = int(round((u1 - u0) * M['ancho_m'] / paso)) + 1; nv = int(round((v1 - v0) * M['ancho_m'] / paso)) + 1
    Z0, DZ = 195.0, 0.65                             # un byte por celda: 195 a 360 m, cada 0,65 m; 255 = sin dato
    datos = bytearray()
    for r in range(nv):
        v = v0 + (v1 - v0) * r / (nv - 1)
        lat = math.degrees(2 * math.atan(math.exp(MY0 + v * (MY1 - MY0))) - math.pi / 2)
        for c in range(nu):
            lon = lon0 + (lon1 - lon0) * c / (nu - 1)
            e, n = a_utm.transform(lon, lat)
            z = float('nan')
            q = a_pagina(e, n)
            if borde.contains(Point(q)): z = float(f(np.array([q]))[0])
            datos.append(255 if math.isnan(z) else max(0, min(254, round((z - Z0) / DZ))))
    out = {'fuente': 'Anexo 1.5, plano 3.8 «Manto general» (CMGIR-PG-09), curvas principales georreferenciadas',
           'u0': u0, 'u1': u1, 'v0': v0, 'v1': v1, 'nu': nu, 'nv': nv, 'z0': Z0, 'dz': DZ,
           'z': base64.b64encode(bytes(datos)).decode()}
    json.dump(out, open(salida, 'w'), separators=(',', ':'))
    validos = [b for b in datos if b != 255]
    print('%s · %d × %d celdas de %.0f m · %d con dato · cota máx %.1f m · %.0f KB' % (
        salida, nu, nv, paso, len(validos), Z0 + DZ * max(validos), len(json.dumps(out)) / 1024))

if __name__ == '__main__':
    main(sys.argv[1])

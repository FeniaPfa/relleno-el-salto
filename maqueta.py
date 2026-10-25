"""La maqueta de la principal: las zonas y las obras del proyecto en una vista oblicua, sin relieve.

Dibuja en SVG, con la misma proyección para todo:
  - el predio (deslinde, 206 ha) como una placa con espesor;
  - las zonas del proyecto (src/datos.json, clave `proyecto`) como placas de color, con la paleta del mapa de la
    sección «Dónde está»;
  - las obras de obras.json (geometria_obras.py): edificios con su altura (solo el galpón de reciclaje la tiene
    declarada, 8 m; el resto, 4 m esquemáticos), piscinas y bandejas como láminas de agua, las 4 antorchas
    (8,2 m) y las 81 chimeneas (6 m, esquemáticas).
Las alturas van a la misma escala que el plano: no hay exageración. La masa de residuos se muestra solo por su
huella (el terreno no está), y así lo dice el pie de la figura.

Escribe src/maqueta.svg con dos vistas (escritorio, apaisada; celular, vertical); build.py la inyecta en el
marcador <!--__MAQUETA__--> de la plantilla. Los colores son variables CSS, así sigue el modo claro u oscuro.

Necesita shapely (python3 -m pip install shapely).
"""
import json, math, os
from shapely.geometry import shape, Polygon, MultiPolygon, Point
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(AQUI, 'src', 'datos.json')))
O = json.load(open(os.path.join(AQUI, 'obras.json')))
Z = {c['id']: c for c in D['proyecto']}

# metros locales alrededor del centro de las obras
LON0, LAT0 = -71.4845, -33.0805
KX, KY = math.cos(math.radians(LAT0)) * 111320, 110540
def m(lon, lat): return ((lon - LON0) * KX, (lat - LAT0) * KY)

def geom_m(g):
    """una geometría lon/lat de shapely, en metros"""
    import shapely
    return shapely.transform(g, lambda c: [m(x, y) for x, y in c])

PREDIO = geom_m(shape(Z['predio']['g'])).buffer(0)

# zonas, en el orden y con el estilo del mapa de «Dónde está» (relleno, opacidad)
ESTILO = [
    ('plataformas', 'var(--ink3)', .35), ('instalaciones', 'var(--ink2)', .4), ('residuos', 'var(--acc)', .55),
    ('cortafuegos', 'var(--green)', .7), ('lixiviados', 'var(--blue)', .8), ('compostaje', 'var(--green)', .5),
    ('reciclaje', 'var(--ink)', .5), ('biogas', 'var(--warn)', .85)]


class Vista:
    def __init__(s, az, elev, W, H, escala, centro, fs):
        s.a, s.e, s.W, s.H, s.s, s.fs = math.radians(az), math.radians(elev), W, H, escala, fs
        s.cx, s.cy = centro

    def rot(s, x, y):
        ca, sa = math.cos(s.a), math.sin(s.a)
        return x * ca - y * sa, x * sa + y * ca      # (a lo ancho, en profundidad: + es lejos)

    def p(s, x, y, z=0):
        xr, yr = s.rot(x, y)
        return (s.cx + s.s * xr, s.cy - s.s * (yr * math.sin(s.e) + z * math.cos(s.e)))

    def prof(s, x, y): return s.rot(x, y)[1]


def f(v): return ('%.1f' % v).rstrip('0').rstrip('.')
def ruta(V, anillo, z=0): return 'M' + 'L'.join(f(a) + ',' + f(b) for a, b in (V.p(x, y, z) for x, y in anillo)) + 'Z'

def polis(g):
    if g.is_empty: return []
    return list(g.geoms) if isinstance(g, MultiPolygon) else [g] if isinstance(g, Polygon) else \
        [x for x in getattr(g, 'geoms', []) if isinstance(x, Polygon)]

def ruta_g(V, g, z=0, simpl=1.0):
    out = []
    for P in polis(g.simplify(simpl)):
        out.append(ruta(V, list(P.exterior.coords)[:-1], z))
        for h in P.interiors: out.append(ruta(V, list(h.coords)[:-1], z))
    return ''.join(out)


def prisma(V, anillo, z0, z1, clase):
    """paredes visibles y techo de un prisma; devuelve (profundidad, svg)"""
    partes = []
    n = len(anillo)
    # orientación del anillo, para saber hacia dónde mira cada pared
    area = sum(anillo[i][0] * anillo[(i + 1) % n][1] - anillo[(i + 1) % n][0] * anillo[i][1] for i in range(n))
    sg = 1 if area > 0 else -1
    paredes = []
    for i in range(n):
        (x1, y1), (x2, y2) = anillo[i], anillo[(i + 1) % n]
        nx, ny = sg * (y2 - y1), -sg * (x2 - x1)          # normal hacia afuera
        if V.rot(nx, ny)[1] >= 0: continue                 # mira hacia atrás
        q = [V.p(x1, y1, z0), V.p(x2, y2, z0), V.p(x2, y2, z1), V.p(x1, y1, z1)]
        lado = 'a' if V.rot(nx, ny)[0] < 0 else 'b'
        paredes.append((-(V.prof(x1, y1) + V.prof(x2, y2)), '<path class="%s-%s" d="M%sZ"/>' % (clase, lado, 'L'.join(f(a) + ',' + f(b) for a, b in q))))
    paredes.sort()
    partes += [p for _, p in paredes]
    partes.append('<path class="%s-t" d="%s"/>' % (clase, ruta(V, anillo, z1)))
    cx = sum(x for x, _ in anillo) / n; cy = sum(y for _, y in anillo) / n
    return V.prof(cx, cy), ''.join(partes)


def dibujar(V, nombre):
    sv = []
    # la placa del predio: el borde inferior corrido hacia abajo hace de espesor
    T = 30
    ext = list(PREDIO.exterior.coords)[:-1]
    sv.append('<path class="mq-base-l" d="%s"/>' % ruta(V, ext, -T))
    # paredes de la placa: cada tramo del borde que mira hacia el observador
    n = len(ext); area = sum(ext[i][0] * ext[(i + 1) % n][1] - ext[(i + 1) % n][0] * ext[i][1] for i in range(n)); sg = 1 if area > 0 else -1
    for i in range(n):
        (x1, y1), (x2, y2) = ext[i], ext[(i + 1) % n]
        if V.rot(sg * (y2 - y1), -sg * (x2 - x1))[1] >= 0: continue
        q = [V.p(x1, y1, 0), V.p(x2, y2, 0), V.p(x2, y2, -T), V.p(x1, y1, -T)]
        sv.append('<path class="mq-base-l" d="M%sZ"/>' % 'L'.join(f(a) + ',' + f(b) for a, b in q))
    sv.append('<path class="mq-base" d="%s"/>' % ruta(V, ext, 0))

    # zonas, recortadas al predio (el camino de acceso sale de él hacia el norte)
    for k, col, op in ESTILO:
        g = geom_m(shape(Z[k]['g'])).buffer(0).intersection(PREDIO)
        sv.append('<path d="%s" style="fill:%s;fill-opacity:%s;stroke:%s;stroke-width:.8"/>' % (ruta_g(V, g), col, op, col))

    # agua: piscinas (borde de coronamiento y fondo) y bandejas
    for Pc in O['piscinas']:
        sv.append('<path class="mq-agua-b" d="%s"/>' % ruta(V, [m(c[0], c[1]) for c in Pc['borde']]))
        sv.append('<path class="mq-agua" d="%s"/>' % ruta(V, [m(c[0], c[1]) for c in Pc['fondo']]))
    for B in O['bandejas']:
        sv.append('<path class="mq-agua" d="%s"/>' % ruta(V, [m(c[0], c[1]) for c in B]))

    # objetos con altura, de atrás hacia adelante
    obj = []
    for E in O['edificios']:
        an = [m(c[0], c[1]) for c in E['p']]
        obj.append(prisma(V, an, 0, E['alto'], 'mq-ed' if E['esq'] else 'mq-gal'))
    A = O['antorchas']
    for c in A['p']:
        x, y = m(c[0], c[1]); a, b = V.p(x, y, 0); a2, b2 = V.p(x, y, A['alto'])
        obj.append((V.prof(x, y), '<line class="mq-ant" x1="%s" y1="%s" x2="%s" y2="%s"/><circle class="mq-ant-c" cx="%s" cy="%s" r="3"/>' % (f(a), f(b), f(a2), f(b2), f(a2), f(b2))))
    for c in O['chimeneas']:
        x, y = m(c[0], c[1]); a, b = V.p(x, y, 0); a2, b2 = V.p(x, y, 6)
        obj.append((V.prof(x, y), '<line class="mq-chi" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(a), f(b), f(a2), f(b2))))
    obj.sort(key=lambda t: -t[0])
    sv += [s for _, s in obj]
    return sv


def centro(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)

def anclas():
    """dónde apunta cada rótulo, en metros, y a qué altura"""
    pis = max(O['piscinas'], key=lambda P: Polygon([m(c[0], c[1]) for c in P['borde']]).area)
    ptl = [centro([m(c[0], c[1]) for c in E['p']]) for E in O['edificios'] if E['n'].startswith('Planta tratamiento lixiviados')]
    gal = [E for E in O['edificios'] if not E['esq']][0]
    ch = [m(c[0], c[1]) for c in O['chimeneas']]
    cc = centro(ch); chc = min(ch, key=lambda p: (p[0] - cc[0]) ** 2 + (p[1] - cc[1]) ** 2)
    res = geom_m(shape(Z['residuos']['g'])).buffer(0).representative_point()
    return [
        ('Zona de disposición de residuos', '51,34 ha · la masa no se dibuja', (res.x, res.y + 120), 0),
        ('81 chimeneas de biogás', '6 m, esquemáticas (plano 10.1)', chc, 6),
        ('Piscinas de lixiviados', 'dos, del plano 3.6', centro(Polygon([m(c[0], c[1]) for c in pis['borde']]).exterior.coords[:-1]), 0),
        ('Planta de lixiviados', 'edificios de 4 m, esquemáticos', centro(ptl), 4),
        ('Antorchas de biogás', 'cuatro, de 8,2 m (plano 10.2)', centro([m(c[0], c[1]) for c in O['antorchas']['p']]), 8.2),
        (gal['n'], '8 m de alto, declarados', centro([m(c[0], c[1]) for c in gal['p']]), 8),
    ]


def rotulos(V, ocupado, sin=()):
    """cada rótulo arriba de su punto, o donde quepa sin pisar a otro; líneas cortas"""
    fs, fs2 = V.fs, V.fs * .82
    out, cajas = [], list(ocupado)
    def libre(b): return all(b[2] < c[0] or b[0] > c[2] or b[3] < c[1] or b[1] > c[3] for c in cajas)
    for t, sub, (x, y), z in anclas():
        if t in sin: continue
        px, py = V.p(x, y, z)
        w = max(len(t) * fs * .5, len(sub) * fs2 * .5) + fs * .9; h = fs * 2.55
        lw = w / 2 + 14
        for dx, dy in [(0, -fs * 3.4), (lw, -h * .7), (-lw, -h * .7), (lw, h * .5), (-lw, h * .5), (0, fs * 3), (0, -fs * 6), (lw * 1.4, -fs * 4.5), (-lw * 1.4, -fs * 4.5), (0, -fs * 8.5), (0, fs * 5), (lw, fs * 5), (-lw, fs * 5), (0, fs * 8.5)]:
            bx, by = px + dx - w / 2, py + dy - h / 2
            b = (bx - 4, by - 4, bx + w + 4, by + h + 4)
            if bx < 6 or by < 6 or bx + w > V.W - 6 or by + h > V.H - 6 or not libre(b): continue
            cajas.append(b)
            ly = by + h if by + h < py else by
            out.append('<line class="mq-l" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(px), f(py), f(bx + w / 2), f(ly)))
            out.append('<rect class="mq-r" x="%s" y="%s" width="%s" height="%s" rx="2"/>' % (f(bx), f(by), f(w), f(h)))
            out.append('<text class="mq-t" x="%s" y="%s" font-size="%s">%s</text>' % (f(bx + fs * .45), f(by + fs * 1.12), f(fs), t))
            out.append('<text class="mq-s" x="%s" y="%s" font-size="%s">%s</text>' % (f(bx + fs * .45), f(by + fs * 2.15), f(fs2), sub))
            out.append('<circle class="mq-p" cx="%s" cy="%s" r="%s"/>' % (f(px), f(py), f(fs * .22)))
            break
    return out


def numeros(V, sin=()):
    """en celular: un número sobre cada obra y la lista debajo de la figura, para no tapar lo que se rotula"""
    out, lista, n = [], [], 0
    for t, sub, (x, y), z in anclas():
        if t in sin: continue
        n += 1; px, py = V.p(x, y, z); r = V.fs * .72
        out.append('<circle class="mq-nb" cx="%s" cy="%s" r="%s"/>' % (f(px), f(py - r - 4), f(r)))
        out.append('<line class="mq-l" x1="%s" y1="%s" x2="%s" y2="%s"/>' % (f(px), f(py - 4), f(px), f(py)))
        out.append('<text class="mq-nt" x="%s" y="%s" font-size="%s" text-anchor="middle" data-fijo="1">%d</text>' % (f(px), f(py - r - 4 + V.fs * .36), f(V.fs), n))
        lista.append('<li><b>%s</b> · %s</li>' % (t, sub))
    return out, '<ol class="mq-lista">' + ''.join(lista) + '</ol>'


def brujula(V, x, y, fs):
    """flecha al norte y barra de 200 m (a lo ancho de la pantalla la escala es la del plano)"""
    a1, b1 = V.p(0, 0); a2, b2 = V.p(0, 100)
    ang = math.degrees(math.atan2(a2 - a1, -(b2 - b1)))
    L = 200 * V.s
    return ('<g transform="translate(%s %s) rotate(%s)"><path class="mq-n" d="M0,-14L6,6L0,2L-6,6Z"/></g>' % (f(x), f(y), f(ang)) +
            '<text class="mq-s" x="%s" y="%s" font-size="%s" text-anchor="middle">N</text>' % (f(x + math.sin(math.radians(ang)) * 26), f(y - math.cos(math.radians(ang)) * 26 + fs * .3), f(fs * .9)) +
            '<path class="mq-esc" d="M%s,%sv6h%sv-6"/>' % (f(x + 30), f(y), f(L)) +
            '<text class="mq-s" x="%s" y="%s" font-size="%s">200 m</text>' % (f(x + 36 + L), f(y + 6), f(fs * .9)))


def svg(V, clase, etiqueta, sin=(), num=False):
    cuerpo, extra = dibujar(V, clase), ''
    if num: r, extra = numeros(V, sin); cuerpo += r
    else: cuerpo += rotulos(V, [(0, V.H - 70, 260, V.H)], sin)
    cuerpo.append(brujula(V, 30, V.H - 34, V.fs))
    return ('<svg class="%s" viewBox="0 0 %d %d" role="img" aria-label="%s">' % (clase, V.W, V.H, etiqueta) +
            ''.join(cuerpo) + '</svg>' + extra)


def encuadrar(az, elev, W, H, fs, margen, foco_k=('residuos', 'lixiviados', 'plataformas', 'compostaje', 'reciclaje', 'biogas')):
    """la escala y el centro que hacen caber las obras y la zona de residuos, con lugar arriba para los rótulos"""
    foco = unary_union([geom_m(shape(Z[k]['g'])).buffer(0) for k in foco_k]).intersection(PREDIO)
    V = Vista(az, elev, W, H, 1, (0, 0), fs)
    pts = [V.p(x, y) for P in polis(foco) for x, y in P.exterior.coords]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    l, t, r, b = margen
    esc = min((W - l - r) / (x1 - x0), (H - t - b) / (y1 - y0))
    return Vista(az, elev, W, H, esc, (l + (W - l - r) / 2 - esc * (x0 + x1) / 2, t + (H - t - b) / 2 - esc * (y0 + y1) / 2), fs)


def main():
    ETQ = ('Esquema oblicuo del proyecto, sin relieve: el predio de 206 hectáreas como una placa, las zonas del proyecto '
           'en colores y, encima, los edificios, las piscinas de lixiviados, las cuatro antorchas y las 81 chimeneas de biogás, '
           'con sus alturas a la misma escala que el plano.')
    # el centro de la vista: el de la zona de residuos y las obras del norte
    ancho = encuadrar(-28, 38, 1200, 760, 15, (40, 90, 40, 70))
    alto = encuadrar(62, 46, 600, 640, 22, (30, 60, 30, 70), ('lixiviados', 'plataformas', 'compostaje', 'reciclaje', 'biogas'))
    out = ('<!-- generado por maqueta.py: no editar a mano -->\n' + svg(ancho, 'mq mq-ancho', ETQ) + '\n' +
           svg(alto, 'mq mq-alto', ETQ, sin=('Zona de disposición de residuos',), num=True) + '\n')
    open(os.path.join(AQUI, 'src', 'maqueta.svg'), 'w').write(out)
    print('src/maqueta.svg  %.1f KB' % (len(out.encode()) / 1024))

if __name__ == '__main__':
    main()

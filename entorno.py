"""El entorno del modo foto: relieve e imagen satelital alrededor del bloque del visor.

El visor dibuja un cuadrado de terreno de 10,2 km (D.terr). En el modo foto, para que no se vea el borde
del bloque, se dibuja alrededor un terreno más grande y más grueso: 5 veces el ancho del bloque, centrado
en él, en la misma proyección (Mercator, la de las teselas) y con el mismo marco u, v del visor, así que
u = 0..1 sigue siendo el bloque y el entorno va de u = -2 a u = 3.

Mismas fuentes que el bloque (docs/fuentes.md):
  - elevación: Terrain Tiles de Mapzen/AWS (terrarium), z12, unos 30 m por píxel
  - imagen: Esri World Imagery, z13; atribución «Esri, Maxar, Earthstar Geographics»

Escribe:
  entorno-altura.png  321 × 321, una muestra cada S/64 (160 m). Altura = (R·256 + G) / 16 − 50 m.
                      Fila 0 = norte. El mar queda en 0.
  entorno.jpg         2048 × 2048, el mismo cuadrado (25 m por píxel); entorno-1024.jpg y .webp para celular.

Necesita pillow y numpy. Solo lo usa foto.html; la principal y el relato no lo piden.
"""
import io, json, math, os, sys, time, urllib.request
import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(AQUI, 'src', 'datos.json')))['terr']
A = 2            # bloques de entorno a cada lado
NV = 64 * (2 * A + 1) + 1   # vértices por lado: el borde del bloque cae justo en una línea de la grilla
TEX = 2048
UA = {'User-Agent': 'relleno-el-salto/entorno (análisis independiente)'}

def my(lat): return math.log(math.tan(math.pi / 4 + lat * math.pi / 360))
MY0, MY1 = my(T['lat0']), my(T['lat1'])

def lon_de(u): return T['lon0'] + u * (T['lon1'] - T['lon0'])
def merc_de(v): return MY0 + v * (MY1 - MY0)          # v = 0 sur, 1 norte
def px(lon, merc, z):
    n = 2 ** z * 256
    return (lon + 180) / 360 * n, (1 - merc / math.pi) / 2 * n

def bajar(url, cache):
    ruta = os.path.join(cache, url.split('://')[1].replace('/', '_'))
    if os.path.exists(ruta): return open(ruta, 'rb').read()
    for intento in range(4):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
            open(ruta, 'wb').write(d); return d
        except Exception as e:
            print('  reintento', url, e); time.sleep(2 + intento * 3)
    raise SystemExit('no se pudo bajar ' + url)

def mosaico(z, url, cache, modo):
    """las teselas que cubren el entorno, pegadas; devuelve la imagen y el píxel global de su esquina"""
    x0, y0 = px(lon_de(-A), merc_de(1 + A), z)
    x1, y1 = px(lon_de(1 + A), merc_de(-A), z)
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
    im = Image.new(modo, ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    tot = (tx1 - tx0 + 1) * (ty1 - ty0 + 1); k = 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            k += 1; print('\r  z%d %d/%d' % (z, k, tot), end='', flush=True)
            t = Image.open(io.BytesIO(bajar(url.format(z=z, x=tx, y=ty), cache))).convert(modo)
            im.paste(t, ((tx - tx0) * 256, (ty - ty0) * 256))
    print()
    return im, tx0 * 256, ty0 * 256

def main():
    cache = sys.argv[1] if len(sys.argv) > 1 else os.path.join('/tmp', 'entorno-teselas')
    os.makedirs(cache, exist_ok=True)

    # ---- elevación ----
    z = 12
    im, ox, oy = mosaico(z, 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', cache, 'RGB')
    a = np.asarray(im).astype(np.float64)
    H = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    out = np.zeros((NV, NV))
    for j in range(NV):                       # fila 0 = norte
        v = (1 + A) - j / 64
        for i in range(NV):
            u = -A + i / 64
            gx, gy = px(lon_de(u), merc_de(v), z)
            x, y = gx - ox - .5, gy - oy - .5
            c0, r0 = int(math.floor(x)), int(math.floor(y)); fc, fr = x - c0, y - r0
            h = (H[r0, c0] * (1 - fc) + H[r0, c0 + 1] * fc) * (1 - fr) + (H[r0 + 1, c0] * (1 - fc) + H[r0 + 1, c0 + 1] * fc) * fr
            out[j, i] = max(0.0, h)
    q = np.clip(np.round((out + 50) * 16), 0, 65535).astype(np.uint32)
    rgb = np.zeros((NV, NV, 3), np.uint8); rgb[..., 0] = q >> 8; rgb[..., 1] = q & 255
    Image.fromarray(rgb, 'RGB').save(os.path.join(AQUI, 'entorno-altura.png'), optimize=True)
    print('entorno-altura.png  %d × %d  · %.0f a %.0f m' % (NV, NV, out.min(), out.max()))

    # ---- imagen ----
    z = 13
    im, ox, oy = mosaico(z, 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', cache, 'RGB')
    x0, y0 = px(lon_de(-A), merc_de(1 + A), z)
    x1, y1 = px(lon_de(1 + A), merc_de(-A), z)
    tex = im.resize((TEX, TEX), Image.LANCZOS, box=(x0 - ox, y0 - oy, x1 - ox, y1 - oy))
    tex.save(os.path.join(AQUI, 'entorno.jpg'), quality=72, optimize=True, progressive=True)
    tex.resize((1024, 1024), Image.LANCZOS).save(os.path.join(AQUI, 'entorno-1024.jpg'), quality=72, optimize=True, progressive=True)
    print('entorno.jpg  %d px · luego: cwebp -q 72 entorno-1024.jpg -o entorno-1024.webp' % TEX)

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Arma index.html desde src/.

    python3 build.py

Empalma shader.js dentro de v3d.js, luego v3d.js y v3d2.js dentro de
plantilla.html (en el marcador "})();\\n</script>"), inyecta
datos.json en el marcador /*__DATOS__*/ y envuelve todo en un HTML completo.
Valida la sintaxis del bloque <script> final si hay node disponible.
"""
import io, os, re, shutil, subprocess, sys, datetime, json, html as htmlmod

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(AQUI, 'src')
URL  = 'https://relleno-el-salto.chacao.workers.dev/'

def leer(n): return io.open(os.path.join(SRC, n), encoding='utf-8').read()

def main():
    h  = leer('plantilla.html')
    v  = leer('v3d.js')      # visor del terreno
    v2 = leer('v3d2.js')     # visor del corte del subsuelo
    sh = leer('shader.js')   # GLSL, se empalma dentro de v3d.js

    ancla = "function hWorld(x,z){return hAt(x/S+0.5,-z/S+0.5)}"
    assert v.count(ancla) == 1, 'ancla del shader no encontrada en v3d.js'
    v = v.replace(ancla, ancla + "\n\n" + sh)

    marca = "})();\n</script>"
    assert h.count(marca) == 1, 'marcador de empalme ausente o duplicado'
    pleno = h.replace(marca, v + "\n" + v2 + "\n" + marca)

    # la maqueta de las obras (maqueta.py), en línea para que siga los colores del modo claro u oscuro
    assert pleno.count('<!--__MAQUETA__-->') == 1, 'marcador de la maqueta ausente en plantilla.html'
    pleno = pleno.replace('<!--__MAQUETA__-->', leer('maqueta.svg'))
    assert pleno.count('/*__DATOS__*/') == 1
    pleno = pleno.replace('/*__DATOS__*/', leer('datos.json'))
    assert pleno.count('/*__PESOS__*/') == 1
    pleno = pleno.replace('/*__PESOS__*/', pesos())
    assert pleno.count('{fecha}') == 1
    pleno = pleno.replace('{fecha}', fecha())

    # el bloque <script> final, comprobado con node si está disponible
    bloque = re.findall(r'<script>(.*?)</script>', pleno, re.S)[-1]
    tmp = os.path.join(AQUI, '.chk.js')
    io.open(tmp, 'w', encoding='utf-8').write(
        "var D={},L={},$=function(){},el=function(){};\n" + bloque)
    try:
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        if r.returncode:
            print(r.stderr[:800]); os.remove(tmp); sys.exit(1)
        print('sintaxis ok')
    except FileNotFoundError:
        print('aviso: node no disponible, sintaxis sin verificar')
    finally:
        if os.path.exists(tmp): os.remove(tmp)

    io.open(os.path.join(AQUI, 'index.html'), 'w', encoding='utf-8').write(envolver(pleno))
    kb = os.path.getsize(os.path.join(AQUI, 'index.html')) / 1024
    print('index.html  %.1f KB  ·  %d secciones' % (kb, pleno.count('<section id=')))

    segunda(h)
    observaciones(h)
    especies(h)
    relato(h, v)
    foto(h, v)
    sitemap()
    solo_produccion()

def tokens(h):
    """El bloque de variables de color de plantilla.html: :root y sus dos variantes
    oscuras. Las páginas secundarias lo reciben inyectado para que la paleta no
    pueda divergir de la principal."""
    i = h.index(':root{')
    j = h.index(':root[data-theme="dark"]{')
    k = h.index('}', h.index('--grid:', j)) + 1
    blo = h[i:k]
    assert blo.count('{') == blo.count('}'), 'bloque de tokens descuadrado'
    return blo

def fuentes(h):
    """Los @font-face autohospedados de plantilla.html, para que la página secundaria
    use las mismas fuentes locales y tampoco se conecte a terceros."""
    i = h.index('<style>\n/* fuentes autohospedadas')
    j = h.index('</style>', i) + len('</style>')
    return h[i:j]

def segunda(h):
    """tramite.html (antes que-puede-pasar.html): el recorrido del expediente, quién decide y sus desenlaces.
    Es estática — no usa datos.json ni los visores 3D — así que sólo hereda los tokens."""
    pg = leer('plazos.html')
    assert pg.count('/*__TOKENS__*/') == 1, 'marcador de tokens ausente en plazos.html'
    pg = pg.replace('/*__TOKENS__*/', tokens(h)).replace('{fecha_iso}', fecha_iso())
    assert pg.count('<!--__FUENTES__-->') == 1, 'marcador de fuentes ausente en plazos.html'
    pg = pg.replace('<!--__FUENTES__-->', fuentes(h))
    destino = os.path.join(AQUI, 'tramite.html')
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('tramite.html  %.1f KB' % (os.path.getsize(destino) / 1024))
    # la dirección anterior ya circuló por WhatsApp y en buscadores: redirige, conservando el ancla
    nueva = URL + 'tramite'
    io.open(os.path.join(AQUI, 'que-puede-pasar.html'), 'w', encoding='utf-8').write(
        '<!doctype html>\n<html lang="es-CL">\n<meta charset="utf-8">\n<title>El trámite del relleno de El Salto</title>\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="robots" content="noindex">\n'
        '<link rel="canonical" href="%s">\n<meta http-equiv="refresh" content="0; url=tramite.html">\n'
        '<script>location.replace("tramite.html"+location.search+location.hash)</script>\n'
        '<p>Esta página ahora está en <a href="tramite.html">%s</a>.</p>\n' % (nueva, nueva))

def observaciones(h):
    """observaciones.html: las observaciones fundadas, con cita y página, listas para copiar.
    Estática como la segunda: hereda tokens y fuentes, y su script se valida con node."""
    pg = leer('observaciones.html')
    assert pg.count('/*__TOKENS__*/') == 1, 'marcador de tokens ausente en observaciones.html'
    pg = pg.replace('/*__TOKENS__*/', tokens(h)).replace('{fecha_iso}', fecha_iso())
    assert pg.count('<!--__FUENTES__-->') == 1, 'marcador de fuentes ausente en observaciones.html'
    pg = pg.replace('<!--__FUENTES__-->', fuentes(h))
    ids = re.findall(r'<article class="obs" id="(obs-[a-z-]+)"', pg)
    assert len(ids) == len(set(ids)), 'id de observación duplicado'
    # cada .pide de la principal que apunta aquí debe encontrar su observación
    for ancla in re.findall(r'observaciones\.html#(obs-[a-z-]+)', h):
        assert ancla in ids, 'la principal enlaza a una observación que no existe: ' + ancla
    bloque = re.findall(r'<script>(.*?)</script>', pg, re.S)[-1]
    tmp = os.path.join(AQUI, '.chk.js')
    io.open(tmp, 'w', encoding='utf-8').write(bloque)
    try:
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        if r.returncode:
            print(r.stderr[:800]); os.remove(tmp); sys.exit(1)
    except FileNotFoundError:
        pass
    finally:
        if os.path.exists(tmp): os.remove(tmp)
    destino = os.path.join(AQUI, 'observaciones.html')
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('observaciones.html  %.1f KB  ·  %d observaciones' % (os.path.getsize(destino) / 1024, len(ids)))

def especies(h):
    """especies.html: las especies que el expediente registra y lo que el proyecto les hace, con foto.
    Estática: hereda tokens y fuentes. Cada foto debe existir y tener crédito en la página."""
    pg = leer('especies.html')
    for marca, valor in (('/*__TOKENS__*/', tokens(h)), ('<!--__FUENTES__-->', fuentes(h))):
        assert pg.count(marca) == 1, 'marcador ausente en especies.html: ' + marca
        pg = pg.replace(marca, valor)
    pg = pg.replace('{fecha_iso}', fecha_iso())
    fotos = re.findall(r'src="(especies/[^"]+)"', pg)
    for foto in fotos:
        assert os.path.exists(os.path.join(AQUI, foto)), 'falta la foto ' + foto
    assert pg.count('class="cred"') >= len(set(fotos)), 'hay fotos sin crédito en especies.html'
    destino = os.path.join(AQUI, 'especies.html')
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('especies.html  %.1f KB  ·  %d fotos' % (os.path.getsize(destino) / 1024, len(set(fotos))))

def pesos():
    """Peso en MB de cada archivo del expediente, por nombre, desde el manifiesto del archivo:
    así el «(PDF · 20 MB)» junto a cada enlace no se escribe a mano ni queda desactualizado."""
    m = json.load(io.open(os.path.join(AQUI, 'expediente', 'manifiesto.json'), encoding='utf-8'))
    d = {}
    for x in m:
        mb = x['bytes'] / 1e6
        d[x['url'].rsplit('/', 1)[-1]] = round(mb, 1) if mb < 10 else round(mb)
    return json.dumps(d, separators=(',', ':'))

def fecha_iso():
    try:
        iso = subprocess.run(['git','log','-1','--format=%cs'], capture_output=True, text=True, cwd=AQUI).stdout.strip()
        return iso or datetime.date.today().isoformat()
    except Exception:
        return datetime.date.today().isoformat()

def texto(h):
    """HTML a texto plano para los datos estructurados."""
    return re.sub(r'\s+', ' ', htmlmod.unescape(re.sub(r'<[^>]+>', '', h))).strip()

def ldjson(pleno):
    """Datos estructurados de la principal. Las preguntas frecuentes se leen del HTML
    visible, así que la versión para buscadores no puede divergir de la que se lee."""
    faq = []
    for q, a in re.findall(r'<details class="pf">\s*<summary>(.*?)</summary>\s*<div class="pr"><p>(.*?)</p>', pleno, re.S):
        faq.append({'@type': 'Question', 'name': texto(q),
                    'acceptedAnswer': {'@type': 'Answer', 'text': texto(a)}})
    assert len(faq) >= 5, 'preguntas frecuentes no encontradas'
    lugar = {'@type': 'Place', '@id': URL + '#lugar', 'name': 'El Salto, Viña del Mar',
             'address': {'@type': 'PostalAddress', 'streetAddress': 'Ruta 60 Troncal Sur km 102,5',
                         'addressLocality': 'Viña del Mar', 'addressRegion': 'Región de Valparaíso',
                         'addressCountry': 'CL'},
             'geo': {'@type': 'GeoCoordinates', 'latitude': -33.0811, 'longitude': -71.4842}}
    g = [
      {'@type': 'WebSite', '@id': URL + '#sitio', 'url': URL, 'name': 'Relleno de El Salto',
       'alternateName': ['Expediente COSEMAR El Salto', 'Relleno sanitario El Salto, Viña del Mar'],
       'inLanguage': 'es-CL'},
      {'@type': 'AnalysisNewsArticle', '@id': URL + '#analisis', 'url': URL, 'isPartOf': {'@id': URL + '#sitio'},
       'headline': 'Lo que dice el expediente del relleno sanitario de El Salto',
       'description': 'Análisis independiente del Estudio de Impacto Ambiental del relleno sanitario de Cosemar SpA '
                      'en El Salto, Viña del Mar (expediente SEIA 2168892026), hecho sobre los documentos del propio titular.',
       'inLanguage': 'es-CL', 'datePublished': '2026-10-20', 'dateModified': fecha_iso(),
       'image': URL + 'social.jpg?v=4', 'license': 'https://creativecommons.org/licenses/by/4.0/',
       'keywords': 'relleno sanitario, El Salto, Viña del Mar, Quilpué, Pompeya Sur, Pompeya Norte, Alto Valencia, '
                   'Población Esperanza, Los Fundadores, Nuevo Horizonte, Botania, Cumbres de Quilpué, Las Lomas, '
                   'El Calichero, Estero Quilpué, Cosemar, SEIA 2168892026, participación ciudadana, '
                   'Estudio de Impacto Ambiental, Región de Valparaíso',
       'author': {'@type': 'Organization', 'name': 'Análisis geoespacial independiente',
                  'url': 'https://github.com/FeniaPfa/relleno-el-salto'},
       'spatialCoverage': {'@id': URL + '#lugar'},
       'contentLocation': [{'@type': 'Place', 'name': n, 'containedInPlace': {'@type': 'City', 'name': c}}
                          for n, c in (('El Salto', 'Viña del Mar'), ('Las Lomas', 'Quilpué'), ('El Calichero', 'Quilpué'),
                                       ('Pompeya Sur', 'Quilpué'))],
       'about': [{'@type': 'Thing', 'name': 'Centro Metropolitano de Gestión Integral de Residuos'},
                 {'@type': 'Organization', 'name': 'Cosemar SpA'}],
       'mentions': [{'@type': 'GovernmentOrganization', 'name': 'Servicio de Evaluación Ambiental',
                     'url': 'https://www.sea.gob.cl'}],
       'isBasedOn': ['https://seia.sea.gob.cl/expediente/ficha/fichaPrincipal.php?modo=ficha&id_expediente=2168892026']},
      lugar,
      {'@type': 'Dataset', '@id': URL + '#archivo',
       'name': 'Archivo en texto del expediente SEIA 2168892026, relleno sanitario de El Salto',
       'description': ('Copia en texto plano de los documentos que el Servicio de Evaluación Ambiental publicó del '
                       'expediente 2168892026 (Centro Metropolitano de Gestión Integral de Residuos, Cosemar SpA): '
                       '60 documentos y 97 adjuntos, con un manifiesto de URL, tamaño y SHA-256 de cada original.'),
       'url': 'https://github.com/FeniaPfa/relleno-el-salto/tree/main/expediente',
       'isAccessibleForFree': True, 'inLanguage': 'es-CL',
       'creator': {'@type': 'Organization', 'name': 'Análisis geoespacial independiente', 'url': 'https://github.com/FeniaPfa/relleno-el-salto'},
       'isBasedOn': 'https://seia.sea.gob.cl/expediente/ficha/fichaPrincipal.php?modo=ficha&id_expediente=2168892026',
       'spatialCoverage': {'@id': URL + '#lugar'}, 'temporalCoverage': '2026',
       'keywords': ['relleno sanitario', 'evaluación ambiental', 'SEIA', 'El Salto', 'Viña del Mar', 'Quilpué'],
       'distribution': [{'@type': 'DataDownload', 'encodingFormat': 'text/plain',
                         'contentUrl': 'https://github.com/FeniaPfa/relleno-el-salto/tree/main/expediente/texto'}]},
      {'@type': 'FAQPage', '@id': URL + '#preguntas', 'url': URL + '#preguntas', 'inLanguage': 'es-CL',
       'mainEntity': faq},
    ]
    return json.dumps({'@context': 'https://schema.org', '@graph': g}, ensure_ascii=False, separators=(',', ':'))

def bloque_div(h, inicio):
    """Desde `inicio` hasta el </div> que lo cierra."""
    i = h.index(inicio); prof = 0
    for m in re.finditer(r'<div\b|</div>', h[i:]):
        prof += 1 if m.group(0) != '</div>' else -1
        if prof == 0:
            return h[i:i + m.end()]
    raise ValueError('bloque sin cerrar')

def css_principal(h):
    """El <style> principal de plantilla.html (el que trae los colores)."""
    for m in re.finditer(r'<style>.*?</style>', h, re.S):
        if ':root{' in m.group(0):
            return m.group(0)
    raise ValueError('sin CSS principal')

def escena_js():
    """La escena «vestida» (satélite, masa escalonada, obras, rótulos) que comparten el relato y el modo foto.
    Se empalma dentro del IIFE de cada página: usa D, L, VISOR, P, WEBP y angosto de su ámbito."""
    return leer('escena.js').rstrip('\n')

def con_visor(n, h, visor_js):
    """Las páginas que reutilizan el visor del terreno tal cual (relato.html y foto.html): su marcado, su CSS,
    su código, la escena vestida y los datos salen de las mismas fuentes que la principal."""
    pg = leer(n)
    for marca, valor in (('<!--__FUENTES__-->', fuentes(h)), ('<!--__CSS__-->', css_principal(h)),
                         ('<!--__VISOR_HTML__-->', bloque_div(h, '<div class="v3">')),
                         ('/*__VISOR_JS__*/', visor_js), ('  /*__ESCENA_JS__*/', escena_js()),
                         ('/*__DATOS__*/', leer('datos.json'))):
        assert pg.count(marca) == 1, 'marcador ausente en %s: %s' % (n, marca)
        pg = pg.replace(marca, valor)
    destino = os.path.join(AQUI, n)
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('%s  %.1f KB' % (n, os.path.getsize(destino) / 1024))

def relato(h, visor_js):
    """relato.html: el recorrido con scroll."""
    assert leer('relato.html').count('{fecha_iso}') == 1, 'fecha ausente en el JSON-LD de relato.html'
    con_visor('relato.html', h, visor_js)
    destino = os.path.join(AQUI, 'relato.html')
    pg = io.open(destino, encoding='utf-8').read()
    io.open(destino, 'w', encoding='utf-8').write(pg.replace('{fecha_iso}', fecha_iso(), 1))

def foto(h, visor_js):
    """foto.html: el modo foto. La misma escena del relato, en el año 25, con cámara libre y captura."""
    con_visor('foto.html', h, visor_js)

# GitHub Pages publica la rama dev como copia de prueba, y Cloudflare publica main. Los dos sirven
# los mismos archivos, así que el «no indexar» se decide al cargar, según el dominio: en github.io
# la página se marca noindex (y cualquier robots que traiga, también); en producción no hace nada.
NO_INDEXAR_DEV = ('<script>/* copia de prueba en GitHub Pages (rama dev): que los buscadores no la indexen */'
    "if(/\\.github\\.io$/.test(location.hostname)){var m=document.createElement('meta');m.name='robots';"
    "m.content='noindex,nofollow';document.head.appendChild(m);addEventListener('DOMContentLoaded',function(){"
    "[].forEach.call(document.querySelectorAll('meta[name=robots]'),function(x){x.content='noindex,nofollow'})})}</script>\n")

def solo_produccion():
    for n in ('index.html', 'observaciones.html', 'especies.html', 'relato.html', 'foto.html', 'tramite.html', 'que-puede-pasar.html'):
        ruta = os.path.join(AQUI, n)
        pg = io.open(ruta, encoding='utf-8').read()
        marca = '<meta charset="utf-8">\n'
        assert pg.count(marca) == 1, 'falta <meta charset> en ' + n
        io.open(ruta, 'w', encoding='utf-8').write(pg.replace(marca, marca + NO_INDEXAR_DEV))

def sitemap():
    f = fecha_iso()
    xs = ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (URL + p, f) for p in ('', 'observaciones', 'especies', 'relato', 'tramite'))
    io.open(os.path.join(AQUI, 'sitemap.xml'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + xs + '</urlset>\n')

def fecha():
    """Fecha del último commit, en palabras; si no hay git, la de hoy."""
    try:
        iso = subprocess.run(['git','log','-1','--format=%cs'], capture_output=True, text=True, cwd=AQUI).stdout.strip()
        d = datetime.date.fromisoformat(iso) if iso else datetime.date.today()
    except Exception:
        d = datetime.date.today()
    meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    return '%d de %s de %d' % (d.day, meses[d.month-1], d.year)

def envolver(s):
    """El fragmento se escribió para el envoltorio de los artifacts; aquí hay que ponerlo."""
    i = s.index('</style>') + len('</style>')
    cabeza, cuerpo = s[:i], s[i:]
    cabeza = cabeza.replace('<meta charset="utf-8">\n', '', 1)
    reset = ('<style>\n:root{color-scheme:light dark}\n*{box-sizing:border-box}\n'
             'html{-webkit-text-size-adjust:100%}\nbody{margin:0}\nimg{max-width:100%}\n'
             '[hidden]{display:none!important}\n</style>')
    social = io.open(os.path.join(SRC, 'social.html'), encoding='utf-8').read()
    social = social.replace('{ldjson}', ldjson(s)).replace('{url}', URL)
    return ('<!DOCTYPE html>\n<html lang="es-CL">\n<head>\n<meta charset="utf-8">\n'
            + cabeza.strip() + '\n' + social + reset
            + '\n</head>\n<body>\n' + cuerpo.strip() + '\n</body>\n</html>\n')

if __name__ == '__main__':
    main()

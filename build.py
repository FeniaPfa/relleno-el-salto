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
URL  = 'https://feniapfa.github.io/seia-data/'

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
    relato(h, v)
    sitemap()

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
    """que-puede-pasar.html: el recorrido del expediente y sus desenlaces.
    Es estática — no usa datos.json ni los visores 3D — así que sólo hereda los tokens."""
    pg = leer('plazos.html')
    assert pg.count('/*__TOKENS__*/') == 1, 'marcador de tokens ausente en plazos.html'
    pg = pg.replace('/*__TOKENS__*/', tokens(h)).replace('{fecha_iso}', fecha_iso())
    assert pg.count('<!--__FUENTES__-->') == 1, 'marcador de fuentes ausente en plazos.html'
    pg = pg.replace('<!--__FUENTES__-->', fuentes(h))
    destino = os.path.join(AQUI, 'que-puede-pasar.html')
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('que-puede-pasar.html  %.1f KB' % (os.path.getsize(destino) / 1024))

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
      {'@type': 'WebSite', '@id': URL + '#sitio', 'url': URL, 'name': 'Expediente COSEMAR El Salto',
       'inLanguage': 'es-CL'},
      {'@type': 'AnalysisNewsArticle', '@id': URL + '#analisis', 'url': URL, 'isPartOf': {'@id': URL + '#sitio'},
       'headline': 'Lo que dice el expediente del relleno sanitario de El Salto',
       'description': 'Análisis independiente del Estudio de Impacto Ambiental del relleno sanitario de Cosemar SpA '
                      'en El Salto, Viña del Mar (expediente SEIA 2168892026), hecho sobre los documentos del propio titular.',
       'inLanguage': 'es-CL', 'datePublished': '2026-10-20', 'dateModified': fecha_iso(),
       'image': URL + 'social.jpg?v=2', 'license': 'https://creativecommons.org/licenses/by/4.0/',
       'keywords': 'relleno sanitario, El Salto, Viña del Mar, Quilpué, Pompeya Sur, Pompeya Norte, Alto Valencia, '
                   'Población Esperanza, Los Fundadores, Nuevo Horizonte, Botania, Cumbres de Quilpué, Las Lomas, '
                   'El Calichero, Estero Quilpué, Cosemar, SEIA 2168892026, participación ciudadana, '
                   'Estudio de Impacto Ambiental, Región de Valparaíso',
       'author': {'@type': 'Organization', 'name': 'Análisis geoespacial independiente',
                  'url': 'https://github.com/FeniaPfa/seia-data'},
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

def relato(h, visor_js):
    """relato.html: el recorrido con scroll. Reutiliza el visor del terreno tal cual:
    su marcado, su CSS, su código y los datos salen de las mismas fuentes que la principal."""
    pg = leer('relato.html')
    for marca, valor in (('<!--__FUENTES__-->', fuentes(h)), ('<!--__CSS__-->', css_principal(h)),
                         ('<!--__VISOR_HTML__-->', bloque_div(h, '<div class="v3">')),
                         ('/*__VISOR_JS__*/', visor_js), ('/*__DATOS__*/', leer('datos.json'))):
        assert pg.count(marca) == 1, 'marcador ausente en relato.html: ' + marca
        pg = pg.replace(marca, valor)
    destino = os.path.join(AQUI, 'relato.html')
    io.open(destino, 'w', encoding='utf-8').write(pg)
    print('relato.html  %.1f KB' % (os.path.getsize(destino) / 1024))

def sitemap():
    f = fecha_iso()
    xs = ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>\n' % (URL + p, f) for p in ('', 'que-puede-pasar.html'))
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

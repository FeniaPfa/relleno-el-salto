"""Verificación mecánica de citas del sitio contra expediente/texto/.

Para cada «cita» de las páginas fuente:
  - ¿existe literalmente en algún documento del expediente? (espacios normalizados; […] parte la cita)
  - si el bloque que la contiene enlaza documentos del SEIA: ¿está en alguno de ellos?
  - si el bloque menciona páginas («p. 12», «pp. 3-5», «#page=12»): ¿aparece en alguna de esas páginas?
Las páginas del PDF son el marcador + 1.
Uso: python3 verifica_citas.py  (desde la raíz; requiere beautifulsoup4) → informe en stdout

Los marcados no siempre son errores: términos de interfaz entre «», normas externas (D.S. 189,
Ley 19.300), celdas de tabla unidas con «·», y texto con tildes rotas por la extracción del PDF
(«disposici´on»). Cada marcado hay que mirarlo a mano.
"""
import re, io, glob, json, os, sys, html as H
from bs4 import BeautifulSoup

RAIZ = os.getcwd()
def norm(s):
    s = s.replace('­', '').replace('​', '').replace('ﬁ', 'fi').replace('ﬂ', 'fl')
    s = re.sub(r'[“”"]', '"', s); s = re.sub(r"[‘’']", "'", s)
    s = re.sub(r'\s*-\s*\n\s*', '', s)  # guiones de corte de línea
    return re.sub(r'\s+', ' ', s).strip().lower()

# --- textos por documento y página
DOCS = {}
for f in glob.glob('expediente/texto/*.txt'):
    s = io.open(f, encoding='utf-8', errors='ignore').read()
    parts = re.split(r'===== p\.(\d+)[^=]*=====', s)
    pags = {}
    if len(parts) == 1: pags[1] = norm(s)
    for i in range(1, len(parts), 2): pags[int(parts[i]) + 1] = norm(parts[i + 1])
    DOCS[os.path.basename(f)] = pags
for f in glob.glob('expediente/paginas/*.md'):
    DOCS['paginas/' + os.path.basename(f)] = {1: norm(io.open(f, encoding='utf-8', errors='ignore').read())}
JUNTO = {k: ' '.join(v[p] for p in sorted(v)) for k, v in DOCS.items()}

# --- URL → archivos de texto
M = json.load(open('expediente/manifiesto.json'))
items = []
def recorre(x):
    if isinstance(x, dict):
        if 'url' in x and 'archivo' in x: items.append(x)
        for v in x.values(): recorre(v)
    elif isinstance(x, list):
        for v in x: recorre(v)
recorre(M)
URL2TXT = {}
for it in items:
    stem = re.sub(r'\.(pdf|rar|zip|docx|xlsx|kmz)$', '', it['archivo'], flags=re.I)
    cands = [k for k in DOCS if k == stem + '.txt' or k.startswith(stem + ' __ ') or k == it['archivo'] + '.txt']
    URL2TXT[it['url'].split('#')[0]] = cands

def donde(q):
    """[(doc, pagina)] donde aparece q (normalizada)."""
    out = []
    for d, txt in JUNTO.items():
        if q in txt:
            ps = [p for p, t in DOCS[d].items() if q in t]
            out.append((d, ps or ['cruza']))
    return out

def paginas_citadas(bloque_html, texto):
    ps = set()
    for m in re.finditer(r'#page=(\d+)', bloque_html): ps.add(int(m.group(1)))
    for m in re.finditer(r'\bpp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?((?:\s*(?:,|y)\s*\d+)*)', texto):
        a = int(m.group(1)); b = int(m.group(2)) if m.group(2) else a
        ps.update(range(a, b + 1))
        for x in re.findall(r'\d+', m.group(3) or ''): ps.add(int(x))
    return ps

BLOQUES = ['blockquote', 'li', 'td', 'figcaption', 'p', 'dd', 'article', 'details', 'section', 'div', 'aside']
def bloque_de(nodo):
    """el ancestro más chico que tenga enlaces al SEIA; si ninguno, el párrafo."""
    primero = None
    for a in nodo.parents:
        if a.name in BLOQUES:
            if primero is None: primero = a
            if a.find('a', href=re.compile(r'seia\.sea\.gob\.cl')): return a
            if a.name in ('article', 'section'): break
    return primero

def revisar(ruta):
    raw = io.open(ruta, encoding='utf-8').read()
    soup = BeautifulSoup(raw, 'html.parser')
    for t in soup(['script', 'style']): t.decompose()
    filas = []
    vistos = set()
    for nodo in soup.find_all(string=re.compile('«')):
        par = nodo.parent
        if par is None: continue
        cont = par
        # el texto del elemento (sin partir las citas que cruzan <b>, <i>)
        for a in par.parents:
            if a.name in BLOQUES: cont = a; break
        texto = H.unescape(cont.get_text(''))
        for m in re.finditer(r'«([^»]{4,})»', texto):
            cita = m.group(1)
            clave = (cita, id(cont))
            if clave in vistos: continue
            vistos.add(clave)
            b = bloque_de(nodo) or cont
            bhtml = str(b); btxt = b.get_text(' ')
            urls = [x['href'].split('#')[0] for x in b.find_all('a', href=True) if 'seia.sea.gob.cl' in x['href']]
            docs_enl = sorted({d for u in urls for d in URL2TXT.get(u, [])})
            pags = paginas_citadas(bhtml, btxt)
            trozos = [norm(t).strip(' .,;:') for t in re.split(r'\s*(?:\[(?:…|\.\.\.)\]|\((?:…|\.\.\.)\)|…|\[sic\])\s*', cita)]
            trozos = [t for t in trozos if len(t) >= 6]
            if not trozos: continue
            estado = 'OK'; detalle = ''
            res = [donde(t) for t in trozos]
            if any(not r for r in res):
                estado = 'NO_ENCONTRADA'
                detalle = 'trozo ausente: ' + ' | '.join(t[:70] for t, r in zip(trozos, res) if not r)
            elif docs_enl:
                en_enl = [[x for x in r if x[0] in docs_enl] for r in res]
                if any(not e for e in en_enl):
                    estado = 'OTRO_DOC'
                    detalle = 'está en: ' + '; '.join('%s p.%s' % (d[:45], ','.join(map(str, p[:4]))) for r in res for d, p in r[:3])
                elif pags:
                    ok = all(any((p == 'cruza') or (p in pags) or (p - 1 in pags) for d, ps in e for p in ps) for e in en_enl)
                    if not ok:
                        estado = 'OTRA_PAG'
                        detalle = 'citada %s; está en %s' % (sorted(pags)[:8], '; '.join('%s p.%s' % (d[:40], ','.join(map(str, ps[:5]))) for e in en_enl for d, ps in e[:2]))
            else:
                detalle = 'sin enlace en el bloque; está en ' + '; '.join('%s p.%s' % (d[:40], ','.join(map(str, p[:3]))) for d, p in res[0][:2])
            filas.append((estado, cita, detalle, docs_enl))
    return filas

if __name__ == '__main__':
    rutas = sys.argv[1:] or ['src/plantilla.html', 'src/observaciones.html', 'src/plazos.html', 'src/relato.html', 'src/especies.html', 'llms.txt']
    tot = {}
    for r in rutas:
        if r.endswith('.txt'):
            # llms.txt: texto plano, solo existencia
            s = io.open(r, encoding='utf-8').read()
            filas = []
            for m in re.finditer(r'«([^»]{4,})»', s):
                trozos = [norm(t).strip(' .,;:') for t in re.split(r'\s*(?:\[(?:…|\.\.\.)\]|\((?:…|\.\.\.)\)|…|\[sic\])\s*', m.group(1).replace('\n> ',' '))]
                trozos = [t for t in trozos if len(t) >= 6]
                if trozos and any(not donde(t) for t in trozos): filas.append(('NO_ENCONTRADA', m.group(1), '', []))
                else: filas.append(('OK', m.group(1), '', []))
        else:
            filas = revisar(r)
        print('\n########', r, '·', len(filas), 'citas')
        for e, c, d, docs in filas:
            tot[e] = tot.get(e, 0) + 1
            if e != 'OK' or (d and d.startswith('sin enlace') and '--todo' in sys.argv):
                print('  [%s] «%s»\n        %s' % (e, c[:150], d))
    print('\nTOTAL', tot)

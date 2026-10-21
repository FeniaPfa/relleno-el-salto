import json,io,os,re,collections,datetime
SAL='sitio/expediente'
man=json.load(io.open('archivo/manifiesto.json',encoding='utf-8'))

# cuantas paginas quedaron sin texto, para declararlo arriba y no esconderlo
PAGS=ESC=0; ESCLIST=[]
for f in os.listdir(SAL+'/texto'):
    if not f.endswith('.txt'): continue
    t=io.open(SAL+'/texto/'+f,encoding='utf-8',errors='replace').read()
    np=len(re.findall(r'\n===== p\.\d+[^=]*=====\n',t))
    if not np: continue
    v=t.count('\u00b7 sin texto'); PAGS+=np; ESC+=v
    if v: ESCLIST.append((v,np,f))
ESCLIST.sort(reverse=True)
docs=json.load(io.open('archivo/documentos.json',encoding='utf-8'))
inf=json.load(io.open('archivo/informe_extraccion.json',encoding='utf-8'))
limpia=lambda s: re.sub(r'[^\w.\- ]','_',s)[:120].strip()

# que texto produjo cada binario
porfuente=collections.defaultdict(list)
for et,tipo,nota in inf:
    raiz=et.split(' :: ')[0]
    porfuente[raiz].append((et,tipo,nota))
existe=set(os.listdir(SAL+'/texto'))
def ruta(et):
    for ext in ('txt','kml','csv','xml'):
        f='%s.%s'%(limpia(et),ext)
        if f in existe: return 'texto/'+f
    return None

pormam=collections.defaultdict(list)
for m in man: pormam[m['documento']].append(m)

L=(['# Expediente SEIA 2168892026 — archivo completo','',
   'Proyecto **Centro Metropolitano de Gestión Integral de Residuos**, COSEMAR SpA,',
   'El Salto, Viña del Mar. Copia de todo lo que el SEIA publicaba en el expediente',
   'al **%s**.'%datetime.date.today().strftime('%d-%m-%Y'),'',
   'Se archiva porque el expediente es una página web que el servicio puede cambiar o',
   'retirar. Aquí está el texto; los binarios originales no caben en el repositorio',
   '(1,5 GB) y `manifiesto.json` guarda la URL y el SHA-256 de cada uno para rebajarlos',
   'y comprobar que son los mismos.','',
   '## Qué hay','',
   '| | |','|---|---|',
   '| Documentos del expediente | **%d** |'%len(docs),
   '| Archivos adjuntos | **%d** (%.1f GB) |'%(len(man),sum(m['bytes'] for m in man)/1e9),
   '| Piezas con texto extraído | **%d** |'%len([x for x in inf if x[1] in ('pdf','kml','csv','xml','kmz','html')]),
   '| Páginas de PDF | **%d** |'%PAGS,
   '| De ellas, escaneadas (sin capa de texto) | **%d** (%.1f %%) |'%(ESC,100.*ESC/max(PAGS,1)),'',
   '> **Las páginas escaneadas salen vacías, y están marcadas así.** En `texto/` aparecen',
   '> como `===== p.N · sin texto =====`. Son imágenes: oficios de servicios firmados,',
   '> consentimientos de entrevistas, certificados, planos. El texto se puede recuperar con',
   '> OCR —`OCR=1 python3 archivo/extraer.py`— pero eso no está hecho todavía.','',
   '### Los más afectados','',
   '| archivo | escaneadas / total |','|---|---|']+
   ['| `%s` | %d / %d%s |'%(f[:78],v,n,' · **entero**' if v==n else '') for v,n,f in ESCLIST[:12]]+
   ['',
   '`texto/` — un archivo por PDF, incluidos los que venían dentro de un .rar o .zip.',
   'El nombre es `contenedor __ ruta_interna`.','',
   '`paginas/` — los %d documentos que en el SEIA **sólo existen como página web**'%len(os.listdir(SAL+'/paginas')),
   '(resoluciones, notificaciones, actas, cartas), convertidos a Markdown.','',
   '## Los documentos, en orden de ingreso',''])
for d in docs:
    arch=pormam.get(d['n'],[])
    cab='### %d. %s'%(d['n'],d['tipo'] or '(sin tipo)')
    L+= [cab,'']
    meta=[]
    if d.get('fecha'):  meta.append('**%s**'%d['fecha'])
    if d.get('emisor'): meta.append(d['emisor'])
    if d.get('folio'):  meta.append('folio `%s`'%d['folio'])
    if meta: L+= [' · '.join(meta),'']
    idd=d.get('idDocumento')
    if idd and os.path.exists('%s/paginas/%s.md'%(SAL,idd)):
        L.append('- Documento: [`paginas/%s.md`](paginas/%s.md) · '
                 '[original](https://seia.sea.gob.cl/documentos/documento.php?idDocumento=%s)'%(idd,idd,idd))
    for a in arch:
        r=None
        for et,tipo,nota in porfuente.get(a['archivo'].rsplit('.',1)[0],[]):
            if tipo=='contenedor': continue
            rr=ruta(et)
            if rr: r=rr; break
        piezas=[x for x in porfuente.get(a['archivo'].rsplit('.',1)[0],[]) if x[1]!='contenedor']
        nom=a.get('nombre') or a['archivo']
        linea='- **%s** — `%s`, %.1f MB'%(nom[:90],a['archivo'],a['bytes']/1e6)
        if len(piezas)>1: linea+=' · %d piezas'%len(piezas)
        elif r: linea+=' · [`%s`](%s)'%(r,r.replace(' ','%20'))
        linea+=' · [original](%s)'%a['url']
        L.append(linea)
        if len(piezas)>1:   # un .rar/.zip: enumera lo que traia dentro
            for et,tipo,nota in sorted(piezas):
                rr=ruta(et); dentro=et.split(' :: ',1)[-1]
                if rr: L.append('  - [`%s`](%s)'%(dentro,rr.replace(' ','%20')))
                else:  L.append('  - `%s` — %s, sin texto'%(dentro,tipo))
    L.append('')
io.open(SAL+'/INDICE.md','w',encoding='utf-8').write('\n'.join(L))
json.dump(man,io.open(SAL+'/manifiesto.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('INDICE.md: %d lineas · manifiesto.json: %d archivos'%(len(L),len(man)))

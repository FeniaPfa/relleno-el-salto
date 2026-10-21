"""Genera expediente/PENDIENTE-OCR.md: las paginas escaneadas que siguen sin texto.
Se regenera despues de cada extraccion; si el OCR ya corrio, la lista se vacia sola."""
import os,io,re,json,collections

SAL='sitio/expediente'
man=json.load(io.open('archivo/manifiesto.json',encoding='utf-8'))
limpia=lambda s: re.sub(r'[^\w.\- ]','_',s)[:120].strip()

# de que documento del expediente viene cada adjunto
dedonde={}
for m in man: dedonde[m['archivo'].rsplit('.',1)[0]]=m

filas=[]
for f in sorted(os.listdir(SAL+'/texto')):
    if not f.endswith('.txt'): continue
    t=io.open(SAL+'/texto/'+f,encoding='utf-8',errors='replace').read()
    np=len(re.findall(r'\n===== p\.\d+[^=]*=====\n',t))
    v=t.count('· sin texto')
    if not v: continue
    raiz=f[:-4].split(' __ ')[0]
    m=dedonde.get(raiz,{})
    filas.append({'txt':f,'esc':v,'pag':np,'doc':m.get('tipo',''),
                  'emisor':m.get('emisor',''),'fecha':m.get('fecha',''),
                  'url':m.get('url',''),'adj':m.get('archivo',raiz)})

filas.sort(key=lambda r:(-(r['esc']==r['pag']),-r['esc']))
tot=sum(r['esc'] for r in filas)
porDoc=collections.Counter(r['doc'] or '(sin tipo)' for r in filas)

L=['# Pendiente: OCR de las páginas escaneadas','',
   'Generado por `archivo/pendientes.py`. **No editar a mano**: se regenera tras cada',
   'extracción, y cuando el OCR haya corrido esta lista se vacía sola.','',
   '## Qué falta','',
   'En el archivo hay **%d páginas** repartidas en **%d archivos** que son imágenes sin'%(tot,len(filas)),
   'capa de texto. En `texto/` aparecen como `===== p.N · sin texto =====`: el hueco está',
   'señalizado, pero el contenido no está.','',
   'Para extraerlas:','','```bash',
   'brew install tesseract tesseract-lang   # si no está',
   'OCR=1 python3 archivo/extraer.py        # vuelve a extraerlo todo, ahora con OCR',
   'python3 archivo/indexar.py',
   'python3 archivo/pendientes.py','```','',
   'Tarda bastante más que la extracción normal. Antes de lanzarlo conviene leer el',
   'apartado de OCR en [`../archivo/LEEME.md`](../archivo/LEEME.md): hay dos topes',
   'medidos (150 dpi y 3.500 px de lado) sin los cuales pasa de minutos a horas.','',
   '## Lo que más importa','',
   'No todo vale lo mismo. Por tipo de documento del expediente:','',
   '| documento | archivos afectados |','|---|---|']
for k,v in porDoc.most_common(): L.append('| %s | %d |'%(k,v))
L+=['',
   'Los **oficios de pronunciamiento** son los que pesan: son la opinión de un servicio',
   'del Estado sobre el proyecto, y escaneados no se pueden citar ni buscar. El resto',
   '—certificados, consentimientos firmados, personerías— es papeleo. De los **planos**',
   'el OCR no sacará nada útil: ahí la laguna es real.','',
   '## La lista','',
   '| archivo en `texto/` | escaneadas | de | viene de | original |',
   '|---|---|---|---|---|']
for r in filas:
    marca=' **(entero)**' if r['esc']==r['pag'] else ''
    proc='%s%s'%(r['doc'] or '—',(' · '+r['emisor']) if r['emisor'] else '')
    url='[%s](%s)'%(r['adj'][:34],r['url']) if r['url'] else r['adj'][:34]
    L.append('| `%s`%s | %d | %d | %s | %s |'%(r['txt'][:70],marca,r['esc'],r['pag'],proc[:52],url))
L.append('')
io.open(SAL+'/PENDIENTE-OCR.md','w',encoding='utf-8').write('\n'.join(L))
print('PENDIENTE-OCR.md: %d archivos · %d paginas'%(len(filas),tot))

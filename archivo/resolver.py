"""Resuelve cada documento del expediente SEIA a la lista de archivos que cuelgan de el."""
import re,io,json,os,time,urllib.request,html

EXP='2168892026'
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
BASE='https://seia.sea.gob.cl'

def baja(url,intentos=3):
    for i in range(intentos):
        try:
            rq=urllib.request.Request(url,headers={'User-Agent':UA,'Referer':BASE+'/','Accept-Language':'es-CL,es'})
            with urllib.request.urlopen(rq,timeout=90) as r: return r.read().decode('latin-1')
        except Exception as e:
            if i==intentos-1: return ''
            time.sleep(3*(i+1))
    return ''

lim=lambda x: html.unescape(re.sub(r'<[^>]+>','',x)).replace('\xa0',' ').strip()
filas=json.load(io.open('archivo/listado.json',encoding='utf-8'))
salida=[]
for n,f in enumerate(filas,1):
    c=f['celdas']
    meta={'n':n,'folio':c[2] if len(c)>2 else '','tipo':c[3] if len(c)>3 else '',
          'emisor':c[4] if len(c)>4 else '','fecha':c[6] if len(c)>6 else '','archivos':[]}
    vistos=set()
    for h in f['enlaces']:
        if '/archivos/' in h:
            u=h if h.startswith('http') else BASE+h
            if u not in vistos: vistos.add(u); meta['archivos'].append({'url':u,'via':'directo'})
            continue
        m=re.search(r'idDocumento=(\d+)',h)
        if not m: continue
        idd=m.group(1); meta['idDocumento']=idd
        # 1) la pagina del documento
        p=baja(BASE+'/documentos/documento.php?idDocumento='+idd)
        for u in re.findall(r"['\"](/archivos/[^'\"]+)['\"]",p):
            uu=BASE+u
            if uu not in vistos: vistos.add(uu); meta['archivos'].append({'url':uu,'via':'documento'})
        if not meta.get('titulo'):
            t=re.search(r'<title>(.*?)</title>',p,re.S)
            if t: meta['titulo']=lim(t.group(1))
        # 2) los elementos fisicos (anexos)
        e=baja(BASE+'/elementosFisicos/enviados.php?id_documento='+idd)
        for u,nom in re.findall(r"href=['\"](/archivos/[^'\"]+)['\"][^>]*>(.*?)</a>",e,re.S):
            uu=BASE+u
            if uu not in vistos:
                vistos.add(uu); meta['archivos'].append({'url':uu,'via':'anexo','nombre':lim(nom)})
        time.sleep(0.7)
    salida.append(meta)
    print('%2d/%d  %-46s %2d archivos'%(n,len(filas),(meta['tipo'] or '?')[:46],len(meta['archivos'])),flush=True)

json.dump(salida,io.open('archivo/documentos.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
tot=sum(len(d['archivos']) for d in salida)
print('\n%d documentos · %d archivos distintos'%(len(salida),tot))

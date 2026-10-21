"""Baja todo el expediente SEIA: los archivos adjuntos y la pagina HTML de cada documento.
Reanudable: lo que ya esta descargado y pesa lo mismo, no se vuelve a pedir."""
import json,io,os,re,time,hashlib,shutil,glob,urllib.request

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
BASE='https://seia.sea.gob.cl'
D=json.load(io.open('archivo/documentos.json',encoding='utf-8'))

# lo ya bajado en sesiones anteriores, por nombre de archivo
local={}
for p in glob.glob('doc/*')+glob.glob('data/docs/*'):
    if os.path.isfile(p): local.setdefault(os.path.basename(p),p)

def pide(url,binario=True,intentos=4):
    for i in range(intentos):
        try:
            rq=urllib.request.Request(url,headers={'User-Agent':UA,'Referer':BASE+'/'})
            with urllib.request.urlopen(rq,timeout=300) as r:
                return r.read() if binario else r.read().decode('latin-1')
        except Exception as e:
            if i==intentos-1: print('    FALLO %s -> %s'%(url[-60:],e),flush=True); return None
            time.sleep(5*(i+1))

sha=lambda b: hashlib.sha256(b).hexdigest()
man=[]
for d in D:
    idd=d.get('idDocumento')
    # 1) la pagina del documento: para 41 de 60, el documento ES esta pagina
    if idd:
        dst='archivo/paginas/%s.html'%idd
        if not os.path.exists(dst):
            h=pide(BASE+'/documentos/documento.php?idDocumento='+idd,binario=False)
            if h: io.open(dst,'w',encoding='utf-8').write(h); time.sleep(.6)
    # 2) los adjuntos
    for a in d['archivos']:
        u=a['url']; rel=u.split('/archivos/',1)[-1]; base=rel.rsplit('/',1)[-1]
        dst='archivo/bin/'+base
        if not os.path.exists(dst):
            if base in local:
                shutil.copy2(local[base],dst)                     # ya estaba bajado
            else:
                b=pide(u)
                if b is None: continue
                io.open(dst,'wb').write(b); time.sleep(1.0)
        n=os.path.getsize(dst)
        man.append({'documento':d['n'],'idDocumento':idd,'tipo':d['tipo'],'emisor':d['emisor'],
                    'fecha':d['fecha'],'folio':d['folio'],'nombre':a.get('nombre',''),
                    'archivo':base,'url':u,'bytes':n,
                    'sha256':sha(io.open(dst,'rb').read())})
        print('%-54s %9d B'%(base[:54],n),flush=True)

json.dump(man,io.open('archivo/manifiesto.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('\n%d archivos · %.1f GB'%(len(man),sum(m['bytes'] for m in man)/1e9))

"""Convierte todo lo descargado a texto plano. Los contenedores (.rar/.zip) se abren
en un directorio propio y se recorre lo que traigan dentro."""
import os,io,re,sys,json,html,zipfile,subprocess,shutil,tempfile
import fitz   # PyMuPDF

SAL='sitio/expediente'
os.makedirs(SAL+'/texto',exist_ok=True); os.makedirs(SAL+'/paginas',exist_ok=True)
limpia=lambda s: re.sub(r'[^\w.\- ]','_',s)[:120].strip()

def pdf_txt(p):
    try: d=fitz.open(p)
    except Exception as e: return None,'no abre: %s'%e
    out=[]
    for i,pg in enumerate(d):
        t=pg.get_text()
        out.append('\n===== p.%d =====\n%s'%(i,t))
    txt=''.join(out)
    vacio = len(re.sub(r'\s','',txt))<60*d.page_count/10   # casi sin texto -> escaneado
    return txt,('escaneado o sin capa de texto (%d pag)'%d.page_count if vacio else None)

def html_md(p):
    s=io.open(p,encoding='utf-8',errors='replace').read()
    s=re.sub(r'(?is)<(script|style|head)[^>]*>.*?</\1>',' ',s)
    s=re.sub(r'(?i)<br\s*/?>','\n',s); s=re.sub(r'(?i)</(p|div|tr|h\d|li)>','\n',s)
    s=re.sub(r'(?i)</t[dh]>',' | ',s)
    s=html.unescape(re.sub(r'<[^>]+>','',s))
    s=re.sub(r'[ \t\xa0]+',' ',s); s=re.sub(r'\n\s*\n\s*\n+','\n\n',s)
    return s.strip()

def abre_contenedor(p,dst):
    os.makedirs(dst,exist_ok=True)
    if p.lower().endswith('.zip'):
        try:
            with zipfile.ZipFile(p) as z: z.extractall(dst)
            return True
        except Exception: pass
    r=subprocess.run(['bsdtar','-xf',os.path.abspath(p)],cwd=dst,
                     stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    return r.returncode==0

def recorre(raiz):
    for dp,_,fs in os.walk(raiz):
        for f in fs: yield os.path.join(dp,f)

informe=[]
def procesa(src,etiqueta,prof=0):
    e=src.lower().rsplit('.',1)[-1] if '.' in src else ''
    if e=='pdf':
        t,nota=pdf_txt(src)
        if t is None: informe.append((etiqueta,'PDF ILEGIBLE',nota)); return
        io.open('%s/texto/%s.txt'%(SAL,limpia(etiqueta)),'w',encoding='utf-8').write(t)
        informe.append((etiqueta,'pdf',nota or '%d KB de texto'%(len(t)//1024)))
    elif e in ('rar','zip'):
        if prof>2: return
        tmp=tempfile.mkdtemp(prefix='exp_')
        try:
            if not abre_contenedor(src,tmp):
                informe.append((etiqueta,'CONTENEDOR ILEGIBLE','bsdtar no pudo')); return
            n=0
            for f in sorted(recorre(tmp)):
                sub=os.path.relpath(f,tmp)
                ext=f.lower().rsplit('.',1)[-1] if '.' in f else ''
                if ext in ('pdf','rar','zip','kml','kmz','txt','csv','xml','doc','docx'):
                    procesa(f,'%s :: %s'%(etiqueta,sub),prof+1); n+=1
                elif ext in ('shp','dbf','prj','shx','tif','jpg','png'):
                    informe.append(('%s :: %s'%(etiqueta,sub),ext,'binario cartografico, no textual'))
            informe.append((etiqueta,'contenedor','%d piezas con texto'%n))
        finally: shutil.rmtree(tmp,ignore_errors=True)
    elif e=='kmz':
        tmp=tempfile.mkdtemp(prefix='kmz_')
        try:
            with zipfile.ZipFile(src) as z: z.extractall(tmp)
            for f in recorre(tmp):
                if f.lower().endswith('.kml'):
                    io.open('%s/texto/%s.kml'%(SAL,limpia(etiqueta)),'w',encoding='utf-8').write(
                        io.open(f,encoding='utf-8',errors='replace').read())
                    informe.append((etiqueta,'kmz','kml extraido'))
        except Exception as ex: informe.append((etiqueta,'KMZ ILEGIBLE',str(ex)))
        finally: shutil.rmtree(tmp,ignore_errors=True)
    elif e in ('kml','txt','csv','xml'):
        io.open('%s/texto/%s.%s'%(SAL,limpia(etiqueta),e),'w',encoding='utf-8').write(
            io.open(src,encoding='utf-8',errors='replace').read())
        informe.append((etiqueta,e,'copiado'))
    else:
        informe.append((etiqueta,e or '?','sin extractor'))

if __name__=='__main__':
    man=json.load(io.open('archivo/manifiesto.json',encoding='utf-8'))
    for i,m in enumerate(man,1):
        p='archivo/bin/'+m['archivo']
        if not os.path.exists(p): informe.append((m['archivo'],'AUSENTE','no descargado')); continue
        print('[%d/%d] %s'%(i,len(man),m['archivo']),flush=True)
        procesa(p,m['archivo'].rsplit('.',1)[0])
    for f in sorted(os.listdir('archivo/paginas')):
        idd=f[:-5]
        t=html_md('archivo/paginas/'+f)
        io.open('%s/paginas/%s.md'%(SAL,idd),'w',encoding='utf-8').write(t)
        informe.append(('pagina %s'%idd,'html','%d caracteres'%len(t)))
    json.dump(informe,io.open('archivo/informe_extraccion.json','w',encoding='utf-8'),
              ensure_ascii=False,indent=1)
    mal=[x for x in informe if x[1].isupper()]
    print('\n%d piezas procesadas · %d con problema'%(len(informe),len(mal)))
    for x in mal[:20]: print('   %-58s %s · %s'%(x[0][:58],x[1],x[2]))

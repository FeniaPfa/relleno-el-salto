"""Convierte todo lo descargado a texto plano. Los contenedores (.rar/.zip) se abren
en un directorio propio y se recorre lo que traigan dentro."""
import os,io,re,sys,json,html,zipfile,subprocess,shutil,tempfile,multiprocessing
import fitz   # PyMuPDF

SAL='sitio/expediente'
os.makedirs(SAL+'/texto',exist_ok=True); os.makedirs(SAL+'/paginas',exist_ok=True)
limpia=lambda s: re.sub(r'[^\w.\- ]','_',s)[:120].strip()

TESS=shutil.which('tesseract') or '/opt/homebrew/bin/tesseract'
VACIA=20       # menos de 20 caracteres no blancos = la pagina no tiene capa de texto
DPI=150        # 150 da el mismo texto que 300 y tarda la mitad (medido)
MAXPX=3500     # tope del lado largo: un plano A0 a 300 dpi son 70 MP y ahoga el OCR
NUCLEOS=max(1,(os.cpu_count() or 2)-2)
OCR=os.environ.get('OCR')=='1'   # apagado por defecto: ver LEEME.md

def _ocr_pagina(arg):
    """Rasteriza una pagina y se la pasa a tesseract. Buena parte del expediente
    -- oficios de servicios, consentimientos firmados, certificados -- esta
    escaneada: sin esto esas paginas salen en blanco."""
    ruta,i=arg
    f=None
    try:
        d=fitz.open(ruta); pg=d[i]; r=pg.rect
        dpi=min(DPI, MAXPX*72.0/max(r.width,r.height,1))
        f=tempfile.mktemp(suffix='.png')
        pg.get_pixmap(dpi=int(dpi)).save(f)
        d.close()
        t=subprocess.run([TESS,f,'stdout','-l','spa','--psm','3'],
                         capture_output=True,text=True,timeout=240).stdout.strip()
        return i,(t if len(re.sub(r'\s','',t))>=VACIA else None)
    except Exception:
        return i,None
    finally:
        if f and os.path.exists(f):
            try: os.remove(f)
            except OSError: pass

def pdf_txt(p):
    try: d=fitz.open(p)
    except Exception as e: return None,'no abre: %s'%e
    bruto=[pg.get_text() for pg in d]
    faltan=[i for i,t in enumerate(bruto) if len(re.sub(r'\s','',t))<VACIA]
    d.close()
    recuperadas={}
    if OCR and faltan and os.path.exists(TESS):
        if len(faltan)>1 and NUCLEOS>1:
            with multiprocessing.Pool(min(NUCLEOS,len(faltan))) as pool:
                for i,t in pool.imap_unordered(_ocr_pagina,[(p,i) for i in faltan]):
                    if t: recuperadas[i]=t
        else:
            for i in faltan:
                _,t=_ocr_pagina((p,i))
                if t: recuperadas[i]=t
    out=[]
    for i,t in enumerate(bruto):
        marca=''
        if i in recuperadas: t=recuperadas[i]; marca=' · OCR'
        elif i in faltan:    marca=' · sin texto'
        out.append('\n===== p.%d%s =====\n%s'%(i,marca,t))
    txt=''.join(out)
    nota='%d KB'%(len(txt)//1024)
    if recuperadas: nota+=' · %d pag por OCR'%len(recuperadas)
    sin=len(faltan)-len(recuperadas)
    if sin: nota+=' · %d de %d pag escaneadas (sin capa de texto)'%(sin,len(bruto))
    return txt,nota

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
        informe.append((etiqueta,'pdf-escaneado' if 'escaneadas' in nota else 'pdf',nota))
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
    elif e in ('docx','dotx'):
        # un .docx es un zip; el texto vive en word/document.xml
        try:
            with zipfile.ZipFile(src) as z:
                x=z.read('word/document.xml').decode('utf-8','replace')
            x=re.sub(r'</w:p>','\n',x)
            x=re.sub(r'<w:tab[^>]*/>','\t',x)
            t=html.unescape(re.sub(r'<[^>]+>','',x))
            t=re.sub(r'\n{3,}','\n\n',t).strip()
            io.open('%s/texto/%s.txt'%(SAL,limpia(etiqueta)),'w',encoding='utf-8').write(t)
            informe.append((etiqueta,'docx','%d caracteres'%len(t)))
        except Exception as ex:
            informe.append((etiqueta,'DOCX ILEGIBLE',str(ex)))
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

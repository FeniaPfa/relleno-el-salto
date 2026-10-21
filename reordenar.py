"""Reordena las secciones de plantilla.html. Uso:
   python3 reordenar.py terreno subsuelo incendio ...
El id 'hallazgos' queda siempre primero y 'observar' siempre último."""
import io,re,sys
p='web/plantilla.html'; s=io.open(p,encoding='utf-8').read()
ini=s.index('<section id="hallazgos"')
fin=s.rindex('</section>')+len('</section>')
cabeza, cuerpo, cola = s[:ini], s[ini:fin], s[fin:]
secs={}
orden_actual=[]
for m in re.finditer(r'<section id="([a-z]+)"', cuerpo):
    a=m.start()
    b=cuerpo.index('</section>',a)+len('</section>')
    secs[m.group(1)]=cuerpo[a:b]; orden_actual.append(m.group(1))
pedido=sys.argv[1:]
if not pedido:
    print('orden actual:', ' '.join(orden_actual)); raise SystemExit
nuevo=['hallazgos']+[x for x in pedido if x not in ('hallazgos','observar')]+['observar']
faltan=set(orden_actual)-set(nuevo); sobran=set(nuevo)-set(orden_actual)
assert not faltan, 'faltan secciones: %s'%faltan
assert not sobran, 'ids inexistentes: %s'%sobran
assert len(nuevo)==len(orden_actual), (len(nuevo),len(orden_actual))
cuerpo2='\n\n'.join(secs[k] for k in nuevo)
n=[0]
cuerpo2=re.sub(r'<span class="n">\d+</span>',
   lambda m:(n.__setitem__(0,n[0]+1),'<span class="n">%d</span>'%n[0])[1], cuerpo2)
io.open(p,'w',encoding='utf-8').write(cabeza+cuerpo2+cola)
print('nuevo orden (%d secciones):'%len(nuevo)); print('  '+' → '.join(nuevo))

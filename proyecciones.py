import json, math, glob, os, shapefile
from shapely.geometry import shape
from shapely.ops import unary_union
import datetime

TOTAL=30_741_988; VIDA=25; T_DIA_INI=2500
# Tabla de produccion anual del Capitulo 1, p.71 (no es lineal: crece ~2,5 %/anio).
# Antes aqui habia una rampa lineal calibrada al total; daba bien el total pero
# erraba los extremos, y con ellos los camiones del anio 25.
masa=[900000,922500,945563,969202,993432,1018267,1043724,1069817,1096563,1123977,
      1152076,1180878,1210400,1240660,1271676,1303468,1336055,1369456,1403693,
      1438785,1474755,1511624,1549414,1588150,1627853]
assert len(masa)==VIDA and sum(masa)==TOTAL

# LandGEM (US EPA) — el propio EIA declara usar este modelo
k=0.05; L0=170.0          # Conventional, CAA defaults
def landgem(year):
    q=0.0
    for i,Mi in enumerate(masa):
        age=year-i
        if age>0: q += k*L0*Mi*math.exp(-k*age)
    return q                       # m3 CH4/año  (L0 en m3/Mg)

anios=list(range(1,61))
ch4=[landgem(y) for y in anios]
pico=max(range(len(ch4)), key=lambda i:ch4[i])

# masa acumulada y altura del macizo
capas={}
for shp in glob.glob("data/cartografia/*/*.shp"):
    r=shapefile.Reader(shp)
    capas[os.path.basename(shp)[:-4]]=unary_union([shape(s.__geo_interface__).buffer(0) for s in r.shapes()])
A=capas["Zona de disposición de residuos"].area      # m2
acum=[]; s=0
for m in masa: s+=m; acum.append(s)
DENS=1.0   # t/m3 compactado
alturas=[a/DENS/A for a in acum]

# camiones — con la flota y la carga que declara el propio titular, no con supuestos.
# Viajes anuales de camiones de basura al relleno (años de operación 1 a 25), de la calculadora
# del Anexo 4.1 («Anexo D. Calculadora fase de operación.xlsx», hoja «Relleno sanitario», filas
# «Camión recolector» y «Camión semiremolque»), que además fija 365 días de operación al año.
# Cuadran con la Tabla 78 del informe (p. 107): +1.460 aljibes y los rechazos dan 64.240 y 109.406.
VIAJES_RECOLECTOR=[56940,58035,59495,59860,61320,62780,63510,66430,67525,68620,70080,71905,73365,
    74825,76285,79570,81030,83220,84680,86140,88330,91250,92710,94900,96725]
VIAJES_SEMI=[5840,6205,6205,6570,6570,6935,6935,7300,7300,7300,7665,7665,8030,8395,8395,8760,8760,
    9125,9125,9490,9855,9855,10220,10585,10585]      # desde San Antonio
# Carga por camión: Anexo 4.1, Tabla 13 (pp. 26-27): recolector 10,86 t, semirremolque 14,6 t.
C_REC=10.86; C_SEMI=14.6
DIAS=365
planilla=[(r+s)/DIAS for r,s in zip(VIAJES_RECOLECTOR,VIAJES_SEMI)]           # lo que cuenta el titular
cubre=[(r*C_REC+s*C_SEMI)/m for r,s,m in zip(VIAJES_RECOLECTOR,VIAJES_SEMI,masa)]  # fracción del tonelaje
necesarios=[(s+(m-s*C_SEMI)/C_REC)/DIAS for s,m in zip(VIAJES_SEMI,masa)]     # lo que exige el tonelaje
cam_ini=necesarios[0]; cam_fin=necesarios[-1]

out={
 "meta":{"generado":str(datetime.date.today()),"expediente":"2168892026",
         "titular":"COSEMAR SpA","proyecto":"Centro Metropolitano de Gestión Integral de Residuos"},
 "supuestos":{"k":k,"L0":L0,"modelo":"LandGEM v3.02 (US EPA), defaults Conventional",
   "densidad_t_m3":DENS,"carga_recolector_t":C_REC,"carga_semirremolque_t":C_SEMI,
   "nota":"Tabla de produccion anual declarada en el Capitulo 1, p.71; suma exacta 30.741.988 t en 25 anios",
   "fuente_masa":"Cap. 1 Descripcion del Proyecto, tabla de produccion anual de residuos (p.71)"},
 "anios":anios,"ch4_m3_anio":[round(x) for x in ch4],
 "pico":{"anio":anios[pico],"ch4_m3":round(ch4[pico])},
 "masa_anual_t":[round(x) for x in masa],
 "acumulado_t":[round(x) for x in acum],
 "altura_m":[round(x,1) for x in alturas],
 "camiones_dia_ini":round(cam_ini),"camiones_dia_fin":round(cam_fin),
 "camiones":{"planilla_dia":[round(x) for x in planilla],"necesarios_dia":[round(x) for x in necesarios],
   "cubre_pct":[round(100*x) for x in cubre]},
 "area_disposicion_m2":round(A),
}
json.dump(out,open("data/proyecciones.json","w"),ensure_ascii=False)

print(f"Área de disposición: {A/10000:.2f} ha")
print(f"Masa año 1: {masa[0]:,.0f} t  ({masa[0]/365:,.0f} t/día)")
print(f"Masa año 25: {masa[-1]:,.0f} t  ({masa[-1]/365:,.0f} t/día)")
print(f"Altura media del macizo al cierre: {alturas[-1]:.1f} m  (densidad {DENS} t/m³)")
print(f"Camiones de basura/día en la planilla del titular: {planilla[0]:.0f} → {planilla[-1]:.0f}")
print(f"Con su carga declarada traen el {100*min(cubre):.0f}–{100*max(cubre):.0f} % del tonelaje")
print(f"Camiones/día que exige el tonelaje con esa carga: {cam_ini:.0f} → {cam_fin:.0f}")
print()
print("LandGEM — generación de metano:")
for y in [1,5,10,15,20,25,26,30,40,50]:
    print(f"  año {y:2d}: {ch4[y-1]:14,.0f} m³ CH4/año   ({ch4[y-1]/8760:7,.0f} m³/h)")
print(f"\nPICO: año {anios[pico]} con {ch4[pico]:,.0f} m³ CH4/año")
co2e=ch4[pico]*0.0007168*28/1000   # densidad CH4 t/m3 * GWP100
print(f"Equivalente del pico: {co2e:,.0f} t CO2e/año")

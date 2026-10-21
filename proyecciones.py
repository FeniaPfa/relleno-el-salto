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

# camiones
CARGA=10   # t por compactador
cam_ini=(masa[0]/365)/CARGA; cam_fin=(masa[-1]/365)/CARGA

out={
 "meta":{"generado":str(datetime.date.today()),"expediente":"2168892026",
         "titular":"COSEMAR SpA","proyecto":"Centro Metropolitano de Gestión Integral de Residuos"},
 "supuestos":{"k":k,"L0":L0,"modelo":"LandGEM v3.02 (US EPA), defaults Conventional",
   "densidad_t_m3":DENS,"carga_camion_t":CARGA,
   "nota":"Tabla de produccion anual declarada en el Capitulo 1, p.71; suma exacta 30.741.988 t en 25 anios",
   "fuente_masa":"Cap. 1 Descripcion del Proyecto, tabla de produccion anual de residuos (p.71)"},
 "anios":anios,"ch4_m3_anio":[round(x) for x in ch4],
 "pico":{"anio":anios[pico],"ch4_m3":round(ch4[pico])},
 "masa_anual_t":[round(x) for x in masa],
 "acumulado_t":[round(x) for x in acum],
 "altura_m":[round(x,1) for x in alturas],
 "camiones_dia_ini":round(cam_ini),"camiones_dia_fin":round(cam_fin),
 "area_disposicion_m2":round(A),
}
json.dump(out,open("data/proyecciones.json","w"),ensure_ascii=False)

print(f"Área de disposición: {A/10000:.2f} ha")
print(f"Masa año 1: {masa[0]:,.0f} t  ({masa[0]/365:,.0f} t/día)")
print(f"Masa año 25: {masa[-1]:,.0f} t  ({masa[-1]/365:,.0f} t/día)")
print(f"Altura media del macizo al cierre: {alturas[-1]:.1f} m  (densidad {DENS} t/m³)")
print(f"Camiones/día (10 t): {cam_ini:.0f} → {cam_fin:.0f}   = {cam_ini*2:.0f} → {cam_fin*2:.0f} viajes/día")
print()
print("LandGEM — generación de metano:")
for y in [1,5,10,15,20,25,26,30,40,50]:
    print(f"  año {y:2d}: {ch4[y-1]:14,.0f} m³ CH4/año   ({ch4[y-1]/8760:7,.0f} m³/h)")
print(f"\nPICO: año {anios[pico]} con {ch4[pico]:,.0f} m³ CH4/año")
co2e=ch4[pico]*0.0007168*28/1000   # densidad CH4 t/m3 * GWP100
print(f"Equivalente del pico: {co2e:,.0f} t CO2e/año")

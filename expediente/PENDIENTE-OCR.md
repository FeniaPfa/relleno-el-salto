# Pendiente: OCR de las páginas escaneadas

Generado por `archivo/pendientes.py`. **No editar a mano**: se regenera tras cada
extracción, y cuando el OCR haya corrido esta lista se vacía sola.

## Qué falta

En el archivo hay **268 páginas** repartidas en **26 archivos** que son imágenes sin
capa de texto. En `texto/` aparecen como `===== p.N · sin texto =====`: el hueco está
señalizado, pero el contenido no está.

Para extraerlas:

```bash
brew install tesseract tesseract-lang   # si no está
OCR=1 python3 archivo/extraer.py        # vuelve a extraerlo todo, ahora con OCR
python3 archivo/indexar.py
python3 archivo/pendientes.py
```

Tarda bastante más que la extracción normal. Antes de lanzarlo conviene leer el
apartado de OCR en [`../archivo/LEEME.md`](../archivo/LEEME.md): hay dos topes
medidos (150 dpi y 3.500 px de lado) sin los cuales pasa de minutos a horas.

## Lo que más importa

No todo vale lo mismo. Por tipo de documento del expediente:

| documento | archivos afectados |
|---|---|
| Estudio de impacto ambiental | 22 |
| Oficio pronunciamiento con observaciones al EIA | 1 |
| Publicación en diario El Mercurio de Valparaíso | 1 |
| Visación de acta de reunión | 1 |
| Carta titular | 1 |

Los **oficios de pronunciamiento** son los que pesan: son la opinión de un servicio
del Estado sobre el proyecto, y escaneados no se pueden citar ni buscar. El resto
—certificados, consentimientos firmados, personerías— es papeleo. De los **planos**
el OCR no sacará nada útil: ahí la laguna es real.

## La lista

| archivo en `texto/` | escaneadas | de | viene de | original |
|---|---|---|---|---|
| `Cap_319_Medio_Humano __ Ape_ndice A_Consentimientos de uso de entrevis` **(entero)** | 16 | 16 | Estudio de impacto ambiental · COSEMAR SPA | [Cap_319_Medio_Humano.rar](https://seia.sea.gob.cl/archivos/2026/07/14/Cap_319_Medio_Humano.rar) |
| `Anexo_44_Modelacion_de_olores __ Anexos_AnexoA.Normativa_Anexo A. Norm` **(entero)** | 13 | 13 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_44_Modelacion_de_olores.rar](https://seia.sea.gob.cl/archivos/2026/07/15/Anexo_44_Modelacion_de_olores.rar) |
| `Anexo_11_14 __ Anexo 1.1 Antecedentes Legales_Certificados  Vialidad_2` **(entero)** | 12 | 12 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_11_14.rar](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_11_14.rar) |
| `Anexo_11_14 __ Anexo 1.1 Antecedentes Legales_Certificados  Vialidad_5` **(entero)** | 12 | 12 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_11_14.rar](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_11_14.rar) |
| `Anexo_11_14 __ Anexo 1.1 Antecedentes Legales_Certificados  Vialidad_C` **(entero)** | 5 | 5 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_11_14.rar](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_11_14.rar) |
| `ORD_2132_SAG.txt` **(entero)** | 4 | 4 | Oficio pronunciamiento con observaciones al EIA · Se | [ORD_2132_SAG.pdf](https://seia.sea.gob.cl/archivos/2026/09/08/ORD_2132_SAG.pdf) |
| `5a6_Extracto_El_Mercurio_de_Valparaiso.txt` **(entero)** | 1 | 1 | Publicación en diario El Mercurio de Valparaíso · Se | [5a6_Extracto_El_Mercurio_de_Valpar](https://seia.sea.gob.cl/archivos/2026/08/11/5a6_Extracto_El_Mercurio_de_Valparaiso.pdf) |
| `Anexo_11_14 __ Anexo 1.1 Antecedentes Legales_Titular_R_Legal_C.I. JOS` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_11_14.rar](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_11_14.rar) |
| `Anexo_93_PAS_139_Planta_de_Lixiviados __ Planos_VDM-PRO-PTL-MEC-P-001_` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_93_PAS_139_Planta_de_Lixivia](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_93_PAS_139_Planta_de_Lixiviados.rar) |
| `Anexo_93_PAS_139_Planta_de_Lixiviados __ Planos_VDM-PRO-PTL-MEC-P-002_` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_93_PAS_139_Planta_de_Lixivia](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_93_PAS_139_Planta_de_Lixiviados.rar) |
| `Anexo_93_PAS_139_Planta_de_Lixiviados __ Planos_VDM-PRO-PTL-MEC-P-003_` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Anexo_93_PAS_139_Planta_de_Lixivia](https://seia.sea.gob.cl/archivos/2026/07/13/Anexo_93_PAS_139_Planta_de_Lixiviados.rar) |
| `Cap_313_Patrimonio_Arqueologico __ 10. Ape_ndices_10.1. Certificados d` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Cap_313_Patrimonio_Arqueologico.ra](https://seia.sea.gob.cl/archivos/2026/07/14/Cap_313_Patrimonio_Arqueologico.rar) |
| `Cap_313_Patrimonio_Arqueologico __ 10. Ape_ndices_10.1. Certificados d` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [Cap_313_Patrimonio_Arqueologico.ra](https://seia.sea.gob.cl/archivos/2026/07/14/Cap_313_Patrimonio_Arqueologico.rar) |
| `ORD_2233_SAG.txt` **(entero)** | 1 | 1 | Visación de acta de reunión · Servicio Agrícola y Ga | [ORD_2233_SAG.pdf](https://seia.sea.gob.cl/archivos/2026/09/04/ORD_2233_SAG.pdf) |
| `d8d_Cap_35_Geologia __ Ape_ndices_Ape_ndice 2. Mapa Geolo_gico CMGIR.p` **(entero)** | 1 | 1 | Estudio de impacto ambiental · COSEMAR SPA | [d8d_Cap_35_Geologia.rar](https://seia.sea.gob.cl/archivos/2026/07/17/d8d_Cap_35_Geologia.rar) |
| `0f2_Capitulo_12_Acciones_Previas __ Capítulo 12. Acciones Previas_Anex` | 42 | 45 | Estudio de impacto ambiental · COSEMAR SPA | [0f2_Capitulo_12_Acciones_Previas.z](https://seia.sea.gob.cl/archivos/2026/07/15/0f2_Capitulo_12_Acciones_Previas.zip) |
| `CAPITULO_12_ACCIONES_PREVIAS __ Anexos_ANEXOS VCT.pdf.txt` | 42 | 45 | Estudio de impacto ambiental · COSEMAR SPA | [CAPITULO_12_ACCIONES_PREVIAS.rar](https://seia.sea.gob.cl/archivos/2026/07/17/CAPITULO_12_ACCIONES_PREVIAS.rar) |
| `0f2_Capitulo_12_Acciones_Previas __ Capítulo 12. Acciones Previas_Anex` | 37 | 44 | Estudio de impacto ambiental · COSEMAR SPA | [0f2_Capitulo_12_Acciones_Previas.z](https://seia.sea.gob.cl/archivos/2026/07/15/0f2_Capitulo_12_Acciones_Previas.zip) |
| `CAPITULO_12_ACCIONES_PREVIAS __ Anexos_PDF 1º CICLO.pdf.txt` | 37 | 44 | Estudio de impacto ambiental · COSEMAR SPA | [CAPITULO_12_ACCIONES_PREVIAS.rar](https://seia.sea.gob.cl/archivos/2026/07/17/CAPITULO_12_ACCIONES_PREVIAS.rar) |
| `Cap_38_Ruido_y_Vibraciones __ Cap 3.8 Estudio y linea de base de Ruido` | 11 | 132 | Estudio de impacto ambiental · COSEMAR SPA | [Cap_38_Ruido_y_Vibraciones.rar](https://seia.sea.gob.cl/archivos/2026/07/14/Cap_38_Ruido_y_Vibraciones.rar) |
| `0f2_Capitulo_12_Acciones_Previas __ Capítulo 12. Acciones Previas_Anex` | 8 | 29 | Estudio de impacto ambiental · COSEMAR SPA | [0f2_Capitulo_12_Acciones_Previas.z](https://seia.sea.gob.cl/archivos/2026/07/15/0f2_Capitulo_12_Acciones_Previas.zip) |
| `CAPITULO_12_ACCIONES_PREVIAS __ Anexos_PDF 2_ CICLO .pdf.txt` | 8 | 29 | Estudio de impacto ambiental · COSEMAR SPA | [CAPITULO_12_ACCIONES_PREVIAS.rar](https://seia.sea.gob.cl/archivos/2026/07/17/CAPITULO_12_ACCIONES_PREVIAS.rar) |
| `CAR_COSEMAR_SPA_ENTREGA_EXPFISICO.txt` | 5 | 6 | Carta titular · COSEMAR SPA | [CAR_COSEMAR_SPA_ENTREGA_EXPFISICO.](https://seia.sea.gob.cl/archivos/2026/08/12/CAR_COSEMAR_SPA_ENTREGA_EXPFISICO.pdf) |
| `0f2_Capitulo_12_Acciones_Previas __ Capítulo 12. Acciones Previas_Anex` | 3 | 4 | Estudio de impacto ambiental · COSEMAR SPA | [0f2_Capitulo_12_Acciones_Previas.z](https://seia.sea.gob.cl/archivos/2026/07/15/0f2_Capitulo_12_Acciones_Previas.zip) |
| `CAPITULO_12_ACCIONES_PREVIAS __ Anexos_ANEXOS VCT CAV.pdf.txt` | 3 | 4 | Estudio de impacto ambiental · COSEMAR SPA | [CAPITULO_12_ACCIONES_PREVIAS.rar](https://seia.sea.gob.cl/archivos/2026/07/17/CAPITULO_12_ACCIONES_PREVIAS.rar) |
| `Cap_313_Patrimonio_Arqueologico __ 10. Ape_ndices_10.2. Curri_culum Vi` | 1 | 6 | Estudio de impacto ambiental · COSEMAR SPA | [Cap_313_Patrimonio_Arqueologico.ra](https://seia.sea.gob.cl/archivos/2026/07/14/Cap_313_Patrimonio_Arqueologico.rar) |

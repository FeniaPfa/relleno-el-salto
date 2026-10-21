# Archivo del expediente

Reconstruye `expediente/` desde cero. Los cuatro pasos, en orden:

```bash
python3 archivo/resolver.py   # cada documento -> sus archivos      -> documentos.json
python3 archivo/bajar.py      # descarga todo                       -> archivo/bin, manifiesto.json
python3 archivo/extraer.py    # PDF/RAR/ZIP/HTML -> texto           -> expediente/texto, paginas
python3 archivo/indexar.py    # indice navegable                    -> expediente/INDICE.md
```

`bajar.py` es reanudable: no vuelve a pedir lo que ya tiene. Deja los binarios en
`archivo/bin/` (1,5 GB), que **no** entra al repositorio. `manifiesto.json` guarda la
URL y el SHA-256 de cada uno, así que se pueden rebajar y comprobar que son los mismos.

## Cómo se llega a la lista de documentos

El listado no está en el HTML de la ficha: la tabla se puebla por AJAX. El endpoint es

    /expediente/xhr_busqueda_expediente.php?id_expediente=2168892026

y lo descubre el `onsubmit` del formulario que sirve `/expediente/xhr_expediente.php`.
De ahí salen 60 documentos. Cuidado con dos cosas:

1. **41 de los 60 no tienen PDF.** El documento *es* la página web que devuelve
   `/documentos/documento.php?idDocumento=N` — resoluciones, notificaciones, actas,
   cartas. Por eso se archivan también las páginas, en `expediente/paginas/`.
2. Los anexos de un documento cuelgan de `/elementosFisicos/enviados.php?id_documento=N`,
   no de la página del documento.

Las respuestas vienen en **ISO-8859-1**, no en UTF-8.

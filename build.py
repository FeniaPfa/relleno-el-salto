#!/usr/bin/env python3
"""Arma index.html desde src/.

    python3 build.py

Empalma shader.js dentro de v3d.js, luego v3d.js y v3d2.js dentro de
plantilla.html (en el marcador "})();\\n</script>"), inyecta
datos.json en el marcador /*__DATOS__*/ y envuelve todo en un HTML completo.
Valida la sintaxis del bloque <script> final si hay node disponible.
"""
import io, os, re, shutil, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(AQUI, 'src')
URL  = 'https://feniapfa.github.io/seia-data/'

def leer(n): return io.open(os.path.join(SRC, n), encoding='utf-8').read()

def main():
    h  = leer('plantilla.html')
    v  = leer('v3d.js')      # visor del terreno
    v2 = leer('v3d2.js')     # visor del corte del subsuelo
    sh = leer('shader.js')   # GLSL, se empalma dentro de v3d.js

    ancla = "function hWorld(x,z){return hAt(x/S+0.5,-z/S+0.5)}"
    assert v.count(ancla) == 1, 'ancla del shader no encontrada en v3d.js'
    v = v.replace(ancla, ancla + "\n\n" + sh)

    marca = "})();\n</script>"
    assert h.count(marca) == 1, 'marcador de empalme ausente o duplicado'
    pleno = h.replace(marca, v + "\n" + v2 + "\n" + marca)

    assert pleno.count('/*__DATOS__*/') == 1
    pleno = pleno.replace('/*__DATOS__*/', leer('datos.json'))

    # el bloque <script> final, comprobado con node si está disponible
    bloque = re.findall(r'<script>(.*?)</script>', pleno, re.S)[-1]
    tmp = os.path.join(AQUI, '.chk.js')
    io.open(tmp, 'w', encoding='utf-8').write(
        "var D={},L={},$=function(){},el=function(){};\n" + bloque)
    try:
        r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        if r.returncode:
            print(r.stderr[:800]); os.remove(tmp); sys.exit(1)
        print('sintaxis ok')
    except FileNotFoundError:
        print('aviso: node no disponible, sintaxis sin verificar')
    finally:
        if os.path.exists(tmp): os.remove(tmp)

    io.open(os.path.join(AQUI, 'index.html'), 'w', encoding='utf-8').write(envolver(pleno))
    kb = os.path.getsize(os.path.join(AQUI, 'index.html')) / 1024
    print('index.html  %.1f KB  ·  %d secciones' % (kb, pleno.count('<section id=')))

def envolver(s):
    """El fragmento se escribió para el envoltorio de los artifacts; aquí hay que ponerlo."""
    i = s.index('</style>') + len('</style>')
    cabeza, cuerpo = s[:i], s[i:]
    cabeza = cabeza.replace('<meta charset="utf-8">\n', '', 1)
    reset = ('<style>\n:root{color-scheme:light dark}\n*{box-sizing:border-box}\n'
             'html{-webkit-text-size-adjust:100%}\nbody{margin:0}\nimg{max-width:100%}\n'
             '[hidden]{display:none!important}\n</style>')
    social = io.open(os.path.join(SRC, 'social.html'), encoding='utf-8').read().replace('{url}', URL)
    return ('<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
            + cabeza.strip() + '\n' + social + reset
            + '\n</head>\n<body>\n' + cuerpo.strip() + '\n</body>\n</html>\n')

if __name__ == '__main__':
    main()

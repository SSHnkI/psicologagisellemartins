# -*- coding: utf-8 -*-
"""Confere o site antes de publicar. Rode isto antes de todo commit:

    python verificar.py

Saida 0 = pode subir. Saida 1 = tem coisa errada, a lista sai na tela.

O que ele olha
--------------
1. o CSS embutido nos HTML esta em dia com assets/css (chama build.py --check)
2. todo caminho de href, src e cada entrada de srcset existe no disco
3. nenhuma ancora #id aponta para um id que a pagina nao tem
4. todo bloco JSON-LD parseia
5. exatamente um <h1> por pagina
6. head, body, main e picture balanceados
7. nenhum travessao nem meia-risca em nenhum arquivo
8. todo url() do CSS aponta para arquivo que existe
"""
import io
import os
import re
import sys
import json
import glob
import subprocess

RAIZ = os.path.dirname(os.path.abspath(__file__))
erros = []


def resolver(pagina, caminho):
    if caminho.startswith('/'):
        return os.path.join(RAIZ, caminho.lstrip('/'))
    return os.path.normpath(os.path.join(os.path.dirname(os.path.join(RAIZ, pagina)), caminho))


def checar_paginas(paginas):
    for f in paginas:
        s = io.open(os.path.join(RAIZ, f), encoding='utf-8').read()

        caminhos = [m.group(1) for m in re.finditer(r'(?:href|src)="([^"]+)"', s)]
        for m in re.finditer(r'srcset="([^"]+)"', s):
            for parte in m.group(1).split(','):
                p = parte.strip().split()
                if p:
                    caminhos.append(p[0])
        for c in caminhos:
            if re.match(r'^(https?:|mailto:|tel:|data:|#|//)', c) or not c.strip():
                continue
            if not os.path.exists(resolver(f, c.split('#')[0].split('?')[0])):
                erros.append('%s: caminho inexistente -> %s' % (f, c))

        ids = set(re.findall(r'\sid="([^"]+)"', s))
        for m in re.finditer(r'href="#([^"]+)"', s):
            if m.group(1) not in ids:
                erros.append('%s: ancora morta -> #%s' % (f, m.group(1)))

        for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                json.loads(m.group(1))
            except Exception as e:
                erros.append('%s: JSON-LD invalido -> %s' % (f, e))

        n = len(re.findall(r'<h1[\s>]', s))
        if n != 1:
            erros.append('%s: %d <h1> (esperado 1)' % (f, n))

        for tag in ('picture', 'head', 'body', 'main'):
            ab = len(re.findall(r'<%s[\s>]' % tag, s))
            fe = len(re.findall(r'</%s>' % tag, s))
            if ab != fe:
                erros.append('%s: <%s> %d abre, %d fecha' % (f, tag, ab, fe))


def checar_css():
    for css in ('assets/css/main.css', 'assets/css/article.css'):
        s = io.open(os.path.join(RAIZ, css), encoding='utf-8').read()
        # os data URI saem antes da varredura: o SVG de grao tem um
        # `url(%23n)` DENTRO dele, referencia a um filtro do proprio SVG, e
        # sem isto ele era acusado como arquivo faltando.
        s = re.sub(r'url\(["\']?data:[^)]*\)', 'url(data:)', s)
        for m in re.finditer(r"url\((['\"]?)([^'\")]+)\1\)", s):
            c = m.group(2)
            if c.startswith(('data:', 'http', '//')):
                continue
            if c.startswith('/'):
                alvo = os.path.join(RAIZ, c.lstrip('/'))
            else:
                alvo = os.path.normpath(os.path.join(RAIZ, os.path.dirname(css), c))
            if not os.path.exists(alvo):
                erros.append('%s: url() inexistente -> %s' % (css, c))


def checar_travessao():
    alvos = (glob.glob('*.html') + glob.glob('artigos/*.html') +
             glob.glob('assets/css/*.css') + glob.glob('assets/js/*.js') +
             ['llms.txt', 'robots.txt', 'sitemap.xml', 'build.py', 'verificar.py'])
    for f in alvos:
        if not os.path.exists(os.path.join(RAIZ, f)):
            continue
        s = io.open(os.path.join(RAIZ, f), encoding='utf-8').read()
        # os caracteres vem por ponto de codigo, nao literais: escritos
        # literalmente, este arquivo reprovaria a si mesmo na propria regra
        # que ele existe para aplicar. 0x2014 e' o travessao, 0x2013 a
        # meia-risca.
        for cp, nome in ((0x2014, 'travessao'), (0x2013, 'meia-risca')):
            ch = chr(cp)
            if ch in s:
                erros.append('%s: %s encontrado (%d vez[es])' % (f, nome, s.count(ch)))


def main():
    os.chdir(RAIZ)
    paginas = sorted(glob.glob('*.html')) + sorted(glob.glob('artigos/*.html'))

    # 1. o CSS embutido tem de refletir assets/css. Este e' o unico erro que
    #    publica um site visualmente errado sem quebrar nada no HTML, entao
    #    vem primeiro.
    r = subprocess.call([sys.executable, os.path.join(RAIZ, 'build.py'), '--check'])
    if r != 0:
        erros.append('CSS embutido desatualizado (veja acima): rode python build.py')

    checar_paginas(paginas)
    checar_css()
    checar_travessao()

    print('\n%d paginas verificadas' % len(paginas))
    if erros:
        print('%d ERRO(S):' % len(erros))
        for e in erros:
            print('  ' + e)
        return 1
    print('0 erros')
    return 0


if __name__ == '__main__':
    sys.exit(main())

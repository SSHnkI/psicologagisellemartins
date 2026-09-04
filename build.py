# -*- coding: utf-8 -*-
"""Embute o CSS dentro de cada HTML e confere se estao em dia.

  python build.py            embute (rode SEMPRE depois de mexer no CSS)
  python build.py --check    so acusa divergencia, nao escreve nada

Por que existe
--------------
O main.css sozinho custava uma ida ao servidor no caminho critico: o
navegador so descobre o que pintar depois de busca-lo. Medido no gzip, com
o CSS embutido a soma de bytes do primeiro carregamento cai de 30.777 para
20.698, porque 36% do arquivo e' comentario e ele deixa de ir ao ar, e
porque HTML e CSS comprimem melhor juntos do que separados. Some tambem a
requisicao. Ou seja: menos bytes E menos uma ida, nao um troco pelo outro.

O preco e' este arquivo. O main.css continua sendo a UNICA fonte de
verdade; os blocos <style> nos HTML sao copia gerada. Editar o CSS sem
rodar este script publica CSS velho, e por isso `verificar.py` roda o
--check e reprova antes do commit.

Detalhe que quebra silenciosamente se esquecido
-----------------------------------------------
Dentro do main.css, `url('../fonts/x.woff2')` resolve contra a PASTA DO
CSS. Embutido no HTML, passaria a resolver contra a pasta da PAGINA, e em
index.html apontaria para fora da raiz do site. Por isso todo url()
relativo e reescrito para caminho absoluto a partir da raiz na hora de
embutir.
"""
import io
import os
import re
import sys
import glob

RAIZ = os.path.dirname(os.path.abspath(__file__))
# O marcador de abertura carrega a lista de folhas que a pagina usava, na
# ordem original. Sem isso, depois da primeira execucao os <link> nao
# existem mais e nao ha como saber se a pagina levava article.css alem do
# main.css: qualquer heuristica sobre o conteudo ja embutido erra.
ABRE_RE = re.compile(r'<!-- css:inline: ([^ ]+) -->')
FECHA = '<!-- /css:inline -->'


def marcador(folhas):
    return '<!-- css:inline: %s -->' % ','.join(folhas)


def tirar_comentarios(css):
    """Remove /* */ sem tocar no que esta dentro de aspas.

    O CSS tem um data URI de SVG em url("data:image/svg+xml,..."). Um
    regex ingenuo sobre o arquivo inteiro nao quebra ele hoje, porque o
    SVG nao contem a sequencia de abertura de comentario, mas basta
    alguem colar outro data URI para virar bug mudo. Entao a varredura e'
    caractere a caractere, com estado de string.
    """
    saida = []
    i, n = 0, len(css)
    aspas = None
    while i < n:
        c = css[i]
        if aspas:
            saida.append(c)
            if c == '\\' and i + 1 < n:
                saida.append(css[i + 1])
                i += 2
                continue
            if c == aspas:
                aspas = None
            i += 1
            continue
        if c in '"\'':
            aspas = c
            saida.append(c)
            i += 1
            continue
        if c == '/' and i + 1 < n and css[i + 1] == '*':
            fim = css.find('*/', i + 2)
            i = n if fim == -1 else fim + 2
            continue
        saida.append(c)
        i += 1
    return ''.join(saida)


def enxugar(css):
    """Comentarios fora e espaco em branco colapsado.

    De proposito NAO faz minificacao no nivel de token: nao mexe em
    `1px solid`, em `calc(100% - 2rem)` nem em `0 0 0 1px`. O ganho seria
    de centenas de bytes antes do gzip e o risco de estragar uma
    declaracao e' real. Depois do gzip a diferenca some.
    """
    css = tirar_comentarios(css)
    css = re.sub(r'[ \t]+\n', '\n', css)
    css = re.sub(r'\n[ \t]*\n+', '\n', css)
    return css.strip() + '\n'


def absolutizar(css, pasta_do_css):
    """url() relativo passa a valer a partir da raiz do site.

    Necessario porque o CSS sai de assets/css/ e entra no HTML, que mora
    em outra profundidade. data: e http: ficam como estao.
    """
    def troca(m):
        aspa, alvo = m.group(1), m.group(2)
        if alvo.startswith(('data:', 'http:', 'https:', '//', '/', '#')):
            return m.group(0)
        absoluto = os.path.normpath(os.path.join(pasta_do_css, alvo))
        absoluto = '/' + absoluto.replace(os.sep, '/').lstrip('/')
        return 'url(%s%s%s)' % (aspa, absoluto, aspa)

    return re.sub(r'url\((["\']?)([^"\')]+)\1\)', troca, css)


def montar(folhas):
    partes = []
    for nome in folhas:
        css = io.open(os.path.join(RAIZ, 'assets', 'css', nome), encoding='utf-8').read()
        partes.append(absolutizar(enxugar(css), 'assets/css'))
    return '%s<style>\n%s</style>%s' % (marcador(folhas), ''.join(partes), FECHA)


def aplicar(pagina, checar):
    caminho = os.path.join(RAIZ, pagina)
    s = io.open(caminho, encoding='utf-8').read()

    ja = ABRE_RE.search(s)
    if ja:
        folhas = ja.group(1).split(',')
        fim = s.find(FECHA, ja.end())
        assert fim != -1, 'marcador de fechamento faltando em ' + pagina
        atual = s[ja.start():fim + len(FECHA)]
        bloco = montar(folhas)
        if atual == bloco:
            return False  # em dia
        if checar:
            return True  # divergente: o CSS mudou e ninguem rodou o build
        s = s[:ja.start()] + bloco + s[fim + len(FECHA):]
    else:
        links = list(re.finditer(
            r'[ \t]*<link rel="stylesheet" href="[^"]*assets/css/([^"]+)"[^>]*>\n', s))
        if not links:
            return None  # pagina sem CSS proprio
        if checar:
            return True  # ainda nao embutida
        folhas = [m.group(1) for m in links]
        # o <style> ocupa o lugar exato dos <link>, para a ordem da cascata
        # nao mudar em relacao ao que vinha antes e depois deles
        s = s[:links[0].start()] + '  ' + montar(folhas) + '\n' + s[links[-1].end():]

    io.open(caminho, 'w', encoding='utf-8', newline='').write(s)
    return True


def main():
    checar = '--check' in sys.argv
    os.chdir(RAIZ)
    paginas = sorted(glob.glob('*.html')) + sorted(glob.glob('artigos/*.html'))
    mudou, pulou = [], []
    for p in paginas:
        r = aplicar(p, checar)
        if r is None:
            pulou.append(p)
        elif r:
            mudou.append(p)

    if checar:
        if mudou:
            print('CSS EMBUTIDO DESATUALIZADO em %d pagina(s):' % len(mudou))
            for p in mudou:
                print('  ' + p)
            print('\nrode: python build.py')
            return 1
        print('css embutido em dia nas %d paginas' % (len(paginas) - len(pulou)))
        return 0

    print('embutido em %d de %d paginas' % (len(mudou), len(paginas)))
    for p in mudou:
        print('  ' + p)
    if pulou:
        print('sem CSS proprio: ' + ', '.join(pulou))
    return 0


if __name__ == '__main__':
    sys.exit(main())

/* =====================================================================
   FIBRAS DO HERO: porte vanilla do <GhostFibers /> (React Bits)
   O projeto é HTML estático servido no GitHub Pages: não há React, bundler
   nem package.json, então a dependência foi trocada pelo próprio efeito 
   um shader WebGL de fragmento, sem biblioteca nenhuma.

   Diferenças de direção de arte em relação ao componente original:
   · paleta da marca (vinho/mauve/dourado sobre creme), não azul sobre preto;
   · lightMode: as fibras escurecem o fundo claro em vez de brilharem;
   · speed 0.06 no lugar de 0.2: é uma página sobre ansiedade, o movimento
     precisa ser mais lento que a respiração de quem está lendo.

   Custos controlados de propósito (o commit anterior do repo foi justamente
   remover blur de camada animada por travar a rolagem):
   · roda só no hero e PARA quando o hero sai da viewport;
   · renderiza a 45% da resolução e a 24fps: é um degradê difuso;
   · desliga em prefers-reduced-motion, em tela estreita e se o WebGL faltar.
   ===================================================================== */
(() => {
  'use strict';

  const cv = document.querySelector('canvas.fibers');
  if (!cv) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (innerWidth < 900) return; // no celular o hero já é curto e a GPU é o gargalo

  const gl = cv.getContext('webgl', { alpha: true, antialias: false, depth: false });
  if (!gl) return; // sem WebGL o canvas fica em opacity:0 e o hero segue como era

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `
  precision mediump float;
  uniform vec2  u_res;
  uniform float u_t;
  // paleta da marca, injetada como uniform para não duplicar hex no shader
  uniform vec3  u_wine;
  uniform vec3  u_mauve;
  uniform vec3  u_gold;

  const float ROT        = -0.105;  // rotation -6deg
  const float ROT_SPEED  = -0.014;
  const float SCALE      = 2.0;
  const int   LAYERS     = 4;
  const float WAVE_AMP   = 0.085; // mais curva, menos listra reta
  const float WAVE_FREQ  = 0.5;
  const float WAVE_SPEED = 0.15;
  const float LAYER_SPEED= 0.08;
  const float TWIST      = 0.10;
  const float TWIST_FREQ = 5.0;
  const float TWIST_SPD  = 1.2;
  const float LINE_FREQ  = 3.2;   // menos denso: fibra, nao hachura
  const float SHARPNESS  = 22.0;  // traco mais fino

  mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    // aspecto corrigido pelo menor lado: sem isso as fibras esticam em
    // monitor ultrawide e viram listras retas
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
    uv *= SCALE;
    uv = rot(ROT + u_t * ROT_SPEED) * uv;

    float acc = 0.0;
    for (int i = 0; i < LAYERS; i++) {
      float fi = float(i);
      float depth = fi / float(LAYERS);           // 0 = frente, ~1 = fundo
      vec2 q = uv;

      // ondulação: a fibra respira em vez de correr
      q.y += sin(q.x * WAVE_FREQ + u_t * WAVE_SPEED + fi * 1.7) * WAVE_AMP * (1.0 + depth);
      // torção: cada camada gira um pouco em torno do próprio eixo
      q += TWIST * sin(q.yx * TWIST_FREQ + u_t * TWIST_SPD * 0.1 + fi);
      // deriva lateral por camada: dá a sensação de profundidade
      q.x += u_t * LAYER_SPEED * (0.4 + depth);

      // linhas paralelas: fract + smoothstep em vez de sin puro, para o
      // traço ficar fino e o vão largo (fibra, não onda de rádio)
      float f = fract(q.y * LINE_FREQ);
      float line = pow(1.0 - abs(f * 2.0 - 1.0), SHARPNESS);

      acc += line * (1.0 - depth * 0.55);
    }
    acc /= float(LAYERS);

    // vinheta: as fibras somem nas bordas para não brigarem com o texto
    float vig = 1.0 - smoothstep(0.35, 1.15, length(uv / SCALE) * 1.4);
    acc *= vig;

    // fundo claro: as fibras PINTAM sobre o creme (alpha), não emitem luz.
    // o dourado entra só na crista, como reflexo.
    vec3 col = mix(u_mauve, u_wine, smoothstep(0.15, 0.75, acc));
    col = mix(col, u_gold, smoothstep(0.72, 1.0, acc) * 0.45);

    gl_FragColor = vec4(col, clamp(acc * 1.35, 0.0, 1.0));
  }`;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('fibers:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uT = gl.getUniformLocation(prog, 'u_t');
  // mesmos valores de --wine, --mauve e --gold-deep do main.css
  gl.uniform3f(gl.getUniformLocation(prog, 'u_wine'), 0.612, 0.263, 0.349);
  gl.uniform3f(gl.getUniformLocation(prog, 'u_mauve'), 0.737, 0.525, 0.576);
  gl.uniform3f(gl.getUniformLocation(prog, 'u_gold'), 0.906, 0.714, 0.506);

  /* Escala interna: o canvas renderiza a 45% e o CSS estica de volta.
     São fibras difusas atrás de uma máscara radial com vinheta: ninguém
     distingue a resolução, e o custo cai para ~20% dos fragmentos
     (1151x1200 = 1,38M por frame vira ~280k). */
  const SCALE_PX = 0.45;

  const resize = () => {
    const w = (cv.clientWidth * SCALE_PX) | 0, h = (cv.clientHeight * SCALE_PX) | 0;
    if (w === cv.width && h === cv.height) return;
    cv.width = w; cv.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  let raf = 0, t0 = performance.now(), visible = true, lastDraw = 0;

  /* 24fps em vez de 60: a deriva é de 0.06 por segundo, mais lenta que a
     respiração de quem lê. Nesse ritmo o quadro extra não aparece, e o
     orçamento que ele custava volta para a rolagem. */
  const MIN_DT = 1000 / 24;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible) { cancelAnimationFrame(raf); raf = 0; return; }
    if (now - lastDraw < MIN_DT) return;
    lastDraw = now;
    resize();
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  // para o loop quando o hero sai da tela: rolar o resto da página não
  // deve custar um shader por frame
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
  }, { threshold: 0 }).observe(cv);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (visible) start();
  });

  addEventListener('resize', resize, { passive: true });

  resize();
  start();
  requestAnimationFrame(() => cv.classList.add('on'));
})();

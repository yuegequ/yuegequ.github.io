/* Hero gradient: a slow, domain-warped noise field in the site palette.
   Renders at reduced resolution, pauses off-screen and in hidden tabs, and
   leaves the CSS fallback image in place if WebGL is unavailable. */
(function () {
  'use strict';
  var host = document.querySelector('[data-gradient]');
  if (!host) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  var vert = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var frag = [
    'precision mediump float;',
    'uniform vec2 r;uniform float t;uniform vec2 m;',
    'vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}',
    'vec3 perm(vec3 x){return mod289(((x*34.)+1.)*x);}',
    'float snoise(vec2 v){',
    ' const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);',
    ' vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);',
    ' vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);',
    ' vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);',
    ' vec3 p=perm(perm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
    ' vec3 mm=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);mm=mm*mm;mm=mm*mm;',
    ' vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;',
    ' mm*=1.79284291400159-.85373472095314*(a0*a0+h*h);',
    ' vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(mm,g);}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/r;vec2 q=uv;q.x*=r.x/r.y;',
    ' float s=t*.045;',
    ' vec2 w=vec2(snoise(q*.9+vec2(s,-s*.7)),snoise(q*.9+vec2(-s*.6,s)+5.2));',
    ' w+=(m-uv)*.18;',
    ' float n=snoise(q*1.1+w*.85+s*.5)*.5+.5;',
    ' float k=snoise(q*.55-w*.6+vec2(9.1,-s))*.5+.5;',
    ' vec3 cream=vec3(.976,.937,.906);',
    ' vec3 tn=vec3(.898,.800,.698);',
    ' vec3 blush=vec3(.925,.804,.745);',
    ' vec3 lav=vec3(.839,.824,.961);',
    ' vec3 sky=vec3(.745,.839,.910);',
    ' vec3 c=mix(cream,tn,smoothstep(.25,.85,n));',
    ' c=mix(c,lav,smoothstep(.45,.95,k)*.75);',
    ' c=mix(c,blush,smoothstep(.55,1.,n*k*1.6)*.6);',
    ' c=mix(c,sky,smoothstep(.7,1.,1.-n)*.35*uv.y);',
    ' c=mix(c,cream,smoothstep(.55,0.,uv.y)*.55);', // keep the lower area calm for text
    ' float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);',
    ' c+=(g-.5)*.025;',
    ' gl_FragColor=vec4(c,1.);}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = sh(gl.VERTEX_SHADER, vert), fs = sh(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(prog, 'r'), uT = gl.getUniformLocation(prog, 't'), uM = gl.getUniformLocation(prog, 'm');

  host.appendChild(canvas);
  var scale = 0.5; // the field is soft, so half resolution looks identical and costs a quarter
  function resize() {
    var w = Math.max(1, Math.round(host.clientWidth * scale));
    var h = Math.max(1, Math.round(host.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uR, w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  var mouse = [0.5, 0.5], target = [0.5, 0.5];
  window.addEventListener('pointermove', function (e) {
    var b = host.getBoundingClientRect();
    target[0] = (e.clientX - b.left) / b.width;
    target[1] = 1 - (e.clientY - b.top) / b.height;
  }, { passive: true });

  var start = performance.now(), raf = 0, visible = true;
  function frame(now) {
    mouse[0] += (target[0] - mouse[0]) * 0.04;
    mouse[1] += (target[1] - mouse[1]) * 0.04;
    gl.uniform1f(uT, (now - start) / 1000 + 20);
    gl.uniform2f(uM, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  if (reduce) {
    gl.uniform1f(uT, 20); gl.uniform2f(uM, 0.5, 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    window.addEventListener('resize', function () { gl.drawArrays(gl.TRIANGLES, 0, 3); });
    return;
  }
  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    visible ? play() : stop();
  }).observe(host);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : play(); });
  play();
})();

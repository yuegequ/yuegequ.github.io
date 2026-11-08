(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var bar=document.createElement('div');bar.className='pbar';document.body.appendChild(bar);
var projs=[].slice.call(document.querySelectorAll('.proj .img'));
var phone=[].slice.call(document.querySelectorAll('.phone'));
var stages=[].slice.call(document.querySelectorAll('.stage .imgbox'));
var figs=[].slice.call(document.querySelectorAll('.wfgrid .fig img'));
var cards=[].slice.call(document.querySelectorAll('.sheet,.fash figure,.duo figure'));
var hero=document.querySelector('.hero .big'),sub=document.querySelector('.hero .sub'),eb=document.querySelector('.hero .eyebrow');
var ticking=false;
function enter(el){var r=el.getBoundingClientRect(),vh=innerHeight;return clamp((vh-r.top)/(vh*.75),0,1)}
function ease(t){return 1-Math.pow(1-t,3)}
function update(){
 ticking=false;var y=scrollY,vh=innerHeight;
 bar.style.transform='scaleX('+clamp(y/(document.documentElement.scrollHeight-vh),0,1)+')';
 if(hero){var k=clamp(y/500,0,1);hero.style.transform='translateY('+(y*.18)+'px)';hero.style.opacity=1-k*.9;
  if(sub){sub.style.transform='translateY('+(y*.1)+'px)';sub.style.opacity=1-k*1.1}
  if(eb){eb.style.opacity=1-k*1.2}}
 projs.forEach(function(el,i){var t=ease(enter(el)),d=i%2?1:-1;
  el.style.transform='translateX('+(d*(1-t)*90)+'px) scale('+(.92+.08*t)+')';el.style.opacity=.2+.8*t});
 phone.forEach(function(el){var t=ease(enter(el));
  el.style.transform='perspective(1200px) rotateY('+((1-t)*-24)+'deg) rotateX('+((1-t)*10)+'deg) scale('+(.86+.14*t)+')'});
 figs.forEach(function(el,i){var r=el.getBoundingClientRect(),s=clamp((r.top+r.height/2-vh/2)/vh,-1,1),t=ease(enter(el)),d=i%2?1:-1;
  el.style.transform='translateX('+(d*s*24)+'px) scale('+(.95+.05*t)+')'});
 cards.forEach(function(el,i){var t=ease(enter(el)),d=i%2?1:-1;
  el.style.transform='translateX('+(d*(1-t)*40)+'px)'});
}
function req(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
addEventListener('scroll',req,{passive:true});addEventListener('resize',req);update();
})();

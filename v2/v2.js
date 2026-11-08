/* Portfolio v2 interactions.
   Content is visible without this script; motion is layered on only when GSAP
   loads and the visitor hasn't asked for reduced motion. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------- World clock (same logic as home.js) ---------- */
  var clocks = $$('[data-tz]');
  var formatters = {};
  function hhmm(date, tz) {
    if (!formatters[tz]) formatters[tz] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    var h = '00', m = '00';
    formatters[tz].formatToParts(date).forEach(function (p) {
      if (p.type === 'hour') h = p.value === '24' ? '00' : p.value;
      if (p.type === 'minute') m = p.value;
    });
    return h + ':' + m;
  }
  function tick() {
    var now = new Date();
    clocks.forEach(function (el) {
      var t = hhmm(now, el.getAttribute('data-tz'));
      if (el.textContent !== t) el.textContent = t;
      el.setAttribute('datetime', t);
    });
    setTimeout(tick, 60000 - (now.getTime() % 60000) + 50);
  }
  if (clocks.length) tick();

  /* ---------- Letter roll on links (pure CSS once the markup is built) ---------- */
  $$('[data-roll]').forEach(function (a) {
    var text = a.textContent.trim();
    var row = function (cls) {
      return '<span class="roll__row ' + cls + '">' + text.split('').map(function (ch, i) {
        return '<span class="c" style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
      }).join('') + '</span>';
    };
    a.innerHTML = '<span class="sr-only">' + text + '</span><span class="roll" aria-hidden="true"><span class="roll__wrap">' + row('roll__row--a') + row('roll__row--b') + '</span></span>';
  });

  /* ---------- Header: solid after scrolling, hides on the way down ---------- */
  var head = $('.site-head');
  var lastY = 0;
  function onScroll(y) {
    if (!head) return;
    head.classList.toggle('is-scrolled', y > 24);
    if (!reduce) head.classList.toggle('is-hidden', y > 300 && y > lastY && !head.contains(document.activeElement));
    lastY = y;
  }
  onScroll(window.scrollY);

  /* ---------- No motion path ---------- */
  var gsap = window.gsap;
  if (reduce || !gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove('js-motion');
    window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
    $$('.gallery__pin').forEach(function (p) { p.classList.add('is-native'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText, window.CustomEase || {});
  if (window.CustomEase) CustomEase.create('soft', '0.65, 0.05, 0.36, 1');
  var EASE = window.CustomEase ? 'soft' : 'power3.inOut';
  var OUT = 'expo.out';

  /* ---------- Smooth scroll (Lenis driven by GSAP's ticker) ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ anchors: { offset: -72 }, lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', function (e) { ScrollTrigger.update(); onScroll(e.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', function () { onScroll(window.scrollY); }, { passive: true });
  }

  function shown(el) { el.classList.add('is-in'); }

  /* ---------- Reveal helpers ---------- */
  function revealLines(el, opts) {
    opts = opts || {};
    shown(el);
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
      onSplit: function (self) {
        padMasks(self);
        return gsap.from(self.lines, {
          yPercent: 110, duration: opts.duration || 1.1, ease: OUT, stagger: 0.08, delay: opts.delay || 0,
          scrollTrigger: opts.immediate ? null : { trigger: el, start: 'top 88%', once: true }
        });
      }
    });
  }
  // Masks clip to the line box; pad them so descenders (g, y, p) aren't cut off.
  function padMasks(split) {
    (split.masks || []).forEach(function (m) { m.style.paddingBottom = '0.16em'; m.style.marginBottom = '-0.16em'; });
    return split;
  }
  function revealChars(el, delay) {
    shown(el);
    var split = padMasks(SplitText.create(el, { type: 'words,chars', mask: 'words' }));
    return gsap.from(split.chars, { yPercent: 115, duration: 1.2, ease: OUT, stagger: 0.022, delay: delay || 0 });
  }

  /* ---------- Hero intro (runs after the loader, or straight away) ---------- */
  function heroIn() {
    var tl = gsap.timeline();
    $$('[data-split="hero"]').forEach(function (h) { tl.add(revealChars(h), 0); });
    var rest = $$('[data-hero-fade]');
    rest.forEach(shown);
    if (rest.length) tl.from(rest, { y: 24, autoAlpha: 0, duration: 1, ease: OUT, stagger: 0.08 }, 0.45);
    var bg = $('.hero__bg');
    if (bg) tl.from(bg, { scale: 1.12, duration: 2.2, ease: OUT }, 0);
    return tl;
  }

  /* ---------- Loader (first visit per session, homepage only) ---------- */
  var loader = $('.loader');
  var seen = false;
  try { seen = sessionStorage.getItem('iq-loaded') === '1'; } catch (e) { /* storage blocked */ }
  if (loader && !seen) {
    try { sessionStorage.setItem('iq-loaded', '1'); } catch (e) { /* ignore */ }
    loader.classList.add('is-on');
    if (lenis) lenis.stop();
    var name = $('.loader__name', loader);
    var split = SplitText.create(name, { type: 'chars' });
    gsap.timeline({
      onComplete: function () { loader.remove(); if (lenis) lenis.start(); }
    })
      .from(split.chars, { yPercent: 120, duration: 0.9, ease: OUT, stagger: 0.035 })
      .to('.loader__bar span', { scaleX: 1, duration: 1.1, ease: EASE }, 0.1)
      .from('.loader__meta', { autoAlpha: 0, duration: 0.5 }, 0.3)
      .to(split.chars, { yPercent: -120, duration: 0.6, ease: 'power3.in', stagger: 0.015 }, '+=0.1')
      .to(loader, { yPercent: -100, duration: 1, ease: EASE }, '-=0.25')
      .add(heroIn(), '-=0.55');
  } else {
    if (loader) loader.remove();
    heroIn();
  }

  /* ---------- Scroll reveals ---------- */
  $$('[data-reveal="lines"]').forEach(function (el) { revealLines(el); });
  $$('[data-reveal="chars"]').forEach(function (el) {
    shown(el);
    var split = padMasks(SplitText.create(el, { type: 'words,chars', mask: 'words' }));
    gsap.from(split.chars, { yPercent: 115, duration: 1.1, ease: OUT, stagger: 0.02, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  ScrollTrigger.batch('[data-reveal="fade"]', {
    start: 'top 90%', once: true,
    onEnter: function (els) {
      els.forEach(shown);
      gsap.from(els, { y: 40, autoAlpha: 0, duration: 1.1, ease: OUT, stagger: 0.08 });
    }
  });
  $$('[data-reveal="image"]').forEach(function (el) {
    shown(el);
    var img = $('img', el);
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    tl.from(el, { clipPath: 'inset(14% 8% 14% 8% round 24px)', duration: 1.4, ease: OUT });
    if (img) tl.from(img, { scale: 1.18, duration: 1.6, ease: OUT }, 0);
  });
  // Gentle parallax on large covers
  $$('[data-parallax] img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // Rows and list items draw their divider in
  $$('[data-reveal="rows"]').forEach(function (list) {
    shown(list);
    gsap.from(list.children, { y: 30, autoAlpha: 0, duration: 1, ease: OUT, stagger: 0.09, scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
  });

  /* ---------- Art gallery: pinned horizontal scroll on large screens ---------- */
  var mm = gsap.matchMedia();
  $$('.gallery__pin').forEach(function (pin) {
    var track = $('.gallery__track', pin);
    mm.add('(min-width: 900px) and (hover: hover) and (pointer: fine)', function () {
      pin.classList.remove('is-native');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.frame img', track).forEach(function (img) {
        gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentNode, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      // Keyboard users tabbing through the track: scroll the page to the matching point
      track.addEventListener('focusin', function (e) {
        var st = tween.scrollTrigger, fig = e.target.closest('figure');
        if (!st || !fig) return;
        var p = Math.min(1, Math.max(0, (fig.offsetLeft - window.innerWidth * 0.2) / dist()));
        var y = st.start + (st.end - st.start) * p;
        lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
      });
      return function () { pin.classList.add('is-native'); };
    });
    mm.add('not ((min-width: 900px) and (hover: hover) and (pointer: fine))', function () { pin.classList.add('is-native'); });
  });

  /* ---------- Footer CTA ---------- */
  var cta = $('.foot__cta');
  if (cta) {
    var label = $('.foot__cta-text', cta);
    if (label) {
      shown(label);
      var fs = padMasks(SplitText.create(label, { type: 'words,chars', mask: 'words' }));
      gsap.from(fs.chars, { yPercent: 115, duration: 1.2, ease: OUT, stagger: 0.03, scrollTrigger: { trigger: cta, start: 'top 90%', once: true } });
    }
  }

  /* ---------- Cursor + project hover preview (fine pointers only) ---------- */
  if (!finePointer) return;
  var cursor = $('.cursor');
  var preview = $('.preview');
  if (cursor) {
    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');
    var cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
    var cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
    var px = preview && gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3.out' });
    var py = preview && gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3.out' });
    window.addEventListener('pointermove', function (e) {
      cursor.classList.remove('is-hidden');
      cx(e.clientX); cy(e.clientY);
      if (px) { px(e.clientX); py(e.clientY); }
      var t = e.target;
      var view = t.closest && t.closest('[data-cursor="view"]');
      var link = !view && t.closest && t.closest('a, button, [role="button"]');
      cursor.classList.toggle('is-view', !!view);
      cursor.classList.toggle('is-link', !!link);
      cursor.classList.toggle('on-dark', !view && !!(t.closest && t.closest('.dark')));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.add('is-hidden'); });
    document.addEventListener('pointerenter', function () { cursor.classList.remove('is-hidden'); });
  }
  if (preview) {
    gsap.set(preview, { xPercent: 12, yPercent: -50, scale: 0.85 }); // sit just right of the pointer so the hovered title stays visible
    var imgs = $$('img', preview);
    var showing = false;
    $$('.project').forEach(function (row, i) {
      row.addEventListener('pointerenter', function () {
        imgs.forEach(function (im, j) { im.classList.toggle('is-active', j === i); });
        if (!showing) { showing = true; gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.5, ease: OUT, overwrite: 'auto' }); }
      });
    });
    var list = $('.projects');
    if (list) list.addEventListener('pointerleave', function () {
      showing = false;
      gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    });
  }

  // Images loading late can change layout; keep trigger positions honest.
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

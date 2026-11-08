(function () {
  'use strict';

  // World clock: all displays come from one Date instant, formatted per IANA zone.
  var clocks = [].slice.call(document.querySelectorAll('[data-tz]'));
  var formatters = {};
  function fmt(tz) {
    if (!formatters[tz]) {
      formatters[tz] = new Intl.DateTimeFormat('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    }
    return formatters[tz];
  }
  function hhmm(date, tz) {
    var parts = fmt(tz).formatToParts(date), h = '00', m = '00';
    parts.forEach(function (p) {
      if (p.type === 'hour') h = p.value === '24' ? '00' : p.value;
      if (p.type === 'minute') m = p.value;
    });
    return h + ':' + m;
  }
  function render() {
    var now = new Date();
    clocks.forEach(function (el) {
      var t = hhmm(now, el.getAttribute('data-tz'));
      if (el.textContent !== t) el.textContent = t;
      el.setAttribute('datetime', t);
    });
    // Wake just after the next minute boundary.
    setTimeout(render, 60000 - (now.getTime() % 60000) + 50);
  }
  if (clocks.length) {
    render();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) clocks.forEach(function (el) {
        el.textContent = hhmm(new Date(), el.getAttribute('data-tz'));
      });
    });
  }
  window.__portfolioClock = hhmm; // exposed for testing

  // Project track: map vertical wheel to horizontal scroll only when the track is
  // horizontal, the gesture is mostly vertical, and the track can still move that way.
  var track = document.querySelector('.track');
  if (track) {
    track.addEventListener('wheel', function (e) {
      if (e.ctrlKey) return;
      var horizontal = getComputedStyle(track).overflowX === 'auto' && track.scrollWidth > track.clientWidth + 1;
      if (!horizontal) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // native trackpad swipe
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      var max = track.scrollWidth - track.clientWidth;
      if ((dy < 0 && track.scrollLeft <= 0) || (dy > 0 && track.scrollLeft >= max - 1)) return; // let page scroll
      e.preventDefault();
      track.scrollLeft += dy;
    }, { passive: false });
  }
})();

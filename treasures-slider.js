/* Treasures: photo sliders and a full-size lightbox.
   Native scroll-snap does the swiping in each card; this adds the arrow buttons,
   dots, counter and arrow-key support, plus a lightbox that shows the whole photo
   with its own previous/next and close controls. Without JS the photos are still
   a swipeable strip. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Card sliders ---------- */
  var sliders = document.querySelectorAll('.treasure-slider');

  [].forEach.call(sliders, function (slider) {
    var track = slider.querySelector('.slider-track');
    var slides = [].slice.call(track.children);
    var prev = slider.querySelector('.slider-prev');
    var next = slider.querySelector('.slider-next');
    var dots = [].slice.call(slider.querySelectorAll('.slider-dot'));
    var count = slider.querySelector('.slider-count');
    var current = 0;

    slider.classList.add('is-js');

    function update(index) {
      current = index;
      dots.forEach(function (dot, i) {
        if (i === index) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (count) count.textContent = (index + 1) + ' / ' + slides.length;
    }

    function goTo(index) {
      index = Math.max(0, Math.min(slides.length - 1, index));
      track.scrollTo({ left: slides[index].offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      update(index);
    }

    prev.addEventListener('click', function () { goTo(current === 0 ? slides.length - 1 : current - 1); });
    next.addEventListener('click', function () { goTo(current === slides.length - 1 ? 0 : current + 1); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    });

    /* Keep the dots and counter in step with swipes and drags */
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        var index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== current && index >= 0 && index < slides.length) update(index);
      });
    }, { passive: true });

    update(0);
  });

  /* ---------- Lightbox ---------- */
  var boxes = document.querySelectorAll('.treasure-box');
  if (!boxes.length) return;

  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Treasure photos');
  lb.hidden = true;
  lb.innerHTML =
    '<button type="button" class="lb-close" aria-label="Close photo">&times;</button>' +
    '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo"><span aria-hidden="true">&lsaquo;</span></button>' +
    '<button type="button" class="lb-btn lb-next" aria-label="Next photo"><span aria-hidden="true">&rsaquo;</span></button>' +
    '<figure class="lb-stage"><img class="lb-img" src="" alt=""></figure>' +
    '<p class="lb-caption"><span class="lb-title"></span><span class="lb-count"></span></p>';
  document.body.appendChild(lb);

  var lbImg = lb.querySelector('.lb-img');
  var lbClose = lb.querySelector('.lb-close');
  var lbPrev = lb.querySelector('.lb-prev');
  var lbNext = lb.querySelector('.lb-next');
  var lbTitle = lb.querySelector('.lb-title');
  var lbCount = lb.querySelector('.lb-count');
  var group = [];
  var gIndex = 0;
  var gTitle = '';
  var lastFocus = null;
  var hideTimer = null;

  function show(index) {
    gIndex = (index + group.length) % group.length;
    var img = group[gIndex];
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbTitle.textContent = gTitle;
    lbCount.textContent = group.length > 1 ? (gIndex + 1) + ' / ' + group.length : '';
    lb.classList.toggle('is-single', group.length < 2);
  }

  function openLightbox(box, index, trigger) {
    group = [].slice.call(box.querySelectorAll('.modal-media img'));
    var titleEl = box.querySelector('.modal-title');
    gTitle = titleEl ? titleEl.textContent : '';
    lastFocus = trigger || document.activeElement;
    clearTimeout(hideTimer);
    show(index);
    lb.hidden = false;
    document.documentElement.classList.add('lb-open');
    void lb.offsetWidth; /* register the hidden state before fading in */
    lb.classList.add('is-open');
    document.addEventListener('keydown', onKey);
    lbClose.focus();
  }

  function closeLightbox() {
    if (lb.hidden) return;
    document.removeEventListener('keydown', onKey);
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('lb-open');
    hideTimer = setTimeout(function () { lb.hidden = true; }, reduceMotion ? 0 : 250);
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); return; }
    if (e.key === 'ArrowRight' && group.length > 1) { e.preventDefault(); show(gIndex + 1); return; }
    if (e.key === 'ArrowLeft' && group.length > 1) { e.preventDefault(); show(gIndex - 1); return; }
    if (e.key !== 'Tab') return;
    var items = [lbClose, lbPrev, lbNext].filter(function (b) { return b.offsetParent !== null; });
    var first = items[0];
    var last = items[items.length - 1];
    if (!lb.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function () { show(gIndex - 1); });
  lbNext.addEventListener('click', function () { show(gIndex + 1); });
  /* a click on the dark backdrop closes; a click on the photo or the buttons does not */
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-stage')) closeLightbox();
  });

  /* swipe between photos on touch screens */
  var touchX = null;
  lb.addEventListener('touchstart', function (e) {
    touchX = e.touches.length === 1 ? e.touches[0].clientX : null;
  }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX === null || group.length < 2) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) show(gIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* every treasure photo opens the lightbox: click the photo, or use its "View full size" button */
  [].forEach.call(boxes, function (box) {
    var media = box.querySelector('.modal-media');
    if (!media) return;
    var imgs = [].slice.call(media.querySelectorAll('img'));

    var expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'media-expand';
    expand.setAttribute('aria-label', 'View full size');
    expand.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    media.appendChild(expand);

    function currentIndex() {
      var track = media.querySelector('.slider-track');
      return track ? Math.round(track.scrollLeft / track.clientWidth) : 0;
    }
    expand.addEventListener('click', function () { openLightbox(box, currentIndex(), expand); });
    imgs.forEach(function (img) {
      img.addEventListener('click', function () { openLightbox(box, imgs.indexOf(img), expand); });
    });
  });
})();

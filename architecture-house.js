/* Architecture of the House: tabbed drawings with clickable rooms.
   Without JavaScript the static <img> drawings are all shown, one after the other.
   Room text lives in assets/data/architecture-rooms.json so it can be edited without code. */
(function () {
  'use strict';

  var root = document.querySelector('.arch-house');
  if (!root || !window.fetch) return;

  var tabs = [].slice.call(root.querySelectorAll('.arch-tab'));
  var views = [].slice.call(root.querySelectorAll('.arch-view'));
  var content = root.querySelector('.wrap');
  var drawer = root.querySelector('.arch-drawer');
  var scrim = root.querySelector('.arch-scrim');
  var closeBtn = root.querySelector('.arch-drawer-close');
  var photoFig = drawer.querySelector('.arch-drawer-photo');
  var photoImg = photoFig.querySelector('img');
  var floorEl = drawer.querySelector('.arch-drawer-floor');
  var titleEl = drawer.querySelector('#arch-drawer-title');
  var dimsEl = drawer.querySelector('.arch-drawer-dims');
  var descEl = drawer.querySelector('.arch-drawer-desc');
  var linkBtn = drawer.querySelector('.arch-drawer-link');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var rooms = {};
  var lastTrigger = null;
  var closeTimer = null;

  root.classList.add('arch-js');

  /* ---------- Tabs ---------- */
  function selectTab(key, moveFocus) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-view') === key;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && moveFocus) tab.focus();
    });
    views.forEach(function (view) {
      view.hidden = view.getAttribute('data-view') !== key;
    });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab.getAttribute('data-view'), false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      selectTab(tabs[next].getAttribute('data-view'), true);
    });
  });

  /* ---------- Room panel (side drawer on desktop, bottom sheet on mobile) ---------- */
  function focusables() {
    return [].slice.call(drawer.querySelectorAll('button:not([hidden])')).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePanel(true);
      return;
    }
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (!drawer.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openPanel(key, trigger) {
    var room = rooms[key];
    if (!room) return;
    clearTimeout(closeTimer);

    floorEl.textContent = room.floor || '';
    floorEl.hidden = !room.floor;
    titleEl.textContent = room.name || '';
    dimsEl.textContent = room.dimensions || '';
    dimsEl.hidden = !room.dimensions;
    descEl.textContent = room.description || '';
    if (room.photo) {
      photoImg.src = room.photo;
      photoImg.alt = room.photoAlt || room.name || '';
      photoFig.hidden = false;
    } else {
      photoFig.hidden = true;
      photoImg.removeAttribute('src');
    }
    if (room.tab) {
      linkBtn.hidden = false;
      linkBtn.textContent = 'Show on the ' + (room.tabLabel || 'plan') + ' →';
      linkBtn.setAttribute('data-tab', room.tab);
      linkBtn.setAttribute('data-focus', room.focus || '');
    } else {
      linkBtn.hidden = true;
    }

    setActive(trigger);
    lastTrigger = trigger || null;
    drawer.hidden = false;
    scrim.hidden = false;
    content.inert = true;
    void drawer.offsetWidth; /* let the browser register the hidden state before animating */
    drawer.classList.add('is-open');
    scrim.classList.add('is-open');
    document.addEventListener('keydown', onKeydown);
    closeBtn.focus();
  }

  function closePanel(restoreFocus) {
    if (drawer.hidden) return;
    document.removeEventListener('keydown', onKeydown);
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
    content.inert = false;
    setActive(null);
    closeTimer = setTimeout(function () {
      drawer.hidden = true;
      scrim.hidden = true;
    }, reduceMotion ? 0 : 420);
    if (restoreFocus && lastTrigger && document.body.contains(lastTrigger)) {
      lastTrigger.focus({ preventScroll: true });
    }
  }

  function setActive(el) {
    [].forEach.call(root.querySelectorAll('.hotspot.is-active'), function (h) {
      h.classList.remove('is-active');
    });
    if (el) el.classList.add('is-active');
  }

  closeBtn.addEventListener('click', function () { closePanel(true); });
  scrim.addEventListener('click', function () { closePanel(true); });

  /* A section level that has a matching floor plan links across to that tab */
  linkBtn.addEventListener('click', function () {
    var tab = linkBtn.getAttribute('data-tab');
    var focusId = linkBtn.getAttribute('data-focus');
    closePanel(false);
    selectTab(tab, false);
    var view = root.querySelector('.arch-view[data-view="' + tab + '"]');
    var target = focusId && view ? view.querySelector('#' + focusId) : null;
    if (target) {
      target.classList.remove('is-pulse');
      void target.getBoundingClientRect();
      target.classList.add('is-pulse');
      target.focus();
    } else {
      root.querySelector('#arch-tab-' + tab).focus();
    }
    if (view) view.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  });

  /* ---------- Load room data and swap the static images for inline SVG ---------- */
  function wire(svg) {
    [].forEach.call(svg.querySelectorAll('.hotspot'), function (spot) {
      var key = spot.getAttribute('data-room') || spot.id;
      var room = rooms[key];
      if (!room) return;
      spot.setAttribute('tabindex', '0');
      spot.setAttribute('role', 'button');
      spot.setAttribute('aria-label', room.name + (room.dimensions ? ', ' + room.dimensions : '') + '. Open details');
      spot.addEventListener('click', function () { openPanel(key, spot); });
      spot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPanel(key, spot);
        }
      });
      spot.addEventListener('animationend', function () { spot.classList.remove('is-pulse'); });
    });
  }

  var dataReady = fetch('assets/data/architecture-rooms.json')
    .then(function (r) { return r.ok ? r.json() : { rooms: {} }; })
    .then(function (d) { rooms = d.rooms || {}; })
    .catch(function () { rooms = {}; });

  views.forEach(function (view) {
    var img = view.querySelector('.arch-drawing img');
    if (!img) return;
    Promise.all([
      fetch(img.getAttribute('src')).then(function (r) {
        if (!r.ok) throw new Error('svg');
        return r.text();
      }),
      dataReady
    ]).then(function (res) {
      var holder = document.createElement('div');
      holder.innerHTML = res[0];
      var svg = holder.querySelector('svg');
      if (!svg) return;
      svg.setAttribute('role', 'group');
      svg.setAttribute('aria-label', img.alt);
      svg.setAttribute('focusable', 'false');
      img.parentNode.replaceChild(svg, img);
      wire(svg);
    }).catch(function () { /* keep the static image */ });
  });
})();

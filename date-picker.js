/* Contact form: a calendar dropdown styled like the rest of the site, in place of the
   browser's native date popup. Vanilla JS. The text field keeps name="date", so the
   existing form validation and reset keep working. Past dates are not selectable. */
(function () {
  'use strict';

  var input = document.getElementById('date');
  if (!input || !input.closest('.date-picker')) return;

  var wrap = input.closest('.date-picker');
  var pop = wrap.querySelector('.dp-pop');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function pretty(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  var today = startOfDay(new Date());
  var selected = null;
  var viewYear = today.getFullYear();
  var viewMonth = today.getMonth();
  var focusDate = today;
  var isOpen = false;

  pop.hidden = true;

  function build() {
    var first = new Date(viewYear, viewMonth, 1);
    var lead = (first.getDay() + 6) % 7; /* Monday first */
    var count = new Date(viewYear, viewMonth + 1, 0).getDate();
    var atMin = viewYear === today.getFullYear() && viewMonth === today.getMonth();

    var html = '<div class="dp-head">' +
      '<button type="button" class="dp-nav dp-prev" aria-label="Previous month"' + (atMin ? ' disabled' : '') + '><span aria-hidden="true">&lsaquo;</span></button>' +
      '<p class="dp-title" aria-live="polite">' + MONTHS[viewMonth] + ' ' + viewYear + '</p>' +
      '<button type="button" class="dp-nav dp-next" aria-label="Next month"><span aria-hidden="true">&rsaquo;</span></button>' +
      '</div><div class="dp-grid" role="grid" aria-label="' + MONTHS[viewMonth] + ' ' + viewYear + '">';

    DAYS.forEach(function (d) { html += '<span class="dp-dow" aria-hidden="true">' + d + '</span>'; });
    for (var i = 0; i < lead; i++) html += '<span class="dp-blank"></span>';
    for (var n = 1; n <= count; n++) {
      var d = new Date(viewYear, viewMonth, n);
      var past = d < today;
      var cls = 'dp-day' + (sameDay(d, today) ? ' is-today' : '') + (sameDay(d, selected) ? ' is-selected' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + iso(d) + '"' +
        ' tabindex="' + (sameDay(d, focusDate) ? '0' : '-1') + '"' +
        ' aria-label="' + pretty(d) + '"' + (sameDay(d, selected) ? ' aria-pressed="true"' : '') +
        (past ? ' disabled' : '') + '>' + n + '</button>';
    }
    html += '</div><div class="dp-foot">' +
      '<button type="button" class="dp-link dp-today">Today</button>' +
      '<button type="button" class="dp-link dp-clear">Clear</button></div>';
    pop.innerHTML = html;
  }

  function focusDay() {
    var el = pop.querySelector('.dp-day[data-date="' + iso(focusDate) + '"]');
    if (el && !el.disabled) el.focus();
    else {
      var any = pop.querySelector('.dp-day:not(:disabled)');
      if (any) any.focus();
    }
  }

  function showMonthOf(d) {
    viewYear = d.getFullYear();
    viewMonth = d.getMonth();
  }

  function open() {
    if (isOpen) return;
    focusDate = selected || today;
    showMonthOf(focusDate);
    build();
    pop.hidden = false;
    wrap.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    isOpen = true;
    focusDay();
  }

  function close(restoreFocus) {
    if (!isOpen) return;
    pop.hidden = true;
    wrap.classList.remove('is-open');
    input.setAttribute('aria-expanded', 'false');
    isOpen = false;
    if (restoreFocus) input.focus();
  }

  function choose(d) {
    selected = d;
    input.value = d ? pretty(d) : '';
    input.setAttribute('data-iso', d ? iso(d) : '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur')); /* re-run the form's validation so the error clears */
    close(true);
  }

  function moveFocus(d) {
    if (d < today) return;
    focusDate = d;
    if (d.getMonth() !== viewMonth || d.getFullYear() !== viewYear) { showMonthOf(d); build(); }
    else {
      [].forEach.call(pop.querySelectorAll('.dp-day'), function (b) { b.tabIndex = b.getAttribute('data-date') === iso(d) ? 0 : -1; });
    }
    focusDay();
  }

  input.addEventListener('click', function () { isOpen ? close(false) : open(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); open(); }
  });
  wrap.querySelector('.date-picker-icon').addEventListener('click', function () { isOpen ? close(false) : open(); });

  pop.addEventListener('click', function (e) {
    var day = e.target.closest('.dp-day');
    if (day && !day.disabled) {
      var p = day.getAttribute('data-date').split('-');
      choose(new Date(+p[0], +p[1] - 1, +p[2]));
      return;
    }
    if (e.target.closest('.dp-prev')) {
      if (viewMonth === 0) { viewMonth = 11; viewYear--; } else viewMonth--;
      focusDate = new Date(viewYear, viewMonth, 1) < today ? today : new Date(viewYear, viewMonth, 1);
      build();
      var prev = pop.querySelector('.dp-prev:not(:disabled)') || pop.querySelector('.dp-next');
      prev.focus();
    } else if (e.target.closest('.dp-next')) {
      if (viewMonth === 11) { viewMonth = 0; viewYear++; } else viewMonth++;
      focusDate = new Date(viewYear, viewMonth, 1);
      build();
      pop.querySelector('.dp-next').focus();
    } else if (e.target.closest('.dp-today')) {
      choose(today);
    } else if (e.target.closest('.dp-clear')) {
      choose(null);
    }
  });

  pop.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (!e.target.classList.contains('dp-day')) return;
    var cur = focusDate;
    var map = {
      ArrowLeft: addDays(cur, -1), ArrowRight: addDays(cur, 1),
      ArrowUp: addDays(cur, -7), ArrowDown: addDays(cur, 7),
      Home: addDays(cur, -((cur.getDay() + 6) % 7)), End: addDays(cur, 6 - ((cur.getDay() + 6) % 7)),
      PageUp: new Date(cur.getFullYear(), cur.getMonth() - (e.shiftKey ? 12 : 1), cur.getDate()),
      PageDown: new Date(cur.getFullYear(), cur.getMonth() + (e.shiftKey ? 12 : 1), cur.getDate())
    };
    if (map[e.key]) { e.preventDefault(); moveFocus(map[e.key]); }
  });

  /* close when focus or a click leaves the picker */
  wrap.addEventListener('focusout', function (e) {
    if (isOpen && e.relatedTarget && !wrap.contains(e.relatedTarget)) close(false);
  });
  /* composedPath is taken when the click starts, so redrawing the month (which replaces
     the clicked arrow) does not make an inside click look like an outside one */
  document.addEventListener('click', function (e) {
    if (isOpen && e.composedPath().indexOf(wrap) === -1) close(false);
  });

  /* the form's reset (after a successful send) clears the chosen date */
  var form = input.closest('form');
  if (form) form.addEventListener('reset', function () {
    selected = null;
    input.setAttribute('data-iso', '');
    close(false);
  });
})();

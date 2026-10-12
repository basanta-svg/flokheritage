/* ==========================================================================
   Folk Heritage — Shared behaviour
   Nav scroll state, mobile menu, Contact form.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------- Footer: live Thimphu clock ---------- */
  var footerTime = document.getElementById('footerTime');
  if (footerTime) {
    var formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Thimphu',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    var tick = function () { footerTime.textContent = formatter.format(new Date()); };
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var solidFromStart = header.dataset.solid === 'true';
    var onScroll = function () {
      if (solidFromStart || window.scrollY > 40) {
        header.classList.add('is-solid');
      } else {
        header.classList.remove('is-solid');
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.btn-menu');
  var body = document.body;
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var isOpen = body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    document.querySelectorAll('.nav-mobile a').forEach(function (link) {
      link.addEventListener('click', function () {
        body.classList.remove('menu-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && body.classList.contains('menu-open')) {
        body.classList.remove('menu-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Mobile menu: About / Architecture dropdown groups ---------- */
  document.querySelectorAll('.nav-mobile-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var submenu = document.getElementById(toggle.getAttribute('aria-controls'));
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (submenu) submenu.classList.toggle('is-open', !isOpen);
    });
  });

  /* ---------- Signature Experiences: accordion ---------- */
  document.querySelectorAll('.exp-row:not(.exp-row-static) .exp-row-head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.exp-row');
      var isOpen = row.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  /* ---------- Contact form validation (shared by both forms) ---------- */
  var initFormValidation = function (form, validators, successMessage) {
    if (!form) return;

    var validateField = function (field) {
      var name = field.name;
      if (!validators[name]) return true;
      var error = validators[name](field.value);
      var wrapper = field.closest('.field');
      var errorEl = wrapper.querySelector('.field-error');
      wrapper.classList.toggle('has-error', !!error);
      if (errorEl) errorEl.textContent = error;
      return !error;
    };

    form.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.addEventListener('blur', function () { validateField(field); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('input, textarea, select');
      var allValid = true;
      fields.forEach(function (field) {
        if (!validateField(field)) allValid = false;
      });

      var statusEl = form.querySelector('.form-status');
      if (allValid) {
        statusEl.textContent = successMessage;
        statusEl.classList.remove('is-error');
        statusEl.classList.add('is-visible');
        form.reset();
      } else {
        statusEl.textContent = 'Please correct the highlighted fields and try again.';
        statusEl.classList.add('is-visible', 'is-error');
      }
    });
  };

  initFormValidation(
    document.querySelector('.reservation-form'),
    {
      name: function (v) { return v.trim().length > 1 ? '' : 'Please enter your full name.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
      phone: function (v) { return v.trim().length === 0 || /^[0-9+()\-\s]{7,}$/.test(v.trim()) ? '' : 'Please enter a valid phone number.'; },
      date: function (v) { return v ? '' : 'Please choose a date.'; },
      guests: function (v) { return v && Number(v) > 0 ? '' : 'Please enter a party size.'; },
      message: function () { return ''; }
    },
    'Thank you — your inquiry has been received. We will confirm your reservation by email shortly.'
  );

  initFormValidation(
    document.querySelector('.museum-contact-form'),
    {
      name: function (v) { return v.trim().length > 1 ? '' : 'Please enter your name.'; },
      phone: function (v) { return v.trim().length === 0 || /^[0-9+()\-\s]{7,}$/.test(v.trim()) ? '' : 'Please enter a valid phone number.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
      reason: function (v) { return v ? '' : 'Please choose a reason for contacting us.'; },
      message: function (v) { return v.trim().length > 3 ? '' : 'Please enter a short message.'; }
    },
    'Thank you — your message has been received. We will reply within a day.'
  );

  /* ---------- Facts & Figures: rolling number count-up ---------- */
  var yearsSinceEl = document.querySelector('.stat-value[data-since]');
  if (yearsSinceEl) {
    var sinceYear = parseInt(yearsSinceEl.getAttribute('data-since'), 10);
    var yearsElapsed = new Date().getFullYear() - sinceYear;
    yearsSinceEl.setAttribute('data-count-to', yearsElapsed);
  }

  var statValues = document.querySelectorAll('.stat-value[data-count-to]');
  if (statValues.length) {
    var statsReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var formatStat = function (n) { return n.toLocaleString('en-US'); };

    var animateStat = function (el) {
      var target = parseInt(el.getAttribute('data-count-to'), 10);
      if (isNaN(target)) return;

      if (statsReduceMotion) {
        el.textContent = formatStat(target);
        return;
      }

      var duration = 1600;
      var start = null;

      var step = function (timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic — fast start, gentle landing
        el.textContent = formatStat(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          el.textContent = formatStat(target);
        }
      };
      window.requestAnimationFrame(step);
    };

    statValues.forEach(function (el) { el.textContent = '0'; });

    if ('IntersectionObserver' in window) {
      var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      statValues.forEach(function (el) { statObserver.observe(el); });
    } else {
      statValues.forEach(function (el) { el.textContent = formatStat(parseInt(el.getAttribute('data-count-to'), 10)); });
    }
  }

  /* ---------- Inside the Manor: museum floor guide ---------- */
  var manorGuide = document.getElementById('manor-guide');
  if (manorGuide) {
    var manorTabs = manorGuide.querySelectorAll('.manor-guide-tab');
    var manorPanel = manorGuide.querySelector('.manor-guide-panel');
    var manorImg = manorGuide.querySelector('#manorGuideImg');
    var manorName = manorGuide.querySelector('#manorGuideName');
    var manorDesc = manorGuide.querySelector('#manorGuideDesc');
    var manorCta = manorGuide.querySelector('#manorGuideCta');
    var manorReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    manorTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-active')) return;

        manorTabs.forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        var applyContent = function () {
          manorImg.src = tab.dataset.image;
          manorImg.alt = tab.dataset.alt;
          manorName.textContent = tab.dataset.name;
          manorDesc.textContent = tab.dataset.desc;
          if (manorCta && tab.dataset.href) {
            manorCta.href = tab.dataset.href;
            manorCta.innerHTML = (tab.dataset.cta || 'Explore') + ' <span class="arrow">&rarr;</span>';
          }
        };

        if (manorReduceMotion || !manorPanel) {
          applyContent();
          return;
        }

        manorPanel.classList.add('is-revealing');
        window.setTimeout(function () {
          applyContent();
          // Force reflow so the re-added class restarts the reveal animation.
          void manorPanel.offsetWidth;
          manorPanel.classList.remove('is-revealing');
        }, 260);
      });
    });
  }

  /* ---------- Advisory Committee: organogram reveal ---------- */
  var orgChart = document.querySelector('.org-chart');
  if (orgChart) {
    var orgReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (orgReduceMotion || !('IntersectionObserver' in window)) {
      orgChart.classList.add('is-visible');
    } else {
      var orgObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            orgChart.classList.add('is-visible');
          } else {
            orgChart.classList.remove('is-visible');
          }
        });
      }, { threshold: 0.25 });
      orgObserver.observe(orgChart);
    }
  }

  /* ---------- Team grid: reveal ---------- */
  var teamGrid = document.querySelector('.team-grid');
  if (teamGrid) {
    var teamReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (teamReduceMotion || !('IntersectionObserver' in window)) {
      teamGrid.classList.add('is-visible');
    } else {
      var teamObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            teamGrid.classList.add('is-visible');
            teamObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      teamObserver.observe(teamGrid);
    }
  }

  /* ---------- Scroll-driven hero reveal ---------- */
  var revealSection = document.getElementById('hero-reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (revealSection && !reduceMotion) {
    var revealMedia = revealSection.querySelector('.hero-reveal-media img');
    var revealOverlay = revealSection.querySelector('.hero-reveal-overlay');
    var revealText = revealSection.querySelector('.hero-reveal-text');
    var revealWords = revealSection.querySelectorAll('.rv-word');
    var revealDesc = revealSection.querySelector('.hero-reveal-desc');

    var clamp = function (value, min, max) {
      return Math.min(Math.max(value, min), max);
    };

    // Scroll progress (0-1) is split into three phases:
    //   0.00–0.32  image settles in (scale + fade) while parallax runs throughout
    //   0.32–0.70  dark scrim rises, heading words reveal word-by-word
    //   0.68–1.00  description surfaces
    var ticking = false;

    var updateReveal = function () {
      ticking = false;
      var rect = revealSection.getBoundingClientRect();
      var total = revealSection.offsetHeight - window.innerHeight;
      var scrolled = clamp(-rect.top, 0, total);
      var progress = total > 0 ? scrolled / total : 0;

      var imagePhase = clamp(progress / 0.32, 0, 1);
      var textPhase = clamp((progress - 0.32) / 0.38, 0, 1);
      var descPhase = clamp((progress - 0.68) / 0.32, 0, 1);

      // Scale settles to 1.14 (not 1.0) so the image always keeps enough
      // overscan to cover the parallax translateY without exposing the
      // frame's edge underneath it.
      var scale = 1.24 - imagePhase * 0.1;
      var parallaxY = progress * -30;
      revealMedia.style.transform = 'scale(' + scale + ') translateY(' + parallaxY + 'px)';

      var overlayOpacity = Math.max(textPhase, descPhase) * 0.6;
      revealOverlay.style.opacity = overlayOpacity;

      revealText.style.opacity = (textPhase > 0 || descPhase > 0) ? 1 : 0;

      // Stagger word start times across 65% of the text phase, each word
      // taking 35% to fully fade in — guarantees the last word still
      // reaches opacity 1 (pure white) exactly when textPhase completes.
      var wordCount = revealWords.length;
      var staggerSpread = 0.65;
      var wordDuration = 0.35;
      revealWords.forEach(function (word, i) {
        var start = wordCount > 1 ? (i / (wordCount - 1)) * staggerSpread : 0;
        var end = start + wordDuration;
        var local = clamp((textPhase - start) / (end - start), 0, 1);
        word.style.opacity = local;
        word.style.transform = 'translateY(' + (1 - local) * 24 + 'px)';
      });

      revealDesc.style.opacity = descPhase;
      revealDesc.style.transform = 'translateY(' + (1 - descPhase) * 16 + 'px)';
    };

    var onRevealScroll = function () {
      if (!ticking) {
        window.requestAnimationFrame(updateReveal);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onRevealScroll, { passive: true });
    window.addEventListener('resize', onRevealScroll);
    updateReveal();
  }
})();

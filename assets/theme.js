/* The Persian Office theme scripts — no dependencies. */
(function () {
  'use strict';

  var theme = window.theme || { routes: {} };
  var routes = theme.routes || {};
  var root = routes.root || '/';

  /* ------------------------------------------------------------------ utils */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    format = format || theme.moneyFormat || '£{{amount}}';
    var match = format.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!match) return String(cents);
    function fmt(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number == null) return '0';
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      return dollars + centsPart;
    }
    var value;
    switch (match[1]) {
      case 'amount': value = fmt(cents, 2); break;
      case 'amount_no_decimals': value = fmt(cents, 0); break;
      case 'amount_with_comma_separator': value = fmt(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = fmt(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = fmt(cents, 2, "'", '.'); break;
      default: value = fmt(cents, 2);
    }
    return format.replace(/\{\{\s*\w+\s*\}\}/, value);
  }

  function fetchJSON(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, opts.headers || {});
    return fetch(url, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw data;
        return data;
      });
    });
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /* ------------------------------------------------------------- countdown */
  function initCountdowns() {
    $$('[data-countdown]').forEach(function (el) {
      var mode = el.getAttribute('data-mode');
      var endAttr = el.getAttribute('data-end');
      var fixedEnd = null;
      if (mode === 'date' && endAttr) {
        var parsed = new Date(endAttr.replace(' ', 'T'));
        if (!isNaN(parsed)) fixedEnd = parsed;
      }
      var units = {
        d: $('[data-unit="d"]', el), h: $('[data-unit="h"]', el),
        m: $('[data-unit="m"]', el), s: $('[data-unit="s"]', el)
      };
      function tick() {
        var now = new Date();
        var end = fixedEnd;
        if (!end) { end = new Date(now); end.setHours(24, 0, 0, 0); }
        var diff = Math.max(0, Math.floor((end - now) / 1000));
        units.d.textContent = pad(Math.floor(diff / 86400));
        units.h.textContent = pad(Math.floor((diff % 86400) / 3600));
        units.m.textContent = pad(Math.floor((diff % 3600) / 60));
        units.s.textContent = pad(diff % 60);
      }
      tick();
      setInterval(tick, 1000);
    });
  }

  /* ---------------------------------------------------------- announcement */
  function initAnnouncements() {
    $$('[data-announcement]').forEach(function (track) {
      var slides = $$('.announcement-bar__slide', track);
      if (slides.length < 2) return;
      var speed = (parseInt(track.getAttribute('data-speed'), 10) || 4) * 1000;
      var i = 0;
      setInterval(function () {
        var current = slides[i];
        i = (i + 1) % slides.length;
        current.classList.remove('is-active');
        current.classList.add('is-leaving');
        slides[i].classList.add('is-active');
        setTimeout(function () { current.classList.remove('is-leaving'); }, 500);
      }, speed);
    });
  }

  /* ------------------------------------------------------------ menu drawer */
  function initMenuDrawer() {
    var drawer = $('[data-menu-drawer]');
    if (!drawer) return;
    function open() { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
    function close() { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
    $$('[data-menu-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-menu-close]', drawer).forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ------------------------------------------------------------ cart drawer */
  var Cart = {
    drawer: function () { return $('[data-cart-drawer]'); },
    open: function () {
      var d = Cart.drawer();
      if (!d) { window.location.href = routes.cart || '/cart'; return; }
      d.classList.add('is-open');
      d.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var panel = $('.cart-drawer__panel', d);
      if (panel) panel.focus();
      Cart.startReserveTimer();
    },
    close: function () {
      var d = Cart.drawer();
      if (!d) return;
      d.classList.remove('is-open');
      d.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    },
    refresh: function (openAfter) {
      return fetch(root + '?sections=cart-drawer')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var html = data['cart-drawer'];
          var current = Cart.drawer();
          if (html && current) {
            var tmp = document.createElement('div');
            tmp.innerHTML = html;
            var fresh = $('[data-cart-drawer]', tmp);
            if (fresh) {
              var wasOpen = current.classList.contains('is-open');
              current.replaceWith(fresh);
              Cart.bind();
              if (wasOpen || openAfter) {
                fresh.classList.add('is-open');
                fresh.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
                Cart.startReserveTimer();
              }
            }
          }
          return fetchJSON((routes.cart || '/cart') + '.js');
        })
        .then(function (cart) {
          $$('[data-cart-count]').forEach(function (el) {
            el.textContent = cart.item_count;
            el.hidden = cart.item_count === 0;
          });
          return cart;
        })
        .catch(function () {
          if (openAfter && !Cart.drawer()) window.location.href = routes.cart || '/cart';
        });
    },
    add: function (items) {
      return fetchJSON((routes.cartAdd || '/cart/add') + '.js', {
        method: 'POST',
        body: JSON.stringify({ items: items })
      }).then(function (res) {
        if (theme.cartType === 'page' || !Cart.drawer()) {
          window.location.href = routes.cart || '/cart';
          return res;
        }
        return Cart.refresh(true).then(function () { return res; });
      });
    },
    change: function (key, quantity) {
      return fetchJSON((routes.cartChange || '/cart/change') + '.js', {
        method: 'POST',
        body: JSON.stringify({ id: key, quantity: quantity })
      }).then(function () { return Cart.refresh(false); });
    },
    reserveInterval: null,
    startReserveTimer: function () {
      var el = $('[data-reserve-timer]');
      if (!el) return;
      var out = $('[data-reserve-time]', el);
      var minutes = parseInt(el.getAttribute('data-minutes'), 10) || 10;
      var key = 'pm-cart-reserve-end';
      var end;
      try { end = parseInt(sessionStorage.getItem(key), 10); } catch (e) { end = 0; }
      if (!end || end < Date.now()) {
        end = Date.now() + minutes * 60000;
        try { sessionStorage.setItem(key, String(end)); } catch (e) { /* ignore */ }
      }
      clearInterval(Cart.reserveInterval);
      function tick() {
        var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
        out.textContent = Math.floor(left / 60) + ':' + pad(left % 60);
      }
      tick();
      Cart.reserveInterval = setInterval(tick, 1000);
    },
    bind: function () {
      var d = Cart.drawer();
      if (!d) return;
      $$('[data-cart-close]', d).forEach(function (b) {
        b.addEventListener('click', function (e) {
          if (b.tagName === 'A' && d.classList.contains('is-empty')) { e.preventDefault(); }
          Cart.close();
        });
      });
      $$('.cart-item', d).forEach(function (item) {
        var key = item.getAttribute('data-key');
        var input = $('[data-qty-input]', item);
        $$('[data-qty-change]', item).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var q = Math.max(0, parseInt(input.value, 10) + parseInt(btn.getAttribute('data-qty-change'), 10));
            item.style.opacity = '.5';
            Cart.change(key, q);
          });
        });
        input.addEventListener('change', function () {
          item.style.opacity = '.5';
          Cart.change(key, Math.max(0, parseInt(input.value, 10) || 0));
        });
        var rm = $('[data-qty-remove]', item);
        if (rm) rm.addEventListener('click', function () { item.style.opacity = '.5'; Cart.change(key, 0); });
      });
      var up = $('[data-cart-upsell]', d);
      if (up) {
        up.addEventListener('change', function () {
          if (up.checked) {
            Cart.add([{ id: parseInt(up.getAttribute('data-variant-id'), 10), quantity: 1 }]);
          } else if (up.getAttribute('data-key')) {
            Cart.change(up.getAttribute('data-key'), 0);
          }
        });
      }
    },
    init: function () {
      $$('[data-cart-open]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          if (!Cart.drawer() || theme.cartType === 'page') return;
          e.preventDefault();
          Cart.open();
        });
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Cart.close(); });
      Cart.bind();
    }
  };
  window.PMCart = Cart;

  /* ---------------------------------------------------------- product page */
  function initProduct(section) {
    var jsonEl = $('[data-product-json]', section);
    var data = jsonEl ? JSON.parse(jsonEl.textContent) : { variants: [] };
    var variants = data.variants || [];
    var current = variants.filter(function (v) { return v.id === data.currentVariant; })[0] || variants[0] || null;
    var form = $('[data-product-form]', section);
    var idInput = $('[data-variant-input]', section);
    var qtyInput = $('[data-quantity]', section);
    var addBtn = $('[data-add-button]', section);
    var errorEl = $('[data-form-error]', section);

    /* Gallery */
    var gallery = $('[data-gallery]', section);
    if (gallery) {
      var slidesWrap = $('[data-gallery-slides]', gallery);
      var slides = $$('.product-gallery__slide', gallery);
      var thumbs = $$('.product-gallery__thumb', gallery);
      var thumbsTrack = $('[data-gallery-thumbs]', gallery);
      var active = Math.max(0, slides.findIndex(function (s) { return s.classList.contains('is-active'); }));
      var thumbOffset = 0;
      var desktop = window.matchMedia('(min-width: 990px)');

      var show = function (i, scroll) {
        if (i < 0) i = slides.length - 1;
        if (i >= slides.length) i = 0;
        active = i;
        slides.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
        thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === i); });
        if (!desktop.matches && scroll !== false) {
          slidesWrap.scrollTo({ left: slides[i].offsetLeft - slidesWrap.offsetLeft - 10, behavior: 'smooth' });
        }
        // keep active thumb in view (5 visible)
        if (i < thumbOffset) thumbOffset = i;
        if (i > thumbOffset + 4) thumbOffset = i - 4;
        moveThumbs();
      };
      var moveThumbs = function () {
        if (!thumbsTrack || !thumbs.length) return;
        var max = Math.max(0, thumbs.length - 5);
        thumbOffset = Math.min(Math.max(0, thumbOffset), max);
        var step = thumbs[0].parentElement.getBoundingClientRect().width + 10;
        thumbsTrack.style.transform = 'translateX(' + (-thumbOffset * step) + 'px)';
      };
      thumbs.forEach(function (t) {
        t.addEventListener('click', function () { show(parseInt(t.getAttribute('data-thumb-index'), 10)); });
      });
      var prev = $('[data-thumbs-prev]', gallery);
      var next = $('[data-thumbs-next]', gallery);
      if (prev) prev.addEventListener('click', function () { show(active - 1); });
      if (next) next.addEventListener('click', function () { show(active + 1); });
      var mNext = $('[data-gallery-next]', gallery);
      if (mNext) mNext.addEventListener('click', function () { show(active + 1); });
      slidesWrap.addEventListener('scroll', function () {
        if (desktop.matches) return;
        var w = slides[0].getBoundingClientRect().width + 8;
        var i = Math.round(slidesWrap.scrollLeft / w);
        if (i !== active && slides[i]) {
          active = i;
          thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === i); });
        }
      }, { passive: true });
      window.addEventListener('resize', moveThumbs);
      section._showMedia = function (mediaId) {
        var idx = slides.findIndex(function (s) { return String(s.getAttribute('data-media-id')) === String(mediaId); });
        if (idx > -1) show(idx);
      };
    }

    /* Quantity breaks */
    var qb = $('[data-quantity-breaks]', section);
    var qbOptions = qb ? $$('.quantity-break', qb) : [];
    function selectedQty() {
      var sel = qbOptions.filter(function (o) { return o.classList.contains('is-selected'); })[0];
      return sel ? parseInt(sel.getAttribute('data-qty'), 10) : 1;
    }
    function updateQtyBreakPrices() {
      if (!current) return;
      qbOptions.forEach(function (o) {
        var q = parseInt(o.getAttribute('data-qty'), 10);
        var disc = parseFloat(o.getAttribute('data-discount')) || 0;
        var price = Math.floor(current.price * q * (100 - disc) / 100);
        var compare = (current.compare_at_price || current.price) * q;
        var p = $('[data-qb-price]', o);
        var c = $('[data-qb-compare]', o);
        if (p) p.textContent = formatMoney(price);
        if (c) { c.textContent = formatMoney(compare); c.hidden = compare <= price; }
      });
    }
    qbOptions.forEach(function (o) {
      var input = $('input', o);
      input.addEventListener('change', function () {
        qbOptions.forEach(function (x) { x.classList.toggle('is-selected', x === o); });
        if (qtyInput) qtyInput.value = selectedQty();
      });
    });
    if (qtyInput) qtyInput.value = selectedQty();

    /* Variant picker */
    var picker = $('[data-variant-picker]', section);
    function renderPrice(target, variant, compact) {
      if (!target || !variant) return;
      var saleEl = $('.price__sale', target);
      var compareEl = $('.price__compare', target);
      var badgeEl = $('.price__badge span', target);
      if (saleEl) saleEl.textContent = formatMoney(variant.price);
      var onSale = variant.compare_at_price && variant.compare_at_price > variant.price;
      if (compareEl) { compareEl.textContent = formatMoney(variant.compare_at_price || 0); compareEl.hidden = !onSale; }
      if (badgeEl) {
        var tpl = badgeEl.getAttribute('data-template');
        if (!tpl) {
          var pct = onSale ? Math.round((variant.compare_at_price - variant.price) * 100 / variant.compare_at_price) : 0;
          tpl = badgeEl.textContent.replace(String(pct), '[percent]');
          badgeEl.setAttribute('data-template', tpl);
        }
        var pct2 = onSale ? Math.round((variant.compare_at_price - variant.price) * 100 / variant.compare_at_price) : 0;
        badgeEl.textContent = tpl.replace('[percent]', pct2);
        badgeEl.parentElement.hidden = !onSale;
      }
    }
    // capture badge templates before any change
    $$('.price__badge span', section).forEach(function (b) { renderPrice(b.closest('.price').parentElement, current); });

    if (picker) {
      picker.addEventListener('change', function () {
        var chosen = $$('fieldset', picker).map(function (fs) {
          var c = $('input:checked', fs);
          return c ? c.value : null;
        });
        var match = variants.filter(function (v) {
          return v.options.every(function (opt, i) { return opt === chosen[i]; });
        })[0];
        current = match || null;
        if (!current) {
          if (addBtn) addBtn.disabled = true;
          return;
        }
        if (idInput) idInput.value = current.id;
        if (addBtn) {
          addBtn.disabled = !current.available;
          $('[data-add-label]', addBtn).textContent = current.available ? addBtn.getAttribute('data-label') || $('[data-add-label]', addBtn).textContent : 'Sold out';
        }
        $$('[data-price], [data-sticky-price]', section).forEach(function (p) { renderPrice(p, current); });
        updateQtyBreakPrices();
        if (current.featured_media && section._showMedia) section._showMedia(current.featured_media.id);
        var url = new URL(window.location.href);
        url.searchParams.set('variant', current.id);
        window.history.replaceState({}, '', url.toString());
      });
      if (addBtn) addBtn.setAttribute('data-label', $('[data-add-label]', addBtn).textContent);
    }

    /* Add to cart */
    function submit() {
      if (!current || !addBtn) return;
      var items = [{ id: parseInt(idInput.value, 10), quantity: parseInt(qtyInput.value, 10) || 1 }];
      var upsell = $('[data-upsell-toggle]', section);
      if (upsell && upsell.checked && upsell.getAttribute('data-variant-id')) {
        var upId = parseInt(upsell.getAttribute('data-variant-id'), 10);
        if (upId) items.push({ id: upId, quantity: 1 });
      }
      addBtn.classList.add('is-loading');
      addBtn.disabled = true;
      if (errorEl) errorEl.hidden = true;
      Cart.add(items)
        .catch(function (err) {
          if (errorEl) {
            errorEl.textContent = (err && (err.description || err.message)) || 'Something went wrong. Please try again.';
            errorEl.hidden = false;
          }
        })
        .then(function () {
          addBtn.classList.remove('is-loading');
          addBtn.disabled = !(current && current.available);
        });
    }
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submit();
      });
    }

    /* Sticky ATC */
    var sticky = $('[data-sticky-atc]', section);
    if (sticky && addBtn) {
      document.body.classList.add('has-sticky-atc-enabled');
      var io = new IntersectionObserver(function (entries) {
        var e = entries[0];
        var below = e.boundingClientRect.top < 0; // scrolled past the button
        var show = !e.isIntersecting && below;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
        document.body.classList.toggle('has-sticky-atc', show);
      });
      io.observe(addBtn);
      $('[data-sticky-add]', sticky).addEventListener('click', function () { submit(); });
    }

    /* Shipping timeline */
    var tl = $('[data-shipping-timeline]', section);
    if (tl) {
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      var ord = function (n) {
        var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      };
      var fmt = function (d) { return months[d.getMonth()] + ' ' + ord(d.getDate()); };
      var add = function (days) { var d = new Date(); d.setDate(d.getDate() + days); return d; };
      var num = function (a) { return parseInt(tl.getAttribute(a), 10) || 0; };
      $('[data-date="ordered"]', tl).textContent = fmt(new Date());
      $('[data-date="ready"]', tl).textContent = fmt(add(num('data-ready-min'))) + ' - ' + fmt(add(num('data-ready-max')));
      $('[data-date="delivered"]', tl).textContent = fmt(add(num('data-delivered-min'))) + ' - ' + fmt(add(num('data-delivered-max')));
    }
  }

  /* ----------------------------------------------------------- bundle deal */
  function initBundles() {
    $$('[data-bundle]').forEach(function (b) {
      var btn = $('[data-bundle-add]', b);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var items = $$('[data-bundle-item]', b)
          .map(function (row) { return parseInt(row.getAttribute('data-variant-id'), 10); })
          .filter(Boolean)
          .map(function (id) { return { id: id, quantity: 1 }; });
        if (!items.length) return;
        btn.classList.add('is-loading');
        Cart.add(items).catch(function () {}).then(function () { btn.classList.remove('is-loading'); });
      });
    });
  }

  /* ------------------------------------------------------- simple sliders */
  function initSliders() {
    $$('[data-slider]').forEach(function (s) {
      var track = $('[data-slider-track]', s);
      if (!track) return;
      var prev = $('[data-slider-prev]', s);
      var next = $('[data-slider-next]', s);
      function step() {
        var first = track.firstElementChild;
        return first ? first.getBoundingClientRect().width + 15 : track.clientWidth;
      }
      function update() {
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', update, { passive: true });
      update();
    });
  }

  /* -------------------------------------------------- reviews pagination */
  function initReviews() {
    $$('[data-reviews]').forEach(function (wrap) {
      var list = $('[data-reviews-list]', wrap);
      var nav = $('[data-reviews-pagination]', wrap);
      if (!list || !nav) return;
      var items = $$('.review', list);
      var per = parseInt(wrap.getAttribute('data-per-page'), 10) || 5;
      var pages = Math.ceil(items.length / per);
      var page = 1;
      var sortDesc = true;
      var chevL = '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var chevR = '<svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      function render() {
        items.forEach(function (it, i) { it.hidden = Math.floor(i / per) + 1 !== page; });
        if (pages < 2) { nav.innerHTML = ''; return; }
        var html = '<button type="button" data-p="' + (page - 1) + '" aria-label="Previous"' + (page === 1 ? ' disabled' : '') + '>' + chevL + '</button>';
        var shown = [];
        for (var p = 1; p <= pages; p++) {
          if (p === 1 || p === pages || Math.abs(p - page) <= 1 || (page <= 2 && p <= 4)) shown.push(p);
        }
        var last = 0;
        shown.forEach(function (p) {
          if (p - last > 1) html += '<span>...</span>';
          html += '<button type="button" data-p="' + p + '"' + (p === page ? ' class="is-active" aria-current="page"' : '') + '>' + p + '</button>';
          last = p;
        });
        html += '<button type="button" data-p="' + (page + 1) + '" aria-label="Next"' + (page === pages ? ' disabled' : '') + '>' + chevR + '</button>';
        nav.innerHTML = html;
      }
      nav.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-p]');
        if (!b || b.disabled) return;
        page = Math.min(pages, Math.max(1, parseInt(b.getAttribute('data-p'), 10)));
        render();
        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var sortBtn = $('[data-reviews-sort]', wrap);
      if (sortBtn) {
        sortBtn.addEventListener('click', function () {
          items.sort(function (a, b) {
            var d = parseInt(b.getAttribute('data-rating'), 10) - parseInt(a.getAttribute('data-rating'), 10);
            return sortDesc ? d : -d;
          });
          sortDesc = !sortDesc;
          items.forEach(function (it) { list.appendChild(it); });
          page = 1;
          render();
        });
      }
      render();
    });
  }

  /* --------------------------------------------------------- scroll to top */
  function initScrollTop() {
    var btn = $('[data-scroll-top]');
    if (!btn) return;
    btn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    var onScroll = function () { btn.classList.toggle('is-visible', window.scrollY > 600); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function init() {
    initCountdowns();
    initAnnouncements();
    initMenuDrawer();
    Cart.init();
    $$('product-page').forEach(initProduct);
    initBundles();
    initSliders();
    initReviews();
    initScrollTop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Theme editor: re-init when sections reload
  document.addEventListener('shopify:section:load', function (e) {
    var t = e.target;
    $$('product-page', t).forEach(initProduct);
    initCountdowns();
    initAnnouncements();
    initSliders();
    initReviews();
    initBundles();
  });
})();

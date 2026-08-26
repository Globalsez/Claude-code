/* Apostille Seychelles — progressive enhancement only.
   Every page is fully readable and every link works with JavaScript disabled. */
(function () {
  'use strict';

  /* ---------------------------------------------------------- sticky header */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------ mobile nav */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------------- scroll reveals */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      reveals.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i % 6, 5) * 60 + 'ms';
        io.observe(el);
      });
    }
  }

  /* --------------------------------------------------------- enquiry form */
  /* No backend: the form composes a message and hands it to WhatsApp, or to
     the visitor's mail client if WhatsApp is not configured. */
  var form = document.getElementById('enquiryForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var lines = [
        'New enquiry from the website',
        '',
        'Name: ' + (data.get('name') || ''),
        'Email: ' + (data.get('email') || ''),
        'Country the document is for: ' + (data.get('country') || ''),
        'Service: ' + (data.get('service') || ''),
        '',
        (data.get('message') || '')
      ];
      var body = lines.join('\n');
      var wa = form.getAttribute('data-whatsapp');
      var mail = form.getAttribute('data-email');
      var status0 = document.getElementById('formStatus');
      if (!wa && !mail) {
        if (status0) status0.textContent = 'Sorry — no contact channel is configured on this site yet. Please use the details listed alongside this form.';
        return;
      }
      var url = wa
        ? wa + (wa.indexOf('?') === -1 ? '?' : '&') + 'text=' + encodeURIComponent(body)
        : 'mailto:' + mail + '?subject=' + encodeURIComponent('Website enquiry') + '&body=' + encodeURIComponent(body);

      var status = document.getElementById('formStatus');
      if (status) {
        status.textContent = wa
          ? 'Opening WhatsApp with your enquiry…'
          : 'Opening your email application…';
      }
      window.open(url, wa ? '_blank' : '_self', 'noopener');
    });
  }

  /* ------------------------------------------------------- paypal buttons */
  /* Only runs in SDK mode; PayPal.Me mode is a plain link and needs nothing. */
  var targets = document.querySelectorAll('.paypal-sdk-target');
  if (targets.length && window.paypal && window.paypal.Buttons) {
    targets.forEach(function (el) {
      window.paypal.Buttons({
        style: { shape: 'pill', color: 'gold', layout: 'vertical', label: 'pay', height: 45 },
        createOrder: function (data, actions) {
          return actions.order.create({
            purchase_units: [{
              description: el.dataset.description,
              amount: { value: el.dataset.amount, currency_code: el.dataset.currency }
            }]
          });
        },
        onApprove: function (data, actions) {
          return actions.order.capture().then(function (details) {
            el.innerHTML =
              '<p class="small" style="text-align:center;color:var(--sea-600);font-weight:600">' +
              'Payment received — thank you. Reference ' + details.id + '.<br>' +
              'We will confirm your instruction by email shortly.</p>';
          });
        },
        onError: function () {
          el.innerHTML =
            '<p class="small" style="text-align:center;color:var(--clay-600)">' +
            'The payment could not be completed. Please message us and we will send an invoice.</p>';
        }
      }).render(el);
    });
  }
})();

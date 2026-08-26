#!/usr/bin/env node
/**
 * Apostille Seychelles — static site generator.
 *
 * Reads site.config.json + src/layout.html + src/pages/*.html and writes plain
 * static HTML to the repo root. No dependencies, no framework, no runtime JS
 * required for content: prices and contact details are baked into the HTML at
 * build time so they are visible to search engines.
 *
 *   node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const layout = fs.readFileSync(path.join(ROOT, 'src/layout.html'), 'utf8');

const warnings = [];
const isTodo = (v) => typeof v === 'string' && v.startsWith('TODO');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ icons */
const ICONS = {
  building: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h2a2 2 0 0 1 2 2v10M9 7h2M9 11h2M9 15h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
  seal: '<circle cx="12" cy="9" r="5"/><path d="m8.5 13.5-1 7.5L12 19l4.5 2-1-7.5"/>',
  certificate: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 9h6M7 13h4M17 19v3l-1.5-1L14 22v-3"/>',
  cap: '<path d="m12 4 10 5-10 5L2 9l10-5Z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  check: '<path d="m20 6-11 11-5-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V6l-8-3Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v4a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3Z"/>',
  pin: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
};
const icon = (name, size = 20, sw = 1.7) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;

const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1s-.7 1-.9 1.2c-.2.2-.3.2-.6.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.4 4.7 2 .8 2.7.9 3.7.8.6-.1 1.8-.8 2.1-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z"/><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.2-.4-4.5-1.3l-.3-.2-3 .9.9-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';

/* ------------------------------------------------- contact / payment links */
const waNumber = String(cfg.contact.whatsapp || '').replace(/[^\d]/g, '');
const waConfigured = !isTodo(cfg.contact.whatsapp) && waNumber.length >= 8;
if (!waConfigured) warnings.push('contact.whatsapp is not set — WhatsApp buttons fall back to the contact page.');

function waLink(message) {
  if (!waConfigured) return '{{BASE}}contact.html';
  const text = encodeURIComponent(message || cfg.contact.whatsappMessage || '');
  return `https://wa.me/${waNumber}${text ? `?text=${text}` : ''}`;
}

const emailConfigured = !isTodo(cfg.contact.email) && String(cfg.contact.email).includes('@');
if (!emailConfigured) warnings.push('contact.email is not set — the enquiry form and email links are placeholders.');
const emailAddr = emailConfigured ? cfg.contact.email : 'enquiries@example.com';

const pp = cfg.paypal || {};
const ppHandle = String(pp.payPalMeHandle || '').replace(/^.*paypal\.me\//i, '').replace(/^@/, '').trim();
const ppMeReady = pp.mode === 'paypalme' && ppHandle && !isTodo(ppHandle);
const ppSdkReady = pp.mode === 'sdk' && pp.clientId && !isTodo(pp.clientId);
if (!ppMeReady && !ppSdkReady) {
  warnings.push(`paypal is not configured (mode="${pp.mode}") — pay buttons fall back to "Request an invoice".`);
}

/**
 * Renders the payment control for one service. Never renders a broken
 * checkout: with no price or no PayPal credentials it degrades to an enquiry.
 */
function payButton(svc) {
  const cur = cfg.pricing.currency || 'USD';
  const sym = cfg.pricing.currencySymbol || '';
  const hasPrice = typeof svc.price === 'number' && svc.price > 0;

  if (!hasPrice || (!ppMeReady && !ppSdkReady)) {
    const msg = `Hello — I would like a quote for: ${svc.name}.`;
    return `<a class="btn btn--block ${waConfigured ? 'btn--wa' : ''}" href="${esc(waLink(msg))}"${waConfigured ? ' target="_blank" rel="noopener"' : ''}>
        ${waConfigured ? WA_ICON : ''}<span>${hasPrice ? 'Request an invoice' : 'Request a quote'}</span>
      </a>`;
  }

  if (ppSdkReady) {
    return `<div class="paypal-sdk-target" data-amount="${svc.price.toFixed(2)}" data-currency="${esc(cur)}" data-description="${esc(svc.name)} — ${esc(cfg.site.name)}"></div>
      <noscript><a class="btn btn--block" href="mailto:${esc(emailAddr)}?subject=${encodeURIComponent(svc.name)}">Request an invoice</a></noscript>`;
  }

  const url = `https://www.paypal.com/paypalme/${encodeURIComponent(ppHandle)}/${svc.price.toFixed(2)}${cur}`;
  return `<a class="btn btn--block" href="${esc(url)}" target="_blank" rel="noopener">
      Pay ${esc(sym)}${svc.price.toFixed(2)} with PayPal
    </a>`;
}

const addressLines = cfg.contact.addressLines.filter((l) => !isTodo(l));
if (addressLines.length !== cfg.contact.addressLines.length) {
  warnings.push('some contact.addressLines are still TODO — they are omitted from the site rather than displayed.');
}

const paypalTrust = `<p class="paypal-trust">${icon('lock', 14, 2)} Secure payment to ${esc(pp.accountName || cfg.site.legalName)} via PayPal</p>`;

/* ---------------------------------------------------------------- renders */
function priceMarkup(svc) {
  const sym = cfg.pricing.currencySymbol || '';
  const cur = cfg.pricing.currency || '';
  if (typeof svc.price === 'number' && svc.price > 0) {
    return `<p class="price"><span class="price__amount">${esc(sym)}${svc.price.toFixed(2)}</span><span class="price__unit">${esc(cur)} per document</span></p>`;
  }
  return `<p class="price price--tbc"><span class="price__amount">Price on request</span></p>`;
}

function serviceCard(svc, opts = {}) {
  const featured = svc.popular && opts.allowFeature !== false;
  return `<article class="card ${featured ? 'card--featured card--clay' : ''} reveal" id="${esc(svc.id)}">
    ${featured ? '<span class="badge">Most requested</span>' : ''}
    <span class="card__icon">${icon(svc.icon, 24)}</span>
    <h3>${esc(svc.name)}</h3>
    <p>${esc(svc.blurb)}</p>
    ${opts.includes !== false ? `<ul class="ticks">${svc.includes.map((i) => `<li>${icon('check', 15, 2.4)}<span>${esc(i)}</span></li>`).join('')}</ul>` : ''}
    ${opts.price !== false ? priceMarkup(svc) : ''}
    <p class="meta-row">${icon('clock', 15, 2)}<span>${esc(svc.turnaround)}</span></p>
    <div class="card__foot">
      ${opts.pay === false
        ? `<a class="btn btn--ghost btn--block" href="{{BASE}}pricing.html#${esc(svc.id)}">View pricing</a>`
        : `<div class="paypal-box">${payButton(svc)}${(typeof svc.price === 'number' && (ppMeReady || ppSdkReady)) ? paypalTrust : ''}</div>`}
    </div>
  </article>`;
}

const BLOCKS = {
  SERVICE_CARDS: () => cfg.services.map((s) => serviceCard(s, { pay: false, includes: false })).join('\n'),
  PRICING_CARDS: () => cfg.services.map((s) => serviceCard(s)).join('\n'),

  PRICING_TABLE: () => {
    const sym = cfg.pricing.currencySymbol || '';
    const rows = cfg.services.map((s) => `<tr>
        <td><strong>${esc(s.name)}</strong></td>
        <td>${esc(s.turnaround)}</td>
        <td>${typeof s.price === 'number' && s.price > 0 ? `${esc(sym)}${s.price.toFixed(2)} ${esc(cfg.pricing.currency)}` : '<span class="muted">On request</span>'}</td>
        <td><a href="#${esc(s.id)}">Details</a></td>
      </tr>`).join('');
    return `<div class="scroll-x"><table class="tbl">
      <thead><tr><th>Service</th><th>Typical turnaround</th><th>Price</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  },

  FAQ_LIST: () => `<div class="faq">${cfg.faqs.map((f) => `<details>
      <summary>${esc(f.q)}</summary>
      <div><p>${esc(f.a)}</p></div>
    </details>`).join('')}</div>`,

  STEPS: () => `<ol class="steps">${cfg.steps.map((s) => `<li class="step reveal">
      <span class="step__n">${esc(s.n)}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.body)}</p>
    </li>`).join('')}</ol>`,

  TRUSTBAR: () => `<dl class="trustbar__grid">${cfg.trust.map((t) => `<div>
      <dt>${esc(t.stat)}</dt><dd>${esc(t.label)}</dd>
    </div>`).join('')}</dl>`,

  CONTACT_DETAILS: () => {
    const items = [];
    if (emailConfigured) items.push(`<li>${icon('mail', 18, 2)}<div><strong>Email</strong><a href="mailto:${esc(emailAddr)}">${esc(emailAddr)}</a></div></li>`);
    if (waConfigured) items.push(`<li>${WA_ICON}<div><strong>WhatsApp</strong><a href="${esc(waLink())}" target="_blank" rel="noopener">${esc(cfg.contact.whatsappDisplay)}</a></div></li>`);
    if (!isTodo(cfg.contact.phone)) items.push(`<li>${icon('phone', 18, 2)}<div><strong>Telephone</strong><a href="tel:${esc(String(cfg.contact.phone).replace(/\s/g, ''))}">${esc(cfg.contact.phone)}</a></div></li>`);
    items.push(`<li>${icon('pin', 18, 2)}<div><strong>Office</strong>${addressLines.map(esc).join('<br>')}</div></li>`);
    items.push(`<li>${icon('clock', 18, 2)}<div><strong>Hours</strong>${esc(cfg.contact.hours)}</div></li>`);
    return `<ul class="contact-list">${items.join('')}</ul>`;
  },

  PAYPAL_BOOT: () => ppSdkReady
    ? `<script src="https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(pp.clientId)}&currency=${encodeURIComponent(cfg.pricing.currency)}&components=buttons&intent=capture" defer></script>`
    : '',

  EMAIL_LINK: () => emailConfigured
    ? `<a href="mailto:${esc(emailAddr)}">${esc(emailAddr)}</a>`
    : '<a href="{{BASE}}contact.html">Send an enquiry</a>',

  EMAIL_SENTENCE: () => emailConfigured
    ? `Prefer email? Write to <a href="mailto:${esc(emailAddr)}">${esc(emailAddr)}</a>.`
    : '',

  SERVICE_OPTIONS: () => cfg.services.map((s) => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join(''),
};

/* ------------------------------------------------------------ token table */
const YEAR = new Date().getFullYear();
const tokens = {
  SITE_NAME: esc(cfg.site.name),
  LEGAL_NAME: esc(cfg.site.legalName),
  SITE_URL: cfg.site.url.replace(/\/$/, ''),
  TAGLINE: esc(cfg.site.tagline),
  YEAR: String(YEAR),
  EMAIL: esc(emailAddr),
  PHONE: esc(isTodo(cfg.contact.phone) ? '' : cfg.contact.phone),
  HOURS: esc(cfg.contact.hours),
  LOCATION_SHORT: esc(cfg.contact.locationShort),
  ADDRESS_HTML: addressLines.map(esc).join('<br>'),
  WA_LINK: esc(waLink()),
  WA_DISPLAY: esc(waConfigured ? cfg.contact.whatsappDisplay : 'Message us'),
  WA_ICON,
  WA_TARGET: waConfigured ? ' target="_blank" rel="noopener"' : '',
  PRICING_NOTE: esc(cfg.pricing.note),
  // empty when unconfigured, so the form never targets a placeholder destination
  WA_FORM: waConfigured ? esc(waLink('')) : '',
  EMAIL_FORM: emailConfigured ? esc(emailAddr) : '',
  CURRENCY: esc(cfg.pricing.currency),
};

function applyTokens(html) {
  // generated blocks first, then scalars
  html = html.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => {
    if (BLOCKS[key]) return BLOCKS[key]();
    if (key in tokens) return tokens[key];
    return m;
  });
  return html;
}

/* -------------------------------------------------------------- structured data */
function jsonLd(page) {
  const graph = [
    {
      '@type': 'LegalService',
      '@id': `${tokens.SITE_URL}/#business`,
      name: cfg.site.name,
      legalName: cfg.site.legalName,
      description: cfg.site.description,
      url: `${tokens.SITE_URL}/`,
      areaServed: 'Worldwide',
      address: {
        '@type': 'PostalAddress',
        streetAddress: cfg.contact.addressStructured.street,
        addressLocality: cfg.contact.addressStructured.locality,
        addressCountry: cfg.contact.addressStructured.country,
      },
      ...(emailConfigured ? { email: cfg.contact.email } : {}),
      ...(isTodo(cfg.contact.phone) ? {} : { telephone: cfg.contact.phone }),
    },
    {
      '@type': 'WebSite',
      '@id': `${tokens.SITE_URL}/#website`,
      url: `${tokens.SITE_URL}/`,
      name: cfg.site.name,
      publisher: { '@id': `${tokens.SITE_URL}/#business` },
    },
  ];

  if (page.slug === 'faq.html' || page.slug === 'index.html') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: cfg.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  if (page.slug === 'pricing.html') {
    graph.push(...cfg.services.map((s) => ({
      '@type': 'Service',
      name: s.name,
      description: s.blurb,
      provider: { '@id': `${tokens.SITE_URL}/#business` },
      ...(typeof s.price === 'number' && s.price > 0
        ? { offers: { '@type': 'Offer', price: s.price.toFixed(2), priceCurrency: cfg.pricing.currency } }
        : {}),
    })));
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

/* ------------------------------------------------------------------ build */
const pagesDir = path.join(ROOT, 'src/pages');
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.html')).sort();
const built = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const sep = raw.indexOf('\n---\n');
  if (sep === -1) throw new Error(`${file}: missing "---" front-matter separator`);
  const meta = JSON.parse(raw.slice(0, sep));
  const body = raw.slice(sep + 5);

  const outPath = meta.out || file;
  const canonical = `${tokens.SITE_URL}/${outPath === 'index.html' ? '' : outPath}`;

  let html = layout
    .replace(/\{\{BODY\}\}/, body)
    .replace(/\{\{TITLE\}\}/g, esc(meta.title))
    .replace(/\{\{DESCRIPTION\}\}/g, esc(meta.description))
    .replace(/\{\{CANONICAL\}\}/g, canonical)
    .replace(/\{\{JSONLD\}\}/g, jsonLd({ ...meta, slug: outPath }))
    .replace(/\{\{NAV_ACTIVE\}\}/g, meta.nav || '');

  html = applyTokens(html);

  // depth-aware relative paths so every page works from a subdirectory
  const depth = outPath.split('/').length - 1;
  html = html.replace(/\{\{BASE\}\}/g, '../'.repeat(depth));

  // mark the active nav item
  if (meta.nav) {
    html = html.replace(new RegExp(`(<a[^>]*data-nav="${meta.nav}")`, 'g'), '$1 aria-current="page"');
  }

  const dest = path.join(ROOT, outPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  built.push({ out: outPath, canonical, priority: meta.priority || '0.7', noindex: !!meta.noindex });
}

/* ---------------------------------------------------------- sitemap/robots */
const indexable = built.filter((b) => !b.noindex);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  indexable.map((b) => `  <url><loc>${b.canonical}</loc><priority>${b.priority}</priority></url>`).join('\n') +
  `\n</urlset>\n`);

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${tokens.SITE_URL}/sitemap.xml\n`);

/* ------------------------------------------------------------------ report */
console.log(`Built ${built.length} page(s):`);
built.forEach((b) => console.log(`  • ${b.out}`));
console.log('  • sitemap.xml\n  • robots.txt');

if (warnings.length) {
  console.log('\n⚠  Not yet configured (site still builds and works):');
  warnings.forEach((w) => console.log(`   - ${w}`));
}
const missingPrices = cfg.services.filter((s) => typeof s.price !== 'number').map((s) => s.id);
if (missingPrices.length) {
  console.log(`   - ${missingPrices.length} service(s) have no price yet: ${missingPrices.join(', ')}`);
}

# Apostille Seychelles

Marketing and enquiry site for **Apostille Seychelles**, a service of **Victoria Law Firm**
(Victoria, Mahé, Republic of Seychelles).

Static HTML, CSS and JavaScript. No framework, no dependencies, no server required.

---

## Before it goes live

Everything you need to change lives in **one file: `site.config.json`**. Search it for `TODO`.
There are four things outstanding:

| What | Where in `site.config.json` | Notes |
|---|---|---|
| **Prices** | `services[].price` | Currently `null`, which renders as "Price on request". Replace each `null` with a number, e.g. `250`. |
| **WhatsApp number** | `contact.whatsapp` | International format, digits only, e.g. `2482512345`. Also set `contact.whatsappDisplay`. |
| **PayPal** | `paypal.payPalMeHandle` | The PayPal.Me handle for the Victoria Law Firm account. See "Payments" below. |
| **Email / phone / address** | `contact.*` | Used in the footer, the contact page and the structured data. |

Then rebuild:

```bash
node build.js
```

The build prints a warning list for anything still unconfigured. **Nothing breaks while these are
missing** — the site degrades on purpose:

- No price → the card shows "Price on request" and the button becomes "Request a quote".
- No PayPal → pay buttons become "Request an invoice".
- No WhatsApp number → every WhatsApp button links to the contact page instead.

So you can deploy at any point and fill the gaps in as they are confirmed.

---

## Payments

Payment is taken by **Victoria Law Firm**. Two modes, set by `paypal.mode`:

### `"paypalme"` (default, recommended)

Needs only the firm's PayPal.Me handle. Each priced service renders a button linking to a
pre-filled PayPal payment page for that exact amount and currency. Payers can use a PayPal
balance or any major card — no PayPal account required to pay by card.

```json
"paypal": { "mode": "paypalme", "payPalMeHandle": "VictoriaLawFirm" }
```

To find the handle: log in to PayPal → **PayPal.Me** → the handle is the last part of the link
(`paypal.me/VictoriaLawFirm` → `VictoriaLawFirm`).

### `"sdk"` (PayPal Smart Buttons)

Renders PayPal's own in-page buttons, so the payer never leaves the site. Needs a client ID from
a REST app at <https://developer.paypal.com/dashboard/applications/live>.

```json
"paypal": { "mode": "sdk", "clientId": "AY...live-client-id" }
```

Note: this mode captures the payment client-side. It is fine for fixed-price self-service
payments, but if you later need server-verified capture (webhooks, reconciliation against a
matter file), that requires a backend this site does not have. `paypalme` avoids the question
entirely by handing the whole transaction to PayPal.

---

## Structure

```
site.config.json    ← the only file you normally edit
build.js            ← generator (Node, zero dependencies)
src/layout.html     ← the shared page shell: header, footer, meta, WhatsApp button
src/pages/*.html    ← one file per page: JSON front matter, then "---", then the body
assets/css/         ← the Tulum design system
assets/js/main.js   ← nav, scroll reveals, enquiry form, PayPal buttons
assets/img/         ← favicon and the social share image
tools/og-image.*    ← regenerates the share card (dev only, needs playwright)
```

Everything in the repo root ending in `.html`, plus `sitemap.xml` and `robots.txt`, is
**generated**. Do not edit those by hand — edit `src/` and rebuild.

### Adding a page

Create `src/pages/whatever.html`:

```
{
  "out": "whatever.html",
  "nav": "services",
  "title": "Page title | Apostille Seychelles",
  "description": "Meta description, 150–160 characters."
}
---
<section class="section"><div class="wrap">…</div></section>
```

Then `node build.js`. It is picked up automatically, including in `sitemap.xml`.

Available tokens inside a page body: `{{BASE}}`, `{{SITE_NAME}}`, `{{LEGAL_NAME}}`, `{{EMAIL}}`,
`{{WA_LINK}}`, `{{WA_TARGET}}`, `{{WA_ICON}}`, `{{CURRENCY}}`, `{{PRICING_NOTE}}`, and the
generated blocks `{{SERVICE_CARDS}}`, `{{PRICING_CARDS}}`, `{{PRICING_TABLE}}`, `{{FAQ_LIST}}`,
`{{STEPS}}`, `{{TRUSTBAR}}`, `{{CONTACT_DETAILS}}`, `{{SERVICE_OPTIONS}}`.

---

## Preview locally

```bash
node build.js
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Upload the repository root to any static host — Netlify, Cloudflare Pages, GitHub Pages, or
plain shared hosting over FTP. There is no build step on the server; the HTML in the root *is*
the site. `netlify.toml` is included for Netlify but is ignored elsewhere.

---

## Design

Tulum palette, defined as CSS custom properties at the top of `assets/css/styles.css`:

| Role | Token | Value |
|---|---|---|
| Background | `--sand-50` / `--sand-100` | bleached sand |
| Primary / CTA | `--clay-500` | terracotta `#C4674A` |
| Accent | `--sea-500` | Caribbean turquoise `#17968F` |
| Depth / footer | `--jungle-800` | jungle green `#1E3227` |
| Highlight | `--gold-500` | low sun `#D9A441` |

Type is Fraunces (display) over Inter (body), loaded from Google Fonts with system fallbacks.
The recurring arch shape in the hero is the Tulum motif; change it in one place, `.arch`.

## Social share image

`assets/img/og-cover.png` (1200×630) is what appears when the site is pasted into WhatsApp,
Slack, LinkedIn or a message. Without it a shared link renders as a bare grey box — which
matters here, because WhatsApp is the main enquiry channel.

To change it, edit `tools/og-image.html` and re-render:

```bash
npm i playwright && npx playwright install chromium
node tools/og-image.mjs
```

The committed image was rendered in an environment without access to Google Fonts, so its
headline is set in the fallback serif rather than Fraunces. Re-running the command above on a
machine with normal internet access will regenerate it in the real brand typeface.

## Notes on behaviour

- The enquiry form has **no backend**. It composes the enquiry and opens WhatsApp with it
  pre-filled, falling back to the visitor's mail client. Nothing is stored on the site, which
  also means there is no database of client data to secure.
- Prices and contact details are baked into the HTML at build time, not fetched by JavaScript,
  so search engines see them.
- All content is visible without JavaScript; JS only adds the mobile menu, entrance animations
  and the form convenience.
- `/apostille-british-virgin-islands-company-documents/` is preserved at its existing URL
  because it is the page currently indexed by search engines. Do not rename it.

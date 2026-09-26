// Minimal Shopify-flavoured Liquid renderer for local previews.
// It is NOT a full Shopify implementation — just enough of the tags, filters
// and objects this theme uses to render pages that look like the real thing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Liquid } from 'liquidjs';
import * as mock from './mock.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const THEME = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(THEME, p), 'utf8');
const locale = JSON.parse(read('locales/en.default.json'));

class Color {
  constructor(hex) {
    this.hex = hex;
    const h = hex.replace('#', '');
    this.red = parseInt(h.slice(0, 2), 16);
    this.green = parseInt(h.slice(2, 4), 16);
    this.blue = parseInt(h.slice(4, 6), 16);
  }
  toString() { return this.hex; }
}

function namedArgs(args) {
  const out = {};
  for (const a of args) if (Array.isArray(a) && a.length === 2 && typeof a[0] === 'string') out[a[0]] = a[1];
  return out;
}

function srcOf(v) {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (v.preview_image) return v.preview_image.src;
  return v.src || '';
}

function formatMoney(cents) {
  const n = Number(cents || 0) / 100;
  return mock.moneyFormat.replace(/\{\{\s*\w+\s*\}\}/, n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
}

function getSchema(src) {
  const m = src.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  return m ? JSON.parse(m[1]) : {};
}

function defaults(settingsDefs = []) {
  const out = {};
  for (const s of settingsDefs) if (s.id && s.default !== undefined) out[s.id] = s.default;
  return out;
}

function colorize(obj, defs = []) {
  for (const d of defs) if (d.type === 'color' && typeof obj[d.id] === 'string' && /^#[0-9a-f]{6}$/i.test(obj[d.id])) obj[d.id] = new Color(obj[d.id]);
  return obj;
}

export function createEngine(state) {
  const engine = new Liquid({
    root: [path.join(THEME, 'snippets')],
    partials: [path.join(THEME, 'snippets')],
    layouts: [path.join(THEME, 'layout')],
    extname: '.liquid',
    strictFilters: false,
    strictVariables: false,
    dynamicPartials: true,
    cache: false,
    globals: globalsProxy(state),
  });

  // ---------- tags
  const swallow = (name) => ({
    parse(token, remain) {
      const end = 'end' + name;
      while (remain.length) {
        const t = remain.shift();
        if (t.name === end) return;
      }
    },
    render() { return ''; },
  });
  engine.registerTag('schema', swallow('schema'));
  engine.registerTag('javascript', swallow('javascript'));
  engine.registerTag('stylesheet', swallow('stylesheet'));

  const wrapper = (name, open, close, scope) => ({
    parse(token, remain) {
      this.args = token.args;
      this.tpls = [];
      const stream = this.liquid.parser.parseStream(remain)
        .on('tag:end' + name, () => stream.stop())
        .on('template', (t) => this.tpls.push(t))
        .on('end', () => { throw new Error(`tag ${name} not closed`); });
      stream.start();
    },
    * render(ctx, emitter) {
      const attrs = {};
      const parts = splitArgs(this.args);
      for (const p of parts.slice(1)) {
        const m = p.match(/^([\w-]+)\s*:\s*([\s\S]+)$/);
        if (m) attrs[m[1]] = yield this.liquid.evalValue(m[2], ctx);
      }
      const type = parts[0] ? parts[0].replace(/['"]/g, '') : '';
      emitter.write(open(type, attrs));
      if (scope) ctx.push(scope(type, attrs));
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, emitter);
      if (scope) ctx.pop();
      emitter.write(close);
    },
  });
  const formActions = { product: '/cart/add', contact: '/contact', localization: '/localization', customer_login: '/account/login', create_customer: '/account', storefront_password: '/password' };
  engine.registerTag('form', wrapper('form', (type, a) => {
    const extra = Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<form method="post" action="${formActions[type] || '/'}" accept-charset="UTF-8"${extra}>`;
  }, '</form>', () => ({ form: { errors: null } })));
  engine.registerTag('style', wrapper('style', () => '<style>', '</style>'));
  engine.registerTag('paginate', wrapper('paginate', () => '', '', () => ({ paginate: { pages: 1, parts: [] } })));

  engine.registerTag('layout', { parse() {}, render() { return ''; } });

  engine.registerTag('sections', {
    parse(token) { this.name = token.args.trim().replace(/['"]/g, ''); },
    * render() {
      return yield renderGroup(this.name);
    },
  });
  engine.registerTag('section', {
    parse(token) { this.name = token.args.trim().replace(/['"]/g, ''); },
    * render() {
      return yield renderSection(this.name, { type: this.name, settings: {} });
    },
  });

  // ---------- filters
  engine.registerFilter('money', (v) => formatMoney(v));
  engine.registerFilter('money_with_currency', (v) => formatMoney(v) + ' GBP');
  engine.registerFilter('money_without_currency', (v) => (Number(v || 0) / 100).toFixed(2));
  engine.registerFilter('money_without_trailing_zeros', (v) => formatMoney(v).replace(/\.00$/, ''));
  engine.registerFilter('asset_url', (v) => `/assets/${v}`);
  engine.registerFilter('shopify_asset_url', (v) => `/assets/${v}`);
  engine.registerFilter('stylesheet_tag', (v) => `<link href="${v}" rel="stylesheet" type="text/css" media="all">`);
  engine.registerFilter('script_tag', (v) => `<script src="${v}"></script>`);
  engine.registerFilter('image_url', (v) => srcOf(v));
  engine.registerFilter('img_url', (v) => srcOf(v));
  engine.registerFilter('image_tag', (src, ...args) => {
    const a = namedArgs(args);
    const attrs = Object.entries(a)
      .filter(([k]) => !['widths', 'preload'].includes(k))
      .map(([k, v]) => ` ${k}="${String(v ?? '').replace(/"/g, '&quot;')}"`).join('');
    return `<img src="${src}"${attrs.includes(' alt=') ? '' : ' alt=""'}${attrs}>`;
  });
  engine.registerFilter('media_tag', (m) => `<img src="${srcOf(m)}" alt="">`);
  engine.registerFilter('video_tag', () => '');
  engine.registerFilter('placeholder_svg_tag', (v, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525"><rect width="525" height="525" fill="#eee"/></svg>`);
  engine.registerFilter('payment_type_svg_tag', (type) => {
    const label = { american_express: 'AMEX', apple_pay: ' Pay', google_pay: 'G Pay', maestro: 'maestro', master: 'MC', paypal: 'PayPal', shopify_pay: 'shop', visa: 'VISA' }[type] || type;
    const bg = { american_express: '#006fcf', shopify_pay: '#5a31f4', visa: '#1434cb', master: '#222' }[type] || '#fff';
    const fg = bg === '#fff' ? '#000' : '#fff';
    return `<svg class="payment-icon" viewBox="0 0 38 24" role="img" aria-label="${type}"><rect width="38" height="24" rx="3" fill="${bg}"/><text x="19" y="15.5" font-size="8" font-weight="700" font-family="Arial" fill="${fg}" text-anchor="middle">${label}</text></svg>`;
  });
  engine.registerFilter('t', (key, ...args) => {
    let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), locale);
    if (typeof v !== 'string') return key;
    const a = namedArgs(args);
    return v.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (a[k] ?? ''));
  });
  engine.registerFilter('handle', (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  engine.registerFilter('handleize', (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  engine.registerFilter('link_to', (text, url) => `<a href="${url}">${text}</a>`);
  engine.registerFilter('default_errors', () => '');
  engine.registerFilter('format_address', () => '<p>—</p>');
  engine.registerFilter('format_code', (v) => v);
  engine.registerFilter('payment_button', () => '');
  engine.registerFilter('within', (v) => v);
  // Fonts: Shopify serves font_picker fonts from its CDN; the preview loads the same family from Google Fonts.
  engine.registerFilter('font_modify', (f, prop, val) => (f ? { ...f, [prop]: val } : f));
  engine.registerFilter('font_face', (f) => (f && !f.weight && !f.style
    ? `@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,900&display=swap');`
    : ''));

  // ---------- sections
  function baseContext() {
    return state.globals();
  }

  async function renderSection(type, data, id = type) {
    const src = read(`sections/${type}.liquid`);
    const schema = getSchema(src);
    const settings = colorize({ ...defaults(schema.settings), ...(data.settings || {}) }, schema.settings);
    if (state.sectionOverrides && state.sectionOverrides[type]) Object.assign(settings, state.sectionOverrides[type](settings));
    const order = data.block_order || Object.keys(data.blocks || {});
    const blocks = order.map((bid) => {
      const b = data.blocks[bid];
      const def = (schema.blocks || []).find((x) => x.type === b.type) || {};
      return { id: bid, type: b.type, settings: colorize({ ...defaults(def.settings), ...(b.settings || {}) }, def.settings), shopify_attributes: '' };
    });
    const section = { id, settings, blocks, block_order: order };
    const html = await engine.parseAndRender(src, { ...baseContext(), section });
    return `<div id="shopify-section-${id}" class="shopify-section ${schema.class || ''}">${html}</div>`;
  }

  async function renderJSONSections(json, prefix) {
    let out = '';
    for (const key of json.order) {
      const s = json.sections[key];
      if (s.disabled) continue;
      out += await renderSection(s.type, s, `${prefix}__${key}`);
    }
    return out;
  }

  async function renderGroup(name) {
    const json = JSON.parse(read(`sections/${name}.json`));
    return renderJSONSections(json, `sections--${name}`);
  }

  async function renderTemplate(name) {
    const json = JSON.parse(read(`templates/${name}.json`));
    const content = await renderJSONSections(json, `template--${name}`);
    const layout = read(`layout/${json.layout || 'theme'}.liquid`);
    return engine.parseAndRender(layout, { ...baseContext(), content_for_layout: content, template: { name: name.split('.')[0] } });
  }

  return { engine, renderSection, renderTemplate };
}

// Shopify exposes globals (settings, cart, shop...) inside {% render %} snippets too.
function globalsProxy(state) {
  const g = {};
  for (const key of Object.keys(state.globals())) {
    Object.defineProperty(g, key, { enumerable: true, get: () => state.globals()[key] });
  }
  return g;
}

function splitArgs(s) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === ',') { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function themeSettings() {
  const schema = JSON.parse(read('config/settings_schema.json'));
  const defs = schema.flatMap((g) => g.settings || []);
  const data = JSON.parse(read('config/settings_data.json')).current;
  const out = colorize({ ...defaults(defs), ...data }, defs);
  for (const d of defs) {
    if (d.type === 'font_picker' && typeof out[d.id] === 'string') {
      const family = out[d.id].split('_')[0].replace(/^\w/, (c) => c.toUpperCase());
      out[d.id] = { family, fallback_families: 'sans-serif' };
    }
  }
  return out;
}

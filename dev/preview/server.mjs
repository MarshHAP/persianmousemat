// Local preview server: renders the theme with mock data and fakes the AJAX cart API.
// Usage: npm run preview  (then open http://localhost:4000/products/persian-mouse-mat)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createEngine, themeSettings, THEME } from './render.mjs';
import * as mock from './mock.mjs';

const PORT = Number(process.env.PORT || 4000);
const cart = { items: [] };

function cartObject() {
  const items = cart.items.map((i) => {
    const p = mock.catalog[i.id];
    const v = p.selected_or_first_available_variant;
    return {
      key: `${i.id}:mock`,
      id: i.id,
      variant_id: i.id,
      product_id: p.id,
      quantity: i.quantity,
      title: p.title,
      url: p.url,
      image: p.featured_image ? p.featured_image.src : null,
      product: { title: p.title, has_only_default_variant: true },
      variant: { title: 'Default Title' },
      price: v.price,
      original_line_price: (v.compare_at_price || v.price) * i.quantity,
      final_line_price: v.price * i.quantity,
      line_level_discount_allocations: [],
    };
  });
  return {
    items,
    item_count: items.reduce((a, i) => a + i.quantity, 0),
    total_price: items.reduce((a, i) => a + i.final_line_price, 0),
    currency: { iso_code: 'GBP' },
    cart_level_discount_applications: [],
  };
}

const settings = themeSettings();
settings.upsell_product = mock.upsellProduct;

const state = {
  globals: () => ({
    shop: mock.shop,
    routes: mock.routes,
    settings,
    linklists: mock.linklists,
    localization: mock.localization,
    cart: cartObject(),
    product: mock.product,
    collection: { title: 'All products', products: [mock.product, mock.coasterProduct] },
    collections: [{ title: 'All products', url: '/collections/all', featured_image: mock.product.featured_image }],
    request: { locale: { iso_code: 'en' }, page_type: 'product', design_mode: false, origin: 'http://localhost' },
    page_title: 'The Persian Mouse Mat',
    canonical_url: 'http://localhost/',
    content_for_header: '',
    customer: null,
    current_page: 1,
    page: { title: 'Contact', content: '' },
    search: { performed: false, terms: '' },
  }),
  sectionOverrides: {
    'bundle-deals': (s) => (s.product_2 ? {} : { product_2: mock.coasterProduct }),
  },
};
const { renderSection, renderTemplate } = createEngine(state);

const types = { '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function body(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

function send(res, code, content, type = 'text/html; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(content);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/assets/')) {
      const file = path.join(THEME, 'assets', path.basename(url.pathname));
      if (!fs.existsSync(file)) return send(res, 404, 'not found', 'text/plain');
      return send(res, 200, fs.readFileSync(file), types[path.extname(file)] || 'application/octet-stream');
    }
    if (url.searchParams.get('sections')) {
      const out = {};
      for (const name of url.searchParams.get('sections').split(',')) out[name] = await renderSection(name, { settings: {} }, name);
      return send(res, 200, JSON.stringify(out), 'application/json');
    }
    if (url.pathname === '/cart.js') return send(res, 200, JSON.stringify(cartObject()), 'application/json');
    if (url.pathname === '/cart/add.js' && req.method === 'POST') {
      const b = await body(req);
      const items = b.items || [{ id: b.id, quantity: b.quantity || 1 }];
      for (const it of items) {
        if (!mock.catalog[it.id]) return send(res, 422, JSON.stringify({ status: 422, description: 'Variant not found' }), 'application/json');
        const ex = cart.items.find((x) => x.id === it.id);
        if (ex) ex.quantity += Number(it.quantity || 1);
        else cart.items.push({ id: it.id, quantity: Number(it.quantity || 1) });
      }
      return send(res, 200, JSON.stringify({ items }), 'application/json');
    }
    if (url.pathname === '/cart/change.js' && req.method === 'POST') {
      const b = await body(req);
      const id = Number(String(b.id).split(':')[0]);
      const ex = cart.items.find((x) => x.id === id);
      if (ex) ex.quantity = Number(b.quantity);
      cart.items = cart.items.filter((x) => x.quantity > 0);
      return send(res, 200, JSON.stringify(cartObject()), 'application/json');
    }
    if (url.pathname === '/cart/clear') { cart.items = []; return send(res, 200, 'ok', 'text/plain'); }

    let template = '404';
    if (url.pathname === '/') template = 'index';
    else if (url.pathname.startsWith('/products/')) template = 'product';
    else if (url.pathname === '/cart') template = 'cart';
    else if (url.pathname.startsWith('/collections')) template = url.pathname === '/collections' ? 'list-collections' : 'collection';
    else if (url.pathname === '/pages/contact') template = 'page.contact';
    else if (url.pathname.startsWith('/pages/')) template = 'page';
    else if (url.pathname === '/search') template = 'search';
    const html = await renderTemplate(template);
    return send(res, template === '404' ? 404 : 200, html);
  } catch (e) {
    console.error(e);
    return send(res, 500, `<pre>${String(e.stack || e).replace(/</g, '&lt;')}</pre>`);
  }
});

server.listen(PORT, () => console.log(`Preview running: http://localhost:${PORT}/products/persian-mouse-mat`));

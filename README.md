# The Persian Office — Shopify theme

A custom Shopify Online Store 2.0 theme for The Persian Office brand. It is a
single-product "funnel" store whose layout mirrors the reference store
(memorymat.shop) section for section, re-skinned for The Persian Office.
The store's product is The Persian Mouse Mat. Every piece of text, colour and image can be edited in the Shopify theme editor.

**Colour.** The only accent is the dark red `#8b2718`, taken from
orientalis.co, plus a deeper shade `#5e1a0f` for the announcement bars and
button hovers. Everything else is black, white or grey. Both are set under
**Theme settings → Colors**. The section colour pickers are left empty so they
follow these two settings; changing the accent there updates the whole store.

## Page layout

**Product page** (`templates/product.json`), top to bottom:

| # | Section | File |
|---|---------|------|
| 1 | Black countdown bar ("… SALE ENDS IN 00 12 18 50") | `sections/countdown-bar.liquid` |
| 2 | Deep-red rotating announcement bar (megaphone icon) | `sections/announcement-bar.liquid` |
| 3 | Header: menu on the left (current page shown as a red pill), logo in the centre, account and cart on the right. Hamburger menu on mobile | `sections/header.liquid` |
| 4 | Product hero: sticky gallery with thumbnails; buy box with orders pill, rating, title, price and SAVE badge, benefits, low-stock dot, Buy 1/2/3 quantity breaks, priority-processing toggle, add to cart, secure-checkout line, delivery timeline and mini review; sticky add-to-cart bar | `sections/main-product.liquid` |
| 5 | Red ribbon wave | `sections/wave-divider.liquid` |
| 6 | "Complete Your Setup" bundle | `sections/bundle-deals.liquid` |
| 7 | Three testimonial cards (a slider on mobile) | `sections/testimonials.liquid` |
| 8 | Dark band: two features, a portrait image or video, two more features | `sections/feature-columns.liquid` |
| 9 | Guarantee text and money-back seal | `sections/guarantee.liquid` |
| 10 | Black FAQ accordion | `sections/faq.liquid` |
| 11 | Customer reviews with photo strip and pagination | `sections/product-reviews.liquid` |
| 12 | Black footer: link menu, logo, mission text, country selector, payment icons | `sections/footer.liquid` |

The homepage (`templates/index.json`) has a hero image with a dark "claim offer"
box, followed by a red offer bar. The cart drawer includes a "cart reserved"
timer and the priority-processing upsell toggle. The theme also includes
collection, cart, search, page, contact, blog, article, 404, password,
gift-card and customer-account templates.

## Install

**Option A: upload a zip.** In Shopify admin go to **Online Store → Themes →
Add theme → Upload zip file**. Zip the theme folders (`assets`, `config`,
`layout`, `locales`, `sections`, `snippets`, `templates`) at the root of the zip:

```bash
zip -r the-persian-office-theme.zip assets config layout locales sections snippets templates
```

**Option B: Shopify CLI.**

```bash
shopify theme push --unpublished --store your-store.myshopify.com
# or live-preview while editing:
shopify theme dev --store your-store.myshopify.com
```

`.shopifyignore` keeps `dev/` and this README out of the upload.

## Store setup checklist

1. **Product.** "The Persian Mouse Mat" (£19.99, or 2 for £29.99) already
   exists as a draft in the store — see *Product & pricing* below. If you
   recreate it, give it a price and, optionally, a genuine compare-at
   price. The SAVE % badge and the quantity-break prices are calculated
   from these.
2. **Menus** (Online Store → Navigation):
   - `main-menu`: The Persian Mouse Mat (links to the product), Track Your Order, Contact.
   - `footer`: About Us, Shipping & Delivery, Returns & Refunds, Privacy Policy, Terms of Service, Contact.
3. **Quantity-break pricing.** The Buy 2 option shows a fixed £29.99 (set in
   the *Quantity breaks* block). Checkout charges it through the automatic
   discount described under *Product & pricing* below. If you change the
   price, update both.
4. **Priority processing.** Create a cheap product, for example "Priority
   Processing" at £2.99 with a £4.27 compare-at price. Then pick it under
   **Theme settings → Cart → Priority processing product**.
5. **Bundle.** Create the second bundle product (the placeholder is "Persian
   Coaster Set™") and pick it in the *Bundle deal* section.
6. **Store name.** Set it to "The Persian Office" under **Settings → General**.
   The browser tab title, the footer copyright and the logo's accessible label
   all use it.
7. **Logo.** Upload it under **Theme settings → Logo**. Until then, a text
   wordmark is shown.

## Product & pricing

Created in the **The Persian Mat** Shopify store (admin → Products):

- **The Persian Mouse Mat** (`/products/the-persian-mouse-mat`), **draft**:
  one variant at **£19.99** with no compare-at price, 19 photos with alt text,
  vendor *The Persian Office*. Publish it when you're ready (set status to
  Active and make it available on the Online Store channel).
- **Automatic discount "2 for £29.99 – The Persian Mouse Mat"**: £9.99 off
  when the cart has 2 or more of the mat, once per order (2 × £19.99 = £39.98
  → £29.99). With 3 or more it still takes £9.99 off once. It combines with
  shipping discounts only.

Not created yet: inventory (tracking is off), shipping weight, SKU, the
Priority Processing upsell product and the bundle's second product. The theme
hides the upsell and the bundle until those products are set.

## Images to supply

**Product gallery: done.** The 10 PDP images live in `source-images/pdp/`
(originals) and `assets/pdp-NN.jpg` (web-optimised, plus `-750` and `-thumb`
sizes). The product page shows them until the Shopify product has media of its
own. After that, upload the same photos to the product in admin, since
product media gets Shopify's image CDN and variant switching. The list and alt
text are in the *Product information* section → **Theme gallery images**.

Every other image slot still shows a generated Persian-rug placeholder
(`assets/pm-placeholder-rug*.svg`).

| Where | Setting | Suggested size |
|-------|---------|----------------|
| Product gallery | Product media in admin (first image is the hero) | 1500×1000+, product on white |
| Orders pill avatars (×3) | Product page → *Orders social proof* block | 100×100 |
| Mini review avatar | Product page → *Mini review* block | 120×120 |
| Bundle images | Featured image of each bundle product | 500×300 |
| Testimonial cards (×3) + avatars | *Testimonials* section → each block | 800×750 lifestyle / 80×80 |
| Dark features band | *Features with media* → image or video | portrait, 800×1160 (9:13) |
| Guarantee seal (optional) | *Guarantee* → badge image | 400×400 transparent PNG |
| Review photos | *Customer reviews* → each review's photo | 240×240 |
| Homepage hero | *Image banner* → desktop and mobile images | 2400×1200 / 1000×1100 |
| Priority seal (optional) | Theme settings → Cart → upsell badge | 120×120 |

## Content that must be genuine before launch

Some layout elements are claims about your business. UK consumer law (the
DMCC Act 2024, in force since April 2025) makes fake reviews and misleading
social proof unlawful, so make sure each of these is true or remove it:

- **Placeholder text.** The testimonials, the mini review and the customer
  reviews ship with text marked "Customer Name / Replace this…". Replace them
  with real customer reviews, or install a reviews app (Judge.me, Loox, etc.)
  and add its app block to the *Customer reviews* section.
- **Orders pill and rating line.** "99+ orders in the last 24h" and "Rated
  4.8/5 By 1250+ Customers" are editable blocks. Set real numbers, or delete
  the blocks.
- **Scarcity messages.** The "Low Stock" label, the countdown bar (which by
  default resets at midnight) and the cart-reserved timer should reflect a
  real offer. The countdown can be switched to a fixed end date.

## Local preview (no Shopify store needed)

`dev/` contains a small Node renderer that runs the theme's Liquid with mock
product data. It also fakes the AJAX cart, so add-to-cart, the drawer, the
upsell and the bundle all work locally.

```bash
cd dev
npm install
npm run preview   # http://localhost:4000/products/persian-mouse-mat
npm run shots     # full-page desktop + mobile screenshots into dev/screenshots/
```

To preview your own photos before uploading them, change the image paths in
`dev/preview/mock.mjs`. The renderer is only a development aid: Shopify's
real Liquid engine is the source of truth, so use `shopify theme dev` for
final checks.

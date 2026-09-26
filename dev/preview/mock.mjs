// Mock Shopify data used by the local preview renderer.
// Swap image paths here for your real photos to preview them before uploading.

export const moneyFormat = '£{{amount}}';

const rug = (n, alt = 'Persian Mouse Mat') => ({
  src: n % 2 ? '/assets/pm-placeholder-rug.svg' : '/assets/pm-placeholder-rug-2.svg',
  width: 900,
  height: 400,
  alt,
  aspect_ratio: 2.25,
});

const media = [1, 2, 3, 4, 5, 6].map((n) => ({
  id: 1000 + n,
  media_type: 'image',
  alt: 'Persian Mouse Mat',
  preview_image: rug(n),
  src: rug(n).src,
}));

const variant = {
  id: 44001,
  title: 'Default Title',
  price: 2999,
  compare_at_price: 4285,
  available: true,
  options: ['Default Title'],
  featured_media: null,
};

export const product = {
  id: 9001,
  title: 'Persian Mouse Mat™',
  handle: 'persian-mouse-mat',
  url: '/products/persian-mouse-mat',
  price: 2999,
  media,
  featured_media: media[0],
  featured_image: media[0].preview_image,
  variants: [variant],
  selected_or_first_available_variant: variant,
  has_only_default_variant: true,
  options_with_values: [{ name: 'Title', values: ['Default Title'], selected_value: 'Default Title' }],
};

export const upsellProduct = {
  id: 9002,
  title: 'Priority Processing',
  url: '/products/priority-processing',
  featured_image: null,
  selected_or_first_available_variant: { id: 44002, price: 299, compare_at_price: 427, available: true },
};

export const coasterProduct = {
  id: 9003,
  title: 'Persian Coaster Set™',
  url: '/products/persian-coaster-set',
  featured_image: rug(2, 'Persian Coaster Set'),
  selected_or_first_available_variant: { id: 44003, price: 1999, compare_at_price: 2856, available: true },
};

export const catalog = { 44001: product, 44002: upsellProduct, 44003: coasterProduct };

export const linklists = {
  'main-menu': {
    links: [
      { title: 'Persian Mouse Mat™', url: '/products/persian-mouse-mat', current: true },
      { title: 'Track Your Order', url: '/pages/track-your-order' },
      { title: 'Contact', url: '/pages/contact' },
    ],
  },
  footer: {
    links: [
      { title: 'About Us', url: '/pages/about-us' },
      { title: 'Shipping & Delivery', url: '/policies/shipping-policy' },
      { title: 'Returns & Refunds', url: '/policies/refund-policy' },
      { title: 'Privacy Policy', url: '/policies/privacy-policy' },
      { title: 'Terms of Service', url: '/policies/terms-of-service' },
      { title: 'Contact', url: '/pages/contact' },
    ],
  },
};

export const shop = {
  name: 'Persian Mouse Mat',
  url: 'http://localhost',
  money_format: moneyFormat,
  customer_accounts_enabled: true,
  enabled_payment_types: ['american_express', 'apple_pay', 'google_pay', 'maestro', 'master', 'paypal', 'shopify_pay', 'visa'],
};

export const routes = {
  root_url: '/',
  cart_url: '/cart',
  cart_add_url: '/cart/add',
  cart_change_url: '/cart/change',
  cart_update_url: '/cart/update',
  account_url: '/account',
  account_login_url: '/account/login',
  account_register_url: '/account/register',
  account_logout_url: '/account/logout',
  account_addresses_url: '/account/addresses',
  all_products_collection_url: '/collections/all',
  search_url: '/search',
};

export const localization = {
  country: { iso_code: 'GB', name: 'United Kingdom', currency: { iso_code: 'GBP', symbol: '£' } },
  available_countries: [
    { iso_code: 'GB', name: 'United Kingdom', currency: { iso_code: 'GBP', symbol: '£' } },
    { iso_code: 'US', name: 'United States', currency: { iso_code: 'USD', symbol: '$' } },
  ],
};

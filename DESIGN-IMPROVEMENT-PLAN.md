# ShopVue - Design & UX Improvement Plan

## Current State

The site has a solid technical foundation (AJAX cart, search autocomplete, wishlist, toasts, image zoom) but the visual design reads as a Bootstrap template rather than a premium e-commerce brand.

**Key Issues:**
- System fonts (`Segoe UI`) — no custom web font
- Static text-only hero section with no product imagery
- Dated checkout layout with no step indicator
- Missing conversion patterns (coupons, delivery estimates, urgency signals)
- No micro-interactions (skeleton loaders, entrance animations, scroll effects)

**Target:** AliExpress / Temu / SHEIN-level modern marketplace feel.

---

## Phase 1: Quick Wins (High Impact, Low Effort)

| # | Change | Files |
|---|--------|-------|
| 1 | **Add custom web font** — Import Inter or Plus Jakarta Sans via Google Fonts. Replace `font-family: 'Segoe UI'` stack. | `style.css`, `header.ejs` |
| 2 | **Add top announcement bar** — Thin colored strip above navbar with rotating promo messages ("Free Shipping on Orders $50+"). Builds trust immediately. | `header.ejs`, `style.css` |
| 3 | **Add "Forgot Password?" link** to login page. | `login.ejs` |
| 4 | **Add password visibility toggle** (eye icon) on login + register forms. | `login.ejs`, `register.ejs`, `style.css` |
| 5 | **Add coupon/promo code input** to cart summary and checkout. | `cart.ejs`, `checkout.ejs`, `style.css` |
| 6 | **Improve breadcrumbs** — Replace text `/` separators with chevron (`>`) icons. | `style.css` |

---

## Phase 2: Homepage & Product Listing

| # | Change | Files |
|---|--------|-------|
| 7 | **Upgrade hero section** — Replace static text-only gradient with a product image carousel/slider. Show 3-4 featured products with overlay text and CTA. | `index.ejs`, `style.css`, new `public/js/hero.js` |
| 8 | **Add "Lightning Deals" section** — Countdown timer, progress bar showing stock, flash sale badge. | `index.ejs`, `style.css`, new `routes/api.js` endpoint |
| 9 | **Add "Recently Viewed" section** — Track viewed products in localStorage, show on homepage. | `index.ejs`, new `public/js/recently-viewed.js` |
| 10 | **Add price range filter** to product listing sidebar (min/max inputs or slider). | `products.ejs`, `routes/products.js`, `style.css` |
| 11 | **Add grid/list view toggle** on product listing. | `products.ejs`, `style.css`, new `public/js/view-toggle.js` |
| 12 | **Add "Load More" button** as alternative to pagination. | `products.ejs`, `routes/products.js` (JSON endpoint), new `public/js/load-more.js` |
| 13 | **Replace emoji category icons** with proper SVG icons or product photography thumbnails. | `init.sql`, `index.ejs`, `style.css` |

---

## Phase 3: Product Page Upgrade

| # | Change | Files |
|---|--------|-------|
| 14 | **Add tabbed product details** — Description / Specifications / Reviews tabs instead of plain text block. | `product.ejs`, `style.css` |
| 15 | **Add reviews section** — User reviews with star ratings, text, date, helpful votes. Include "Write a Review" form. | `product.ejs`, new `routes/reviews.js`, new `views/partials/reviews.ejs` |
| 16 | **Add delivery estimate** — "Estimated delivery: Dec 15-22" or "Free delivery in 3-5 days." | `product.ejs`, `style.css` |
| 17 | **Add urgency indicators** — "Only X left in stock" badge, "Y people viewing this" counter. | `product.ejs`, `style.css` |
| 18 | **Add "Frequently Bought Together"** — Cross-sell section with bundle discount. | `product.ejs`, `routes/products.js`, `style.css` |
| 19 | **Add social sharing buttons** — WhatsApp, Facebook, Twitter, Pinterest share links. | `product.ejs`, `style.css` |
| 20 | **Add sticky Add-to-Cart bar** — On scroll, pin price + Add to Cart button at top of viewport. | `product.ejs`, new `public/js/sticky-cart.js`, `style.css` |

---

## Phase 4: Checkout & Cart

| # | Change | Files |
|---|--------|-------|
| 21 | **Add multi-step checkout** — Visual stepper (Shipping > Payment > Confirm) with progress indicator. | `checkout.ejs`, `style.css`, new `public/js/checkout-steps.js` |
| 22 | **Add free shipping progress bar** in cart — "Add $X more for FREE shipping!" with animated bar. | `cart.ejs`, `style.css` |
| 23 | **Add "Save for Later"** option in cart — Move items to wishlist or save-for-later list. | `cart.ejs`, new `routes/api.js` endpoint, `style.css` |
| 24 | **Add estimated delivery date** to cart summary and checkout. | `cart.ejs`, `checkout.ejs`, `style.css` |
| 25 | **Add trust badges** near Place Order button — "Secure Checkout", "Money-Back Guarantee", "24/7 Support" icons. | `checkout.ejs`, `style.css` |
| 26 | **Add inline form validation** — Real-time field validation with green checkmarks / red error messages. | `checkout.ejs`, `login.ejs`, `register.ejs`, new `public/js/form-validation.js` |
| 27 | **Add country dropdown** instead of text input for shipping country. | `checkout.ejs` |

---

## Phase 5: Micro-Interactions & Polish

| # | Change | Files |
|---|--------|-------|
| 28 | **Add skeleton loading states** — Gray pulse placeholders while content loads. | `style.css`, `public/js/app.js` |
| 29 | **Add entrance animations** — Fade-in + slide-up on scroll for product cards and sections. | `public/js/app.js`, `style.css` |
| 30 | **Add page transition effects** — Smooth fade between page navigations. | `public/js/app.js`, `style.css` |
| 31 | **Add product card hover enhancements** — Quick-view button, "Add to Cart" appears on hover. | `products.ejs`, `style.css` |
| 32 | **Improve mobile navigation** — Slide-in drawer instead of dropdown, bottom tab bar on mobile. | `header.ejs`, `style.css`, `public/js/app.js` |
| 33 | **Add back-to-top button** — Floating button appears on scroll. | `views/partials/footer.ejs`, `style.css`, `public/js/app.js` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `public/css/style.css` | Font import, announcement bar, skeleton states, animations, all new components |
| `public/js/app.js` | Skeleton loading, scroll animations, back-to-top, localStorage recently viewed |
| `views/partials/header.ejs` | Announcement bar, improved nav |
| `views/partials/footer.ejs` | Script tags for new JS modules |
| `views/index.ejs` | Hero carousel, lightning deals, recently viewed |
| `views/product.ejs` | Tabs, reviews, urgency, cross-sell, sticky bar, delivery estimate |
| `views/products.ejs` | Price filter, grid/list toggle, load more, hover enhancements |
| `views/cart.ejs` | Shipping progress, save for later, coupon, delivery estimate |
| `views/checkout.ejs` | Multi-step, validation, trust badges, country dropdown |
| `views/login.ejs` | Forgot password, password toggle |
| `views/register.ejs` | Password toggle, strength indicator |
| `routes/products.js` | JSON endpoint for load more, price filter params |
| `routes/api.js` | Save-for-later, flash deals, reviews endpoints |
| `init.sql` | Update category icons from emojis to SVG/image references |

---

## New Files to Create

| File | Purpose |
|------|---------|
| `public/js/hero.js` | Homepage hero carousel/slider |
| `public/js/recently-viewed.js` | Track + display recently viewed products |
| `public/js/view-toggle.js` | Grid/list view toggle on product listing |
| `public/js/load-more.js` | Infinite scroll / load more for products |
| `public/js/sticky-cart.js` | Sticky Add-to-Cart bar on product page |
| `public/js/checkout-steps.js` | Multi-step checkout logic |
| `public/js/form-validation.js` | Real-time form validation |
| `routes/reviews.js` | Product reviews CRUD |
| `views/partials/reviews.ejs` | Reviews component |

---

## Implementation Order

```
Phase 1 (Quick Wins)     → Deploy immediately
Phase 2 (Homepage/List)  → Deploy next
Phase 3 (Product Page)   → Deploy after Phase 2
Phase 4 (Checkout/Cart)  → Deploy after Phase 3
Phase 5 (Polish)         → Final pass
```

Each phase is independently deployable and immediately improves the user experience.

---

## Priority Summary

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Custom web font | Low | Transforms entire feel from template to brand |
| 2 | Top announcement bar | Low | Immediate trust + conversion signal |
| 3 | Coupon/promo code input | Low | Expected by 100% of shoppers |
| 4 | Forgot Password link | Trivial | Critical UX gap |
| 5 | Password visibility toggle | Trivial | Standard modern pattern |
| 6 | Price range filter | Medium | Major filtering improvement |
| 7 | Delivery estimation | Medium | Top conversion factor |
| 8 | Hero carousel | Medium | Homepage first impression |
| 9 | Multi-step checkout | Medium | Reduces checkout abandonment |
| 10 | Real-time form validation | Medium | Reduces errors, builds trust |
| 11 | Skeleton loading states | Medium | Feels modern and responsive |
| 12 | Product reviews section | High | Social proof, SEO, trust |
| 13 | Frequently Bought Together | High | Revenue optimization |
| 14 | Flash sale / countdown deals | High | Engagement + urgency |
| 15 | Multi-image product gallery | High | Product page completeness |

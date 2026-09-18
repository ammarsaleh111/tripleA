# TripleA — Fitness & Supplements E-Commerce Platform

TripleA (Triple A GYM) is a full-stack e-commerce platform for selling fitness supplements, built as a **monorepo** with two independently deployable apps:

- **`frontend/`** — React 18 + Vite storefront & admin dashboard (SPA)
- **`backend/`** — Express REST API backed by PostgreSQL (Neon), deployed as Vercel serverless functions

> **Live deployments:** Storefront `https://triple-a-eg.vercel.app` · API `https://triplea-api.vercel.app`
>
> **Purpose of this document:** everything an AI agent (or a new developer) needs to understand, run, modify, and deploy this project — every page, every route, every endpoint, every table, every feature.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6 (`BrowserRouter`), Vite 5 |
| Styling | Tailwind CSS with CSS-variable design tokens (`--theme-*`) |
| HTTP client | Axios (single shared instance in `services/api/client.js`) |
| Global state | React Context (`AppContext`) — no Redux/Zustand |
| Backend | Node.js, Express 4, ESM (`"type": "module"`) |
| Database | PostgreSQL (Neon in production), raw SQL via `pg` `Pool` — **no ORM** |
| Auth | JWT Bearer tokens + `bcryptjs` password hashing |
| Uploads | Multipart image upload to `backend/uploads/` (served statically at `/uploads`) |
| Deployment | Vercel (two projects: `frontend/` and `backend/`) |

### Core design rules
- **snake_case** in the database/SQL, **camelCase** in JavaScript (models/services map between them).
- ESM everywhere; all relative backend imports use explicit `.js` extensions.
- Backend uses **named exports**; controllers are annotated with `@desc` / `@route` / `@access` JSDoc.
- Errors are thrown as `Error` objects with a `statusCode` property and handled by the central `errorHandler` middleware. Validators/middleware respond directly with `{ success, message }` JSON.
- The DB layer (`config/db.js`) exposes a MySQL-flavored API (`query` returning `[rows, {affectedRows, insertId}]`, `beginTransaction/commit/rollback`, `getConnection`) on top of `pg`, auto-converting `?` placeholders to `$1, $2, …`.

## 2. Repository Structure

```
TripleA/
├── frontend/                      # React SPA (its own Vercel project)
│   ├── vercel.json                # SPA rewrites (see §9 Deployment)
│   ├── .env.example
│   ├── vite.config.js             # path alias  @  ->  ./src
│   ├── tailwind.config.js         # theme tokens, #FFCC00 accent
│   └── src/
│       ├── router/AppRouter.jsx   # all client routes
│       ├── pages/                 # one file per route (see §7)
│       ├── components/
│       │   ├── layout/            # MainLayout (header, nav, search overlay, footer)
│       │   ├── common/            # AppIntroLoader, ThemeControls, ContactForm,
│       │   │                      # BundleVariantModal, ChamferCard, PagePlaceholder
│       │   ├── shop/              # ProductCard, CartSidebar, SidebarFilter
│       │   └── admin/             # AdminSidebar, AdminTopbar, AdminStatCard,
│       │       └── sections/      # OrdersTable, RevenueChartPanel, TopSellingPanel
│       │                          # + one section component per admin tab
│       ├── context/AppContext.jsx # ALL global state (auth, cart, orders, theme)
│       ├── hooks/useApiStatus.js
│       └── services/api/          # axios modules per domain: client.js, auth.js,
│                                  # products.js, cart.js, orders.js, offers.js,
│                                  # admin.js, contact.js, health.js
│
├── backend/                       # Express API (its own Vercel project)
│   ├── vercel.json                # serverless build config
│   ├── api/index.js               # Vercel serverless entry point
│   ├── .env.example
│   ├── sql/
│   │   ├── schema.sql             # full DB schema (CREATE TABLE IF NOT EXISTS …)
│   │   └── migrations/            # 001…009 incremental migrations
│   ├── uploads/                   # product images uploaded via admin (gitignored)
│   ├── scripts/                   # CLI utilities (see §10)
│   └── src/
│       ├── server.js              # nodemon target; connects DB then listens on PORT
│       ├── app.js                 # Express app: CORS allow-list, JSON, /api mount
│       ├── config/db.js           # pg Pool wrapper (see §1)
│       ├── routes/                # index.js + auth/product/cart/order/contact/
│       │                          # offer/admin/health route modules
│       ├── controllers/           # authController, productController, cartController,
│       │                          # orderController, offerController, contactController,
│       │                          # healthController, adminController,
│       │                          # adminProductController, adminOrderController,
│       │                          # adminCustomerController, adminMessageController
│       ├── services/              # orderService.js (transactional checkout)
│       ├── models/                # orderModel.js (raw SQL)
│       ├── middleware/            # authMiddleware.js, errorHandler.js, notFoundHandler.js
│       ├── validators/            # orderValidator.js, offerValidator.js
│       └── utils/                 # whatsapp.js (order confirmation message builder)
│
├── vercel.json                    # OPTIONAL single-project monorepo deploy config
├── AGENTS.md                      # short agent conventions file
└── README.md                      # this file
```

> The root `package-lock.json` is a stub. Real lockfiles live in `frontend/` and `backend/`.

---

## 3. Getting Started (Local Development)

### Prerequisites
- Node.js ≥ 18, npm
- A PostgreSQL database (local, or a free [Neon](https://neon.tech) database)

### Steps

```bash
# 1) Backend
cd backend
cp .env.example .env            # then fill in real values (see §4)
npm install
npm run db:init                 # applies sql/schema.sql (idempotent CREATE IF NOT EXISTS)
npm run seed:catalog            # loads the supplements product catalog
npm run dev                     # nodemon -> http://localhost:5000 (API prefix: /api)

# 2) Frontend (new terminal)
cd frontend
cp .env.example .env            # VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev                     # Vite dev server -> http://localhost:5173 (strict port)
```

### Create the admin account
```bash
cd backend
npm run create-admin            # scripts/create-admin.js — prompts for email/password
```
There is **no self-service admin registration**; admins are created only via this script or by flipping an existing user's `role` to `admin` in SQL.

### Database reset / cleanup utilities
```bash
npm run db:reset                # wipe + re-init
npm run seed:catalog            # seed product catalog only
npm run db:seed:demo            # seed demo customers/orders (for dashboard testing)
node scripts/clean-demo-data.js # delete ALL sales data (orders, carts, non-admin users)
                                # while KEEPING products/categories and the admin account
node scripts/wipe-db.js         # full wipe (see §10 for the complete scripts list)
```

## 4. Environment Variables

### Backend — `backend/.env` (see `backend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon). Placeholder values (`your_postgres_connection_string_here`, etc.) are detected and rejected at startup. SSL is auto-enabled for non-localhost hosts unless `sslmode=disable`. |
| `JWT_SECRET` | ✅ | Secret used to sign/verify auth tokens. Missing secret → 500 on any auth attempt. |
| `PORT` | — | API port, default `5000` (local only; Vercel ignores it). |
| `NODE_ENV` | — | `production` hides server error details, DB logs, and dev CORS origins. |
| `FRONTEND_URL` | (prod) | Exact origin of the deployed frontend, e.g. `https://triple-a-eg.vercel.app`. Added to the CORS allow-list. |
| `CORS_ORIGINS` | — | Comma-separated extra allowed origins (e.g. preview deployments). |
| `WHATSAPP_NUMBER` | — | Digits-only WhatsApp number for order-confirmation links. If unset, `wa.me` links have no recipient pre-filled. |

CORS behavior (`src/app.js`): in development, `localhost:5173/5174` (and `127.0.0.1` variants) are allowed. In production **only** `FRONTEND_URL` + `CORS_ORIGINS` are allowed — localhost is never exposed. Requests without an `Origin` header (Postman/curl) are always allowed. Credentials are enabled.

### Frontend — `frontend/.env` (see `frontend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ (prod) | Base URL for all API calls, e.g. `https://triplea-api.vercel.app/api`. Falls back to `http://localhost:5000/api` in dev only; in a production build, a missing value logs a warning and breaks the API client. |

---

## 5. Database Schema (`backend/sql/schema.sql`)

All tables use `INT GENERATED ALWAYS AS IDENTITY` PKs and `TIMESTAMPTZ` timestamps. snake_case columns, camelCase in JS.

| Table | Purpose / key columns |
|---|---|
| `users` | Accounts. `email` (unique), `password_hash` (bcrypt), `first_name`, `last_name`, `role` — `customer` \| `admin` (CHECK constraint). |
| `user_profiles` | 1:1 with users. `phone_number`, `reward_points` (int), `tier_status` — `Member` \| `Silver` \| `Gold` \| `Elite`. Cascade-deleted with user. |
| `addresses` | User shipping addresses. `address_line_1/2`, `city`, `state`, `postal_code`, `country`, `is_default`. Used at checkout for the default address id. |
| `categories` | Product categories. `name`, `slug` (unique), `description`, self-referencing `parent_id`. |
| `products` | Catalog. `category_id`, `name`, `slug` (unique, used in URLs), `base_price DECIMAL(10,2)`, `has_flavor`, `has_weight`, `is_featured`, `materials_care`. |
| `product_variants` | Purchasable SKU-level variants. `sku` (unique), `size`, `color`, `color_hex`, `flavor`, `weight_value` + `weight_unit` (`g`/`kg`), `price_modifier` (added to base price), `stock_quantity`. Cascade-deleted with product. |
| `product_images` | Product/variant gallery. `image_url`, `variant_id` (nullable → product-level), `is_primary`, `display_order`. |
| `carts` / `cart_items` | Server-side carts keyed by either `user_id` or guest `session_id`. Cart items reference a `variant_id` **or** an `offer_id` (bundles), with `quantity`. |
| `offers` | Promotions/bundles created by admins. Can target a specific `variant_id`, have `image_url`, pricing/discount fields, and a status (active/inactive). |
| `bundle_offer_products` | Join table linking bundle offers to `variant_id`s included in the bundle. |
| `orders` | `order_number` (unique, `ORD-XXXXXX-XXXX`), `user_id` (nullable → guest orders, SET NULL on delete), `shipping_address_id`, **guest contact snapshot**: `customer_name`, `customer_phone`, `customer_email`, `customer_address`; `subtotal`, `tax`, `shipping_cost`, `total_amount`, `status` — `Pending` \| `Processing` \| `Shipped` \| `Delivered` \| `Cancelled`, `tracking_number`. |
| `order_items` | Line items with purchase-time snapshot: `item_type` — `product` \| `bundle`, `product_name`, `sku`, `quantity`, `price_at_purchase`, `variant_id`, `offer_id`, `metadata JSONB`. |
| `reviews` | Product reviews: `rating` 1–5 (CHECK), `title`, `comment`, `is_verified_buyer`. **Schema exists but no API routes yet** (future feature). |
| `contact_messages` | Contact-form submissions: `full_name`, `email`, `subject`, `message`, `status` — `new` \| `read` \| `resolved`, `admin_note`, optional `user_id`. |

Indexes exist on slugs, order number, user email, contact status/created_at, cart/order item offers, and guest-order lookups (`customer_email`, `customer_phone`).

Migrations `001…009` in `sql/migrations/` track schema evolution (orders table, variants, offers, guest contact fields, offer images/targeting, etc.). Apply with `node scripts/apply-migration.js <file>`; fresh installs can just run `npm run db:init`.

## 6. Backend API Reference

Base URL: `/api` (local: `http://localhost:5000/api` · prod: `https://triplea-api.vercel.app/api`).
All responses are JSON. Errors use `{ message, errors? }` with proper HTTP status codes. Auth = `Authorization: Bearer <jwt>`.

**Auth middleware:** `requireAuth` (valid token mandatory) · `optionalAuth` (attach user if token present, else continue as guest) · `requireAdmin` (must be `role=admin`).

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | API + DB connectivity status (used by frontend `useApiStatus`). |

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register customer. Body: `email`, `password`, `firstName`, `lastName`. Creates user + profile, returns JWT. |
| POST | `/auth/login` | — | Login. Returns JWT + user (incl. `role`). Token is stored client-side under `triplea_auth_token`. |
| GET | `/auth/me` | ✅ | Current user profile (profile, reward points, tier). |

### Products (`/api/products`) — public catalog
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | — | List products. Query params: `category` (slug), `search`, `sort`, `page`, `limit`. Returns products with variants, primary image, aggregated rating. |
| GET | `/products/:slug` | — | Single product by slug with all variants, images (product + per-variant), and active offers targeting its variants. |

### Cart (`/api/cart`) — `optionalAuth`
Works for **logged-in users** (cart bound to `user_id`) and **guests** (cart bound to a UUID `session_id` sent in the `x-session-id` header; the frontend persists it in localStorage under `triplea_guest_session_id`).

| Method | Path | Description |
|---|---|---|
| GET | `/cart` | Current cart with items, prices (base + `price_modifier`), line totals, subtotal, item count. |
| POST | `/cart/items` | Add an item. Body: `variantId` + `quantity` for a product variant; bundle offers are added through the same endpoint with an `offerId` (the `addBundleItem` service in `services/api/cart.js`). |
| PUT | `/cart/items/:id` | Update quantity. |
| DELETE | `/cart/items/:id` | Remove item. |

### Orders (`/api/orders`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/orders` (alias `/orders/checkout`) | optional | **Cash-on-delivery checkout.** Body: `customerName`, `customerPhone`, `customerEmail`, `customerAddress`, `total`. Transactional: validates cart non-empty, verifies client total matches server-computed subtotal (±0.01), generates a unique order number (retries up to 5 on collisions), inserts order + order items, **clears the cart**, commits. On rollback-safe failure nothing persists. Returns `{ orderId, whatsappUrl }`. |
| GET | `/orders/my` | ✅ | Authenticated user's order history with items. |

> **Known limitation:** checkout does *not* currently decrement `product_variants.stock_quantity` and no online payment gateway is integrated — payment is cash on delivery confirmed via WhatsApp.

### Offers (`/api/offers`)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/offers` | — | Active offers (bundles) shown on the storefront. |

### Contact (`/api/contact`)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/contact/messages` | optional | Submit a contact message. Body: `fullName`, `email`, `subject`, `message`. Linked to `user_id` when logged in. |

### Admin (`/api/admin/*`) — all `requireAuth` + `requireAdmin`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Full analytics payload: KPI cards (revenue/orders/customers/conversion, 30-day with trend + sparkline), all-time revenue & orders, order status counts, revenue series (`7d` daily, `30d` daily, `1y` monthly), top-selling products, recent orders, analytics (avg order value, cart abandonment rate, return-customer rate), inventory stats (products, variants, low stock, featured), customer stats + top customers. |
| GET | `/admin/products` | Full product list for management (all fields incl. variants/stock). |
| POST | `/admin/products/upload` | Multipart image upload → saved to `backend/uploads/`, returns URL. |
| POST | `/admin/products` | Create product (with variants/images). |
| PUT | `/admin/products/:id` | Update product/variants/stock/featured. |
| DELETE | `/admin/products/:id` | Delete product (variants/images cascade). |
| GET | `/admin/orders` | All orders (filter/sort for the Orders table). |
| GET | `/admin/orders/:id` | Single order with items. |
| PATCH | `/admin/orders/:id/status` | Update order status (`Pending`→`Processing`→`Shipped`→`Delivered`, or `Cancelled`) / tracking number. |
| GET | `/admin/messages` | Contact messages for the inbox. |
| PATCH | `/admin/messages/:id` | Mark read/resolved, add admin note. |
| DELETE | `/admin/messages/:id` | Delete message. |
| GET | `/admin/customers` | Customer list with order stats. |
| GET | `/admin/customers/:id` | Customer detail. |
| GET/POST/PUT/PATCH/DELETE | `/admin/offers`, `/admin/offers/:id`, `/admin/offers/:id/status` | Full offer (bundle) management — list, detail, create, update, activate/deactivate, delete. |

`GET /api/` (outside `/api/*` routes) returns `{ message: "TripleA API is running." }`. Unknown routes → 404 `{ message: "Resource not found." }` (no URL echoing). Unhandled errors → central `errorHandler`: 4xx keep their message, 5xx collapse to a generic message in production (details logged server-side only).

## 7. Frontend — Routes & Pages

All routes live in `frontend/src/router/AppRouter.jsx`. `MainLayout` (header, nav, search overlay, footer, CartSidebar) wraps all storefront routes; `/admin` and `/auth` are standalone. An `AppIntroLoader` splash shows during boot (safety timeout: 8s, can never stick).

| Route | Page component | Auth | Description |
|---|---|---|---|
| `/` | `HomePage` | public | Landing page. **Admins are automatically redirected to `/admin`** (`HomeEntryRoute`). |
| `/shop` | `ShopPage` | public | Product catalog: category filtering (via `?category=slug`), search, sorting, pagination, `SidebarFilter`, `ProductCard` grid. |
| `/products/:slug` | `ProductDetailPage` | public | Product detail: image gallery, variant selection (flavor / weight / size / color — driven by `has_flavor`/`has_weight` flags and variant data), price = `base_price + price_modifier`, stock display, add to cart, quantity picker. |
| `/about` | `AboutPage` | public | Brand story page. |
| `/contact` | `ContactPage` | public | Contact form (`ContactForm`) → `POST /contact/messages`. |
| `/cart` | `CartPage` | public | Full cart page: line items, quantity update, remove, subtotal, link to checkout. A slide-in `CartSidebar` is also available anywhere in the layout. |
| `/checkout` | `CheckoutPage` | public (guest OK) | Cash-on-delivery checkout form (name, phone, email, address). Submits order, then navigates to `/order-success` with the returned WhatsApp confirmation link. |
| `/order-success` | `OrderSuccessPage` | public | Order confirmation screen; shows order number and a "Confirm on WhatsApp" button using the `whatsappUrl` from checkout. |
| `/auth` | `AuthPage` | public | Combined login/register screen. Supports `initialMode="reset"` at `/auth/reset-password`. Social-login buttons currently route to `/help?topic=oauth` (providers not connected). |
| `/dashboard` | `UserDashboardPage` | customer | Customer dashboard: profile, order history (`/orders/my`), reward points, membership tier. `/profile` redirects here. Admins visiting are sent to `/admin`. Unauthenticated users are sent to `/auth`. |
| `/help` | `StaticInfoPage variant="help"` | public | Support center (account/orders/social-login info cards). |
| `/terms` | `StaticInfoPage variant="terms"` | public | Terms of service. |
| `/privacy` | `StaticInfoPage variant="privacy"` | public | Privacy policy. |
| `/admin` | `AdminDashboardPage` | admin | Full admin portal (see §8). Guards: no token → `/auth`; customer role → redirected. |
| `*` | — | — | Any unknown path redirects to `/`. |

### Global state — `AppContext` (`frontend/src/context/AppContext.jsx`)
Single provider exposing: `authUser`, `authToken`, `login`, `register`, `logout`, `refreshProfile`; cart state (`cart`, `cartLoading`, `cartSyncing`, `cartError`, `addCartItem`, `addBundleItem`, `updateCartItemQuantity`, `removeCartItemById`, `refreshCart`); orders (`orders`, `refreshMyOrders`, `checkoutCart`, `checkoutLoading`); theming (`themeMode`, `themeColors`, `toggleTheme`, `updateThemeColor`, `resetThemeColors`); plus `apiStatus` and `isBootstrapping`.

Key behaviors:
- **Auth token** persisted in `localStorage` under `triplea_auth_token`; profile restored on boot via `/auth/me`.
- **Guest sessions**: UUID in `localStorage` under `triplea_guest_session_id`, sent as the `x-session-id` header so guests get a server-side cart. On login, the cart resolves to the user's account.
- **Client cart safety**: quantities clamped to 0–20, money values rounded to 2 decimals, items with quantity 0 filtered out; totals recomputed locally after every mutation.
- **Bootstrap**: on first load, cart (and profile if a token exists) load in parallel via `Promise.allSettled`; the splash hides when they settle or after 8s.
- **Theme**: dark industrial theme with `#FFCC00` accent. Fonts: Montserrat / Hanken Grotesk (headings), JetBrains Mono (mono labels). CSS variables `--theme-accent`, `--theme-bg-canvas`, `--theme-bg-surface`, `--theme-text-primary`, `--theme-text-muted`, `--theme-border-soft` are set on `:root` from `themeColors` (per-mode presets) and persisted in localStorage (`triplea_theme_mode`, `triplea_theme_colors_<mode>`). `ThemeControls`/`ThemeToggle` in the header let users tweak accent + mode. Icons: Lucide.

### Header / layout features (`MainLayout`)
Responsive top nav (Home, Shop, About Us), scroll-aware styling, mobile hamburger menu, cart icon with live item count opening `CartSidebar`, user menu (login link or dashboard + logout), and a **full-screen search overlay**: loads up to 40 products once and performs local fuzzy matching, shows popular category chips (deep-link to `/shop?category=…`) and "hot drops" suggestions when empty.

## 8. Admin Dashboard (`/admin`)

A separate portal (own layout, not `MainLayout`) with a fixed `AdminSidebar` (Dashboard · Inventory · Offers · Orders · Messages · Customers · Settings), an `AdminTopbar` (mobile drawer toggle, search, admin avatar, logout), and one section component per tab under `components/admin/sections/`. Sections are switched client-side within the `/admin` route.

| Section | Features |
|---|---|
| **Dashboard** | KPI stat cards (`AdminStatCard`: revenue, orders, customers, conversion — 30-day values with % trend + sparkline bars), revenue chart panel (`RevenueChartPanel`, 7d/30d/1y series), `TopSellingPanel` (units + revenue + image per product), recent orders list with customer initials + status badges, order-status counters. All data from `GET /admin/dashboard`. |
| **Inventory** (`AdminInventorySection`) | Product management: table of all products, create product, edit (name, price, category, featured flag, materials/care), variants (flavor/weight/size/color, `price_modifier`, `stock_quantity`), image upload (`POST /admin/products/upload`), delete product. Low-stock visibility. |
| **Offers** (`AdminOffersSection`) | Bundle/promotion management: create/edit offers, target variants, set pricing/discount, attach image, activate/deactivate, delete. |
| **Orders** (`AdminOrdersSection` + `OrdersTable`) | All orders with search/filter, order detail, status workflow updates (Pending → Processing → Shipped → Delivered / Cancelled), tracking number. |
| **Messages** (`AdminMessagesSection`) | Contact-form inbox: read messages, mark read/resolved, add admin notes, delete. |
| **Customers** (`AdminCustomersSection`) | Customer list with order counts/spend, customer detail view. |
| **Settings** (`AdminSettingsSection`) | Portal settings placeholder. |

Access control: every `/api/admin/*` call requires a valid admin JWT (enforced server-side by `requireAuth` + `requireAdmin`); the frontend additionally guards the route itself.

---

## 9. Checkout, Orders & Offers — end-to-end flows

### Guest → checkout flow (no account required)
1. Guest browses shop/product pages (public APIs).
2. Adding to cart creates a server-side cart bound to the guest's `session_id` (UUID from `AppContext`, sent via `x-session-id`).
3. At `/checkout` the guest fills name/phone/email/address → `POST /api/orders`.
4. Backend runs a **transaction**: re-reads cart items from DB, recomputes the subtotal server-side, rejects if the client `total` mismatches, inserts `orders` + `order_items` (snapshot of name/sku/price at purchase), deletes the cart's items, commits.
5. Response includes the `orderNumber` and a `whatsappUrl` (`https://wa.me/<WHATSAPP_NUMBER>?text=…` containing a formatted order-confirmation message: order ID, customer, address, items, total). The success page opens WhatsApp for the buyer/store owner to confirm the cash-on-delivery order.
6. Logged-in customers additionally see the order in `/dashboard` via `GET /api/orders/my`.

### Offers / bundles
- Admins create **offers** (bundles) that can target specific product variants and include multiple `bundle_offer_products`.
- Active offers surface on the storefront (product detail + shop); customers add them to the cart, where they are stored with `offer_id` (`item_type='bundle'` once ordered).
- Bundle selection UI: `BundleVariantModal` lets the customer pick the variant(s) included in the bundle before adding to cart.

### Order statuses
`Pending` → `Processing` → `Shipped` → `Delivered`, or `Cancelled` (CHECK-constrained in the DB; normalized in the dashboard stats, which tolerates the `canceled` spelling).

## 10. Deployment (Vercel — two projects)

The apps are deployed as **two separate Vercel projects**, each with Root Directory set accordingly.

### Frontend project (Root Directory: `frontend`)
- Vercel auto-detects **Vite**; build `npm run build`, output `dist/`.
- `frontend/vercel.json` provides the **SPA rewrites** (required — React Router uses `BrowserRouter`, so refreshing `/shop`, `/about`, `/admin`, `/products/:slug` etc. would otherwise 404):
  ```json
  {
    "rewrites": [
      { "source": "/api/(.*)", "destination": "/api/$1" },
      { "source": "/(.*)",    "destination": "/index.html" }
    ]
  }
  ```
  The `/api/(.*)` pass-through guarantees API paths are never swallowed by the SPA catch-all; real files (Vite `/assets/*`) are served before rewrites apply.
- Env var: `VITE_API_BASE_URL=https://triplea-api.vercel.app/api`.

### Backend project (Root Directory: `backend`)
- Serverless entry: `backend/api/index.js` (connects the DB pool once per warm instance, then exports the Express app). Config in `backend/vercel.json`.
- Env vars: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL=https://triple-a-eg.vercel.app` (CORS), optional `CORS_ORIGINS`, `WHATSAPP_NUMBER`.

### Single-project alternative
The root `vercel.json` contains a monorepo config (static frontend + `/api` functions) but it is **not used** by the current two-project setup. Prefer the two-project deployment.

> Note: `/uploads` static files live on the server filesystem, which is ephemeral on Vercel — uploaded admin images persist only per-instance. For durable hosting, move images to object storage (S3/Cloudinary) — a known future improvement.

---

## 11. Utility Scripts (`backend/scripts/`)

| Script | Purpose |
|---|---|
| `init-db.js` (`npm run db:init`) | Apply `sql/schema.sql` (idempotent). |
| `reset-db.js` (`npm run db:reset`) | Drop/recreate schema. |
| `seed-supplements-catalog.js` (`npm run seed:catalog`) | Seed categories + supplement products/variants/images. |
| `seed-demo.js` (`npm run db:seed:demo`) | Seed demo customers/orders to populate the dashboard. |
| `create-admin.js` (`npm run create-admin`) | Create/update an admin account (bcrypt password). |
| `clean-demo-data.js` | **Handover cleanup**: deletes all orders, order items, carts, cart items, contact messages, reviews, offers, and non-admin users — inside one transaction, never touching `products`, `variants`, `images`, `categories`, or the admin account. Resets identity sequences. |
| `wipe-db.js` / `verify-db-wipe.js` / `verify-reset-counts.js` / `verify-cleanup.js` | Wipe and verify DB states. |
| `apply-migration.js` | Apply one incremental SQL migration file. |
| `check-db-state.js` / `check-catalog-seed.js` | Inspect row counts / seed integrity. |
| `normalize-weight-products.js` / `verify-weight-pricing.js` | Normalize weight-based variant pricing. |
| `e2e-offers-test.js` / `verify-bundle-image.js` | End-to-end checks for the offers/bundles feature. |
| `verify-admin-login.js` | Verify admin credentials authenticate. |

Backend also has `npm test` → `node --test tests/*.test.js`.

---

## 12. Conventions & Gotchas (for agents)

- **Frontend**: Tailwind + CSS-variable theme tokens; PascalCase component files; named function exports in API service modules; all route data fetched via the shared `apiClient` (axios) from `services/api/*`; path alias `@` → `frontend/src`; dark industrial theme with `#FFCC00` accent — do not hardcode colors that should use `--theme-*` variables.
- **Backend**: layered `routes → controllers → services/models` with raw SQL through `config/db.js` (`?` placeholders are fine — auto-converted to `$n`). Named exports, `.js` extensions on relative imports, `@desc/@route/@access` JSDoc on controllers, throw `error.statusCode` for the central error handler. Respond `{ success, message }` from validators/middleware.
- **Never** add client-facing detail to 5xx errors or echo request URLs in 404s (deliberate hardening — keep it).
- **Never** expose localhost CORS origins in production builds.
- `frontend/.env` / `backend/.env` are gitignored; `.env.example` files document the shapes.
- Currency is **EGP** throughout (`formatMoney` in `utils/whatsapp.js`, UI price displays).
- Known gaps / future work: reviews API (table exists, no routes), online payments (COD only), stock decrement at checkout, durable image storage, social login, password-reset backend (`/auth/reset-password` route exists UI-side), notifications/email.

---

*Last updated: 2026 — see git history for the full change log.*


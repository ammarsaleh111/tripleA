# TripleA GYM - Industrial Strength Fitness E-Commerce

TripleA is an industrial strength fitness & supplement e-commerce platform with a modern React storefront, Express API, and PostgreSQL database. It supports full shopping flows, cart checkout, user accounts, admin inventory & order management, and interactive customer services.

## Key Features

- **Shop Catalog**: Dynamic product grid with category filtering, price sliders, sorting, stock badges, and industrial yellow-accented dark aesthetics.
- **Product Details**: Deep product view with image galleries, flavor/size variant selectors, stock availability, ratings, and related items.
- **Cart & Checkout**: Real-time quantity controls, promo code engine, guest/user checkout, shipping fee calculations, and instant order placement.
- **Auth & Profile**: Secure login/registration, persistent session control, role-based redirects (Customer/Admin), user order history, and profile details.
- **Admin Dashboard**: Comprehensive administration suite for catalog management, stock updates, order fulfillment status tracking, customer metrics, and incoming message review.

## Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Axios
- **Backend**: Node.js, Express, PostgreSQL (`pg`)
- **Styling**: Industrial Dark UI design system (Montserrat, Hanken Grotesk, JetBrains Mono, `#FFCC00` industrial yellow accent)

## Project Structure

```text
backend/   Express API, controllers, routes, SQL models, seed scripts
frontend/  React application, components, pages, design system tokens
```

## Local Development

Install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Install and run the backend:

```bash
cd backend
npm install
npm run dev
```

Initialize the database schema without inserting application data:

```bash
cd backend
npm run db:init
```

Demo data is opt-in:

```bash
cd backend
npm run db:seed:demo
```

To remove application data while preserving the existing admin account:

```bash
cd backend
npm run db:reset
```

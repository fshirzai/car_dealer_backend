# Car Dealership MIS + Online Car Sales — Backend

A production-grade REST API for a car dealership management system with an
online storefront, built on **Node.js + Express + MongoDB + Mongoose**, with
JWT authentication and comprehensive unit + integration tests.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Folder Structure](#folder-structure)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Domain Model](#domain-model)
- [Testing](#testing)
- [Deployment Checklist](#deployment-checklist)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Database | MongoDB 7 (Mongoose 8) |
| Auth | JWT (access + refresh with rotation), bcrypt |
| Validation | Joi |
| Logging | Winston + Morgan |
| Security | Helmet, CORS, rate limiting |
| Tests | Jest + Supertest |

---

## Features

### Core
- 🔐 **Full auth**: register, login, JWT refresh rotation, logout, logout-all, password reset, email verification
- 👤 **Users**: `ADMIN`, `SELLER`, `CUSTOMER` roles with role-based access control
- 🧑 **Customer profiles**: 1:1 with customer users, auto-created on registration
- 🏢 **Sellers**: individuals + companies, soft-delete via `isActive`
- 🚗 **Vehicles**: full inventory management with rich filtering (make, model, year, price, mileage, body, fuel, condition…)
- 🖼 **Vehicle media**: multiple images (with primary swap + reordering) and one video per vehicle
- ⭐ **Favorites & cart**: per-customer, idempotent, unique constraints
- 📦 **Orders**: customer order requests with full status workflow + snapshots
- 💰 **Purchases**: one acquisition record per vehicle, from a specific seller
- 🧾 **Sales**: one actual sale per vehicle (online/offline), marks vehicle `SOLD`
- 💸 **Expenses**: per-vehicle costs (frozen after sale) + general dealership costs
- 📊 **Profit calculation**: `sale − (purchase + Σ vehicle expenses)` per vehicle + aggregate report
- 📝 **Audit log**: tamper-resistant mutation trail with automatic sensitive-field stripping
- ⚙️ **Dealership settings**: true singleton, public read + admin write

### Security
- Passwords hashed with bcrypt (12 rounds)
- Refresh tokens hashed in DB, rotated on use, TTL-indexed
- Sparse unique indexes allow multiple nulls (VIN, engine number)
- Joi validation on **every** request body, params, and query
- Rate limiting on the whole API + stricter on auth routes
- No sensitive fields ever logged or stored in audit trail

---

## Quick Start

### 1. Prerequisites

- **Node.js ≥ 18**
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) — or use Atlas
- **npm** ≥ 9

### 2. Install

```bash
git clone <your-repo>
cd car-dealership/backend
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB URI and JWT secrets (see below).

### 4. Seed demo data (optional but recommended)

```bash
npm run seed          # add demo data
# or
npm run seed:fresh    # wipe everything and re-seed
```

This creates:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@dealership.com` | `Admin123!` |
| Seller | `seller@dealership.com` | `Seller123!` |
| Customer | `customer@dealership.com` | `Customer123!` |
| Customer | `bob@dealership.com` | `Customer123!` |

Plus: 2 sellers, 6 vehicles, images/videos, purchases, expenses, one completed sale, one open order.

### 5. Run

```bash
npm run dev    # development (nodemon)
npm start      # production
```

API is at `http://localhost:5000/api/v1`.

Health check: `GET http://localhost:5000/health`

---

## Environment Variables

`.env.example`:

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/car_dealership
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/car_dealership_test

# JWT
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change-me-too
JWT_REFRESH_EXPIRES_IN=30d

# Bcrypt
BCRYPT_SALT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

---

## Scripts

| Script | Description |
|---|---|
| `npm start` | Production server |
| `npm run dev` | Dev server with nodemon |
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |
| `npm run test:coverage` | Coverage report |
| `npm run seed` | Insert demo data |
| `npm run seed:fresh` | Drop everything + insert demo data |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Folder Structure

```
backend/
├── scripts/
│   └── seed.js                  # Demo data seeder
├── src/
│   ├── config/                  # env, database, logger
│   ├── constants/
│   │   └── enums.js             # All domain enums
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── validate.middleware.js
│   ├── modules/                 # ✨ One folder per entity
│   │   ├── user/
│   │   ├── auth/
│   │   ├── customerProfile/
│   │   ├── seller/
│   │   ├── vehicle/
│   │   ├── vehicleImage/
│   │   ├── vehicleVideo/
│   │   ├── favorite/
│   │   ├── cartItem/
│   │   ├── order/
│   │   ├── purchase/
│   │   ├── sale/
│   │   ├── vehicleExpense/
│   │   ├── generalExpense/
│   │   ├── auditLog/
│   │   └── dealershipSettings/
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   ├── baseSchemaPlugin.js
│   │   ├── crypto.js
│   │   ├── jwt.js
│   │   ├── pagination.js
│   │   └── snapshot.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── setup.js
│   ├── helpers/
│   │   ├── authHelper.js
│   │   └── factories.js
│   └── integration/
└── package.json
```

### Every module has the same 6 files + tests

```
modules/<entity>/
├── <entity>.model.js         # Mongoose schema
├── <entity>.service.js       # Business logic
├── <entity>.controller.js    # HTTP handlers
├── <entity>.routes.js        # Express routes
├── <entity>.validation.js    # Joi schemas
├── <entity>.constants.js     # Module constants
└── __tests__/
    └── <entity>.service.test.js
```

---

## Architecture

### Request flow

```
HTTP → helmet → CORS → json → morgan → rate limit
     → route → validate(Joi) → authenticate → authorize(role)
     → controller → service → model
     → ApiResponse → client
```

Errors flow through `error.middleware.js`, which:
- Converts Mongoose/JWT errors into `ApiError`
- Logs 5xx to `logger.error`, 4xx to `logger.warn`
- Returns a consistent JSON shape: `{ success, statusCode, message, errors }`

### Conventions

- **`ApiError`** for all business errors (`ApiError.notFound(...)`, etc.)
- **`ApiResponse`** wraps success responses
- **`asyncHandler`** wraps async controllers (no try/catch boilerplate)
- **`validate(schemas)`** middleware validates `{ body, params, query }`
- **`authenticate`** → decodes JWT, loads user, sets `req.user`
- **`authorize(...roles)`** → role gate
- Snapshot fields (`customerName`, `vehicleStockNumber`, `unitPrice`) preserve
  historical values even if the source changes
- Unique numbering via atomic `$inc` on counter collections (`STK-YYYYMM-####`,
  `ORD-...`, `PUR-...`, `SAL-...`)

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

**Legend:** 🌍 Public · 🔑 Authenticated · 🧑 CUSTOMER · 👨‍💼 ADMIN or SELLER · 🛡 ADMIN only

### Health

| Method | Endpoint | Access |
|---|---|---|
| GET | `/health` | 🌍 |

### Auth

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | 🌍 | Customer self-signup |
| POST | `/auth/login` | 🌍 | Email + password → tokens |
| POST | `/auth/refresh` | 🌍 | Rotate refresh token |
| POST | `/auth/logout` | 🌍 | Revoke one refresh token |
| POST | `/auth/logout-all` | 🔑 | Revoke all sessions |
| GET | `/auth/me` | 🔑 | Current user |
| POST | `/auth/forgot-password` | 🌍 | Send reset link |
| POST | `/auth/reset-password` | 🌍 | Consume reset token |
| POST | `/auth/verify-email` | 🌍 | Consume verify token |
| POST | `/auth/resend-verification` | 🔑 | Resend verify email |

### Users

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/users/me` | 🔑 | Current user |
| PATCH | `/users/me` | 🔑 | Update own profile |
| PATCH | `/users/me/password` | 🔑 | Change password |
| POST | `/users` | 🛡 | Create user |
| GET | `/users` | 🛡 | List/search |
| GET | `/users/:id` | 🛡 | Get one |
| PATCH | `/users/:id` | 🛡 | Update |
| PATCH | `/users/:id/activate` | 🛡 | Enable |
| PATCH | `/users/:id/deactivate` | 🛡 | Disable |
| DELETE | `/users/:id` | 🛡 | Delete |

### Customer Profiles

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/customer-profiles/me` | 🧑 | My profile (self-healing) |
| PATCH | `/customer-profiles/me` | 🧑 | Update my profile |
| POST | `/customer-profiles` | 🛡 | Create for a customer |
| GET | `/customer-profiles` | 🛡 | List/search |
| GET | `/customer-profiles/:id` | 🛡 | Get one |
| PATCH | `/customer-profiles/:id` | 🛡 | Update |
| DELETE | `/customer-profiles/:id` | 🛡 | Delete |

### Sellers

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/sellers` | 👨‍💼 | Create |
| GET | `/sellers` | 👨‍💼 | List/search |
| GET | `/sellers/:id` | 👨‍💼 | Get one |
| PATCH | `/sellers/:id` | 👨‍💼 | Update |
| PATCH | `/sellers/:id/activate` | 👨‍💼 | Enable |
| PATCH | `/sellers/:id/deactivate` | 👨‍💼 | Disable |
| DELETE | `/sellers/:id` | 🛡 | Hard delete |

### Vehicles

**Public**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/vehicles` | Browse published, AVAILABLE/RESERVED |
| GET | `/vehicles/:id` | View one (public fields only) |
| GET | `/vehicles/:vehicleId/images` | Gallery |
| GET | `/vehicles/:vehicleId/video` | Video (may be null) |

**Staff** — all under `/vehicles/staff`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/` | Create vehicle |
| GET | `/` | List with internal data |
| GET | `/:id` | Get one (full data) |
| PATCH | `/:id` | Update |
| PATCH | `/:id/status` | Change status |
| PATCH | `/:id/publish` | Make public |
| PATCH | `/:id/unpublish` | Hide |
| DELETE | `/:id` | Delete (blocked if SOLD) |
| GET | `/:id/profit` | Single-vehicle profit |
| GET | `/report` | Aggregate profit report |
| POST | `/:vehicleId/images` | Add image |
| POST | `/:vehicleId/images/bulk` | Add many images |
| PATCH | `/images/:id` | Update image |
| PATCH | `/images/:id/primary` | Set primary |
| PATCH | `/:vehicleId/images/reorder` | Reorder |
| DELETE | `/images/:id` | Delete image |
| PUT | `/:vehicleId/video` | Upsert video |
| PATCH | `/:vehicleId/video` | Update video |
| DELETE | `/:vehicleId/video` | Delete video |

### Favorites (🧑 CUSTOMER only)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/favorites` | List mine |
| POST | `/favorites` | Add `{ vehicleId }` (idempotent) |
| POST | `/favorites/toggle` | Toggle `{ vehicleId }` |
| DELETE | `/favorites` | Remove by `{ vehicleId }` |
| DELETE | `/favorites/:id` | Remove by favorite id |

### Cart (🧑 CUSTOMER only)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/cart` | List mine |
| GET | `/cart/count` | Item count |
| POST | `/cart` | Add `{ vehicleId }` |
| DELETE | `/cart` | Remove by `{ vehicleId }` |
| DELETE | `/cart/:id` | Remove by cart item id |
| DELETE | `/cart/clear` | Empty cart |

### Orders

**Customer**

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/orders` | Create from `{ items: [{ vehicleId }] }` |
| GET | `/orders/mine` | My orders |
| GET | `/orders/mine/:id` | My order (no staffNotes) |
| POST | `/orders/mine/:id/cancel` | Cancel while PENDING |

**Staff** — under `/orders/staff`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | List all |
| GET | `/:id` | Get one |
| PATCH | `/:id/status` | Transition status |
| PATCH | `/:id/staff-notes` | Update internal notes |

### Purchases (👨‍💼 ADMIN + SELLER)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/purchases` | Record acquisition |
| GET | `/purchases` | List/search |
| GET | `/purchases/:id` | Get one |
| PATCH | `/purchases/:id` | Update |
| DELETE | `/purchases/:id` | Delete (🛡) |

### Sales (👨‍💼 ADMIN + SELLER)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/sales` | Record sale (marks vehicle SOLD) |
| GET | `/sales` | List/search |
| GET | `/sales/:id` | Get one |
| PATCH | `/sales/:id` | Update |
| DELETE | `/sales/:id` | Reverse (🛡, restores vehicle) |

### Vehicle Expenses (👨‍💼 ADMIN + SELLER)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/vehicle-expenses` | Record |
| GET | `/vehicle-expenses` | List/search |
| GET | `/vehicle-expenses/by-vehicle/:vehicleId` | All for a vehicle |
| GET | `/vehicle-expenses/by-vehicle/:vehicleId/summary` | Totals + by category |
| GET | `/vehicle-expenses/:id` | Get one |
| PATCH | `/vehicle-expenses/:id` | Update |
| DELETE | `/vehicle-expenses/:id` | Delete (🛡) |

### General Expenses (👨‍💼 ADMIN + SELLER)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/general-expenses` | Record |
| GET | `/general-expenses` | List/search |
| GET | `/general-expenses/summary` | Totals by category |
| GET | `/general-expenses/:id` | Get one |
| PATCH | `/general-expenses/:id` | Update |
| DELETE | `/general-expenses/:id` | Delete (🛡) |

### Audit Logs (🛡 ADMIN only)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/audit-logs` | List/search |
| GET | `/audit-logs/by-entity/:entityType/:entityId` | Filter by entity |
| GET | `/audit-logs/:id` | Get one |

### Dealership Settings

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/dealership-settings/public` | 🌍 | Public info |
| GET | `/dealership-settings` | 🛡 | Full settings (auto-creates) |
| PUT | `/dealership-settings` | 🛡 | Full upsert |
| PATCH | `/dealership-settings` | 🛡 | Partial update |

---

## Domain Model

### Entities (18 + settings)

```
User (ADMIN/SELLER/CUSTOMER)
 ├─ 1:0..1  CustomerProfile
 ├─ 1:N     Favorite
 ├─ 1:N     CartItem
 ├─ 1:N     Order
 ├─ 1:N     Sale (as customer)
 └─ 1:N     AuditLog

Seller
 └─ 1:N     Purchase

Vehicle
 ├─ 1:0..1  Purchase     (unique — one acquisition per vehicle)
 ├─ 1:0..1  Sale         (unique — one sale per vehicle)
 ├─ 1:N     VehicleImage
 ├─ 1:0..1  VehicleVideo
 ├─ 1:N     VehicleExpense
 ├─ 1:N     Favorite
 ├─ 1:N     CartItem
 └─ 1:N     OrderItem (embedded in Order)

Order
 └─ 1:N     OrderItem (embedded)

DealershipSettings   (singleton — fixed _id)
```

### Enum reference

| Enum | Values |
|---|---|
| UserRole | `ADMIN`, `SELLER`, `CUSTOMER` |
| VehicleStatus | `AVAILABLE`, `RESERVED`, `SOLD` |
| OrderStatus | `PENDING`, `CONTACTED`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| SaleChannel | `ONLINE`, `OFFLINE` |
| FuelType | `PETROL`, `DIESEL`, `ELECTRIC`, `HYBRID`, `PLUGIN_HYBRID`, `OTHER` |
| Transmission | `MANUAL`, `AUTOMATIC`, `CVT`, `DUAL_CLUTCH`, `OTHER` |
| DriveType | `FWD`, `RWD`, `AWD`, `FOUR_WD` |
| BodyType | `SEDAN`, `SUV`, `HATCHBACK`, `COUPE`, `CONVERTIBLE`, `PICKUP`, `VAN`, `WAGON`, `OTHER` |
| VehicleCondition | `NEW`, `USED`, `CERTIFIED_PRE_OWNED` |
| PaymentStatus | `PENDING`, `PARTIAL`, `PAID`, `REFUNDED` |
| ExpenseCategory | `TRANSPORT`, `REPAIR`, `CUSTOMS`, `REGISTRATION`, `CLEANING`, `MAINTENANCE`, `PARTS`, `OTHER` |
| GeneralExpenseCategory | `RENT`, `UTILITIES`, `SALARIES`, `MARKETING`, `SUPPLIES`, `OTHER` |

### Business rules

- **Vehicle → Purchase**: at most one (unique index).
- **Vehicle → Sale**: at most one (unique index).
- **Vehicle status**: `SOLD` is terminal — cannot change away from it, cannot be deleted.
- **Vehicle price**: `purchasePrice` is internal; `askingPrice` is public.
- **CustomerProfile**: one per customer, auto-created at registration.
- **Favorite / CartItem**: `UNIQUE(userId, vehicleId)`.
- **Order ≠ Sale**: order is a *request*; sale is the *actual transaction*.
- **Vehicle expense freeze**: no add/edit/delete once the vehicle is `SOLD`.
- **Profit** = `salePrice − (purchasePrice + Σ vehicleExpenses)`. `GeneralExpense`
  is **never** included.
- **Audit log**: sensitive fields (`password`, `*Token`, `*Hash`) are stripped
  recursively before persistence; `emit()` never throws.

---

## Testing

```bash
npm test                 # all 511 tests
npm run test:unit        # unit tests only
npm run test:integration # integration tests only
npm run test:coverage    # with coverage report
```

Tests use a **separate local database** (`car_dealership_test`) that is dropped
after each run. Make sure MongoDB is running locally.

Test helpers:
- `createTestUser` — role-aware user factory
- `createTestCustomer` — user + CustomerProfile
- `createTestVehicle` — with auto stock number
- `createTestOrder`, `createTestPurchase`, `createTestSale`, `createTestVehicleExpense`, etc.

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a **strong, random** `JWT_SECRET` and `JWT_REFRESH_SECRET` (≥ 32 chars)
- [ ] Point `MONGODB_URI` at a managed cluster (Atlas / self-hosted replica set)
- [ ] Restrict `CORS_ORIGIN` to your real frontend domain(s)
- [ ] Put the API behind a reverse proxy (nginx / Cloudflare) with TLS
- [ ] Set `TRUST_PROXY=1` if behind a proxy (already configured)
- [ ] Configure structured logging (Winston) → your observability stack
- [ ] Add a process manager (PM2 / systemd / Docker) with restart-on-crash
- [ ] Set up MongoDB backups (Atlas snapshots or `mongodump` cron)
- [ ] Monitor health at `/health`
- [ ] Consider sharding/compound indexes as data grows (existing indexes are a good start)

---

**Built with ❤️ for [your project].**
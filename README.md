# Impetus E-commerce

A feature-rich e-commerce platform built on Medusa v2 with custom modules for loyalty programs, webhooks, digital products, and product bundles.

## Features

| Module | Description |
|--------|-------------|
| **Loyalty & Rewards** | Points system, tier progression, referral program, rewards catalog |
| **Webhooks** | HMAC-signed webhook delivery with retries and dead letter queue |
| **Digital Products** | Sell and deliver downloadable content with secure downloads |
| **Bundled Products** | Create product bundles with multiple items |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Clone and install dependencies
git clone <repository>
cd Impetus-Ecommerce
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Run migrations
npx medusa db:migrate

# Seed admin user
npx medusa user -e admin@example.com -p password123

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# CORS (comma-separated origins)
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000

# Secrets
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# Store URL (for referral links)
STORE_URL=https://your-store.com

# Redis (optional - for multi-instance deployments)
# REDIS_URL=redis://localhost:6379
```

---

## Custom Modules

### Loyalty & Rewards System

Full-featured loyalty program with points, tiers, and referrals.

**Key Features:**
- Earn points on purchases (configurable rate)
- Tier progression: Bronze → Silver → Gold → Platinum
- Referral program with unique codes
- Rewards catalog with multiple reward types
- Birthday bonuses

**Documentation:** [docs/LOYALTY_SYSTEM.md](docs/LOYALTY_SYSTEM.md)

**Store API:**
```bash
GET  /store/customers/me/loyalty          # Get loyalty account
POST /store/cart/:id/loyalty/apply        # Apply points to cart
GET  /store/customers/me/referral         # Get referral info
GET  /store/referral/validate/:code       # Validate referral code
```

**Admin API:**
```bash
GET  /admin/loyalty/config                # Get config
PUT  /admin/loyalty/config                # Update config
GET  /admin/loyalty/tiers                 # List tiers
POST /admin/loyalty/rewards               # Create reward
GET  /admin/loyalty/stats                 # Program statistics
```

---

### Webhooks System

Production-ready webhook delivery with HMAC signing and automatic retries.

**Key Features:**
- HMAC-SHA256 signatures for verification
- Automatic retries with exponential backoff
- Dead letter queue for failed deliveries
- Per-endpoint configuration
- Full delivery audit trail

**Documentation:** [docs/WEBHOOKS_SYSTEM.md](docs/WEBHOOKS_SYSTEM.md)

**Supported Events:**
- `order.placed`, `order.completed`, `order.canceled`
- `customer.created`, `customer.updated`
- `webhook.test`

**Admin API:**
```bash
GET    /admin/webhooks                    # List endpoints
POST   /admin/webhooks                    # Create endpoint
POST   /admin/webhooks/:id/test           # Test delivery
POST   /admin/webhooks/:id/rotate-secret  # Rotate secret
GET    /admin/webhooks/deliveries         # Delivery history
POST   /admin/webhooks/deliveries/:id/retry # Manual retry
```

---

### Digital Products

Sell downloadable content with secure delivery.

**Key Features:**
- Upload main and preview files
- Secure download URLs for purchasers
- Public preview files for product pages
- Digital fulfillment provider (no shipping)

**Documentation:** [docs/DIGITAL_PRODUCTS.md](docs/DIGITAL_PRODUCTS.md)

**Store API:**
```bash
GET  /store/customers/me/digital-products           # My purchases
POST /store/customers/me/digital-products/:id/download  # Get download URL
GET  /store/digital-products/:id/preview            # Get preview
```

**Admin API:**
```bash
GET  /admin/digital-products              # List products
POST /admin/digital-products              # Create product
POST /admin/digital-products/upload/:type # Upload file
```

---

### Bundled Products

Create product bundles with multiple items.

**Key Features:**
- Group products into bundles
- Configurable item quantities
- Bundle linked to sellable product
- Show savings vs individual purchase

**Documentation:** [docs/BUNDLED_PRODUCTS.md](docs/BUNDLED_PRODUCTS.md)

**Store API:**
```bash
GET /store/bundles                        # List bundles
GET /store/bundles/:id                    # Get bundle details
```

**Admin API:**
```bash
GET    /admin/bundles                     # List bundles
POST   /admin/bundles                     # Create bundle
PUT    /admin/bundles/:id                 # Update bundle
DELETE /admin/bundles/:id                 # Delete bundle
```

---

## Project Structure

```
src/
├── api/
│   ├── admin/              # Admin API routes
│   │   ├── bundles/
│   │   ├── digital-products/
│   │   ├── loyalty/
│   │   └── webhooks/
│   └── store/              # Store API routes
│       ├── bundles/
│       ├── cart/
│       ├── customers/
│       ├── digital-products/
│       └── referral/
├── links/                  # Module links
├── modules/                # Custom modules
│   ├── bundled-product/
│   ├── digital-product/
│   ├── digital-product-fulfillment/
│   ├── loyalty/
│   └── webhooks/
├── subscribers/            # Event subscribers
└── workflows/              # Business workflows
    └── steps/
```

---

## Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `handle-order-points` | Order placed | Awards points, completes referrals |
| `apply-loyalty-on-cart` | Cart update | Applies points redemption |
| `apply-tier-discount-on-cart` | Cart update | Applies tier discounts |
| `create-bundled-product` | Admin action | Creates bundle with items |
| `create-digital-product` | Admin action | Creates digital product |

---

## Subscribers

| Subscriber | Event | Description |
|------------|-------|-------------|
| `loyalty-order-placed` | `order.placed` | Triggers points workflow |
| `loyalty-customer-created` | `customer.created` | Creates account, processes referral |
| `webhook-order-placed` | `order.placed` | Dispatches webhooks |
| `webhook-customer-created` | `customer.created` | Dispatches webhooks |
| `handle-digital-order` | `order.placed` | Creates digital order |

---

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run test         # Run tests
```

---

## Documentation

- [Loyalty System](docs/LOYALTY_SYSTEM.md)
- [Webhooks System](docs/WEBHOOKS_SYSTEM.md)
- [Digital Products](docs/DIGITAL_PRODUCTS.md)
- [Bundled Products](docs/BUNDLED_PRODUCTS.md)

---

## License

MIT

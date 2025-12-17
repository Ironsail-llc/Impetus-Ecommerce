# Loyalty Points Module

A fully configurable loyalty rewards system for Medusa v2.

## Overview

This module provides a comprehensive loyalty/rewards system with:
- **Configurable earn rates** - Points per dollar spent
- **Dynamic tiers** - Admin-configurable tiers with multipliers
- **Referral system** - Unique codes with bonuses for both parties
- **Transaction audit trail** - Full history of all point movements
- **Redemption controls** - Minimum redemption, max limits

## Database Models

### LoyaltyAccount
Primary customer loyalty tracking:
- `customer_id` - Unique customer identifier
- `balance` - Current available points
- `lifetime_earned` - Total points ever earned
- `lifetime_redeemed` - Total points ever redeemed
- `tier_id` - Current tier assignment
- `referral_code` - Unique referral code (auto-generated)

### LoyaltyTier
Admin-configurable tiers:
- `name` - Display name (Bronze, Silver, Gold, etc.)
- `threshold` - Lifetime points required to reach tier
- `discount_percent` - Automatic discount % applied to all orders for this tier
- `benefits_description` - Human-readable benefits
- `is_default` - Default tier for new customers

**Note:** Everyone earns points at the same flat rate. Tiers provide automatic discounts, not earning multipliers.

### LoyaltyTransaction
Audit trail for all point changes:
- `type` - Transaction type (purchase_earned, redeemed, etc.)
- `amount` - Points added/removed
- `balance_after` - Balance after transaction
- `reference_type/id` - Link to order, referral, etc.

### LoyaltyConfig
All configurable values:
- Stored as key-value pairs with types
- Cached with 1-minute TTL
- Full audit trail with `updated_by`

### LoyaltyReferral
Referral tracking:
- `referrer_account_id` - Who shared the code
- `referee_account_id` - Who used the code
- `status` - pending/completed/expired
- Configurable bonus amounts

## Configuration Keys

### Earning
- `earn_rate` - Points per $1 spent (default: 1)
- `earn_include_tax` - Include tax in calculation (default: false)
- `earn_include_shipping` - Include shipping (default: false)

### Redemption
- `redemption_rate` - Points per $1 discount (default: 100)
- `min_redemption` - Minimum points to redeem (default: 100)
- `max_redemption_type` - "none", "percent", "fixed"
- `max_redemption_value` - Maximum redemption limit

### Bonuses
- `signup_bonus_enabled` / `signup_bonus_amount`
- `birthday_bonus_enabled` / `birthday_bonus_amount`

### Referral
- `referrer_bonus` - Points for referrer
- `referee_bonus` - Points for new customer
- `referral_trigger` - "signup" or "first_purchase"
- `referral_window_days` - Days to complete referral

### Tiers
- `tier_calculation_basis` - "lifetime_earned" or "current_balance"
- `tier_downgrade_enabled` - Allow tier downgrades

## API Endpoints

### Admin Endpoints

#### Configuration
- `GET /admin/loyalty/config` - Get all config values
- `PUT /admin/loyalty/config` - Update config values

#### Tiers
- `GET /admin/loyalty/tiers` - List all tiers
- `POST /admin/loyalty/tiers` - Create new tier
- `GET /admin/loyalty/tiers/:id` - Get tier details
- `PUT /admin/loyalty/tiers/:id` - Update tier
- `DELETE /admin/loyalty/tiers/:id` - Delete tier

#### Customer Management
- `GET /admin/loyalty/customers/:id` - Get customer loyalty info
- `POST /admin/loyalty/customers/:id/adjust` - Manual point adjustment

### Store Endpoints (Customer-facing)

#### Loyalty Dashboard
- `GET /store/customers/me/loyalty` - Full loyalty info
  - Current balance and tier
  - Progress to next tier
  - Redemption value
  - Recent transactions

#### Points Preview
- `POST /store/customers/me/loyalty/preview` - Preview purchase calculation
  - Body: `{ amount: number }`
  - Returns: points to earn + tier discount preview

#### Referral
- `GET /store/customers/me/referral` - Referral code and stats
- `POST /store/customers/me/referral` - Apply referral code
  - Body: `{ referral_code: string }`

### Cart Workflows

#### Apply Points to Cart
- `POST /store/carts/:id/loyalty-points` - Apply all points as discount
  - Creates a unique promotion for the customer
  - Respects min/max redemption limits

#### Remove Points from Cart
- `DELETE /store/carts/:id/loyalty-points` - Remove points discount

## Service Methods

### Core Methods
- `getOrCreateAccount(customerId)` - Get or create loyalty account
- `earnPoints(customerId, amount, type, description)` - Add points with logging
- `redeemPoints(customerId, points, description)` - Deduct points with logging

### Configuration
- `getConfig<T>(key)` - Get config value (cached)
- `setConfig(key, value, category, adminId)` - Update config value
- `getAllConfig()` - Get all config with defaults

### Tiers
- `getAllTiers()` - List all tiers
- `getCustomerTier(customerId)` - Get customer's current tier
- `checkTierUpgrade(customerId)` - Check and apply tier upgrade

### Referrals
- `processReferralSignup(code, newCustomerId)` - Register referral
- `completeReferral(referralId)` - Award bonuses

### Calculations
- `calculatePointsFromAmount(amount)` - Convert $ to points
- `calculateDiscountFromPoints(points)` - Convert points to $

## Transaction Types

```typescript
TRANSACTION_TYPES = {
  PURCHASE_EARNED: "purchase_earned",
  SIGNUP_BONUS: "signup_bonus",
  REFERRAL_BONUS: "referral_bonus",
  REFEREE_BONUS: "referee_bonus",
  BIRTHDAY_BONUS: "birthday_bonus",
  REDEEMED: "redeemed",
  EXPIRED: "expired",
  ADMIN_ADJUSTMENT: "admin_adjustment",
  REFUND_DEDUCTION: "refund_deduction",
}
```

## Testing

Run unit tests:
```bash
npm run test:unit
```

Test files:
- `src/modules/loyalty/__tests__/loyalty.service.unit.spec.ts` - 14 core tests
- `src/modules/loyalty/__tests__/loyalty.service.extended.unit.spec.ts` - 30 extended tests

## Setup

1. Migrations are automatically applied on server start
2. Default configuration values are used until overridden
3. Create tiers via admin API or seed data

### Example: Create Default Tiers

```bash
# Bronze (default) - No discount, entry level
curl -X POST http://localhost:9000/admin/loyalty/tiers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bronze","threshold":0,"discount_percent":0,"is_default":true}'

# Silver - 5% automatic discount on all orders
curl -X POST http://localhost:9000/admin/loyalty/tiers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Silver","threshold":1000,"discount_percent":5}'

# Gold - 10% automatic discount on all orders
curl -X POST http://localhost:9000/admin/loyalty/tiers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Gold","threshold":5000,"discount_percent":10}'
```

**How Tier Discounts Work:**
- Discounts are automatically applied when logged-in customers shop
- Cart shows original prices slashed to discounted prices
- Higher tiers = bigger automatic discounts = reward for loyalty

## Architecture

```
src/modules/loyalty/
├── index.ts              # Module export
├── service.ts            # Main service with all business logic
├── models/
│   ├── loyalty-account.ts
│   ├── loyalty-tier.ts
│   ├── loyalty-transaction.ts
│   ├── loyalty-config.ts
│   ├── loyalty-referral.ts
│   ├── notification-setting.ts
│   └── index.ts
├── migrations/           # Database migrations
└── __tests__/
    ├── loyalty.service.unit.spec.ts
    └── loyalty.service.extended.unit.spec.ts

src/api/
├── admin/loyalty/
│   ├── config/route.ts
│   ├── tiers/route.ts
│   ├── tiers/[id]/route.ts
│   └── customers/[id]/
│       ├── route.ts
│       └── adjust/route.ts
└── store/customers/me/
    ├── loyalty/route.ts
    ├── loyalty/preview/route.ts
    └── referral/route.ts

src/workflows/
├── apply-loyalty-on-cart.ts
├── remove-loyalty-from-cart.ts
├── handle-order-points.ts
└── steps/
    ├── add-purchase-as-points.ts
    ├── deduct-purchase-points.ts
    └── get-cart-loyalty-promo-amount.ts

src/jobs/
├── expire-loyalty-points.ts   # Daily point expiration job
└── birthday-bonus.ts          # Daily birthday bonus job

src/subscribers/
├── loyalty-order-placed.ts    # Award points on order
├── loyalty-tier-change.ts     # Tier change notifications
└── loyalty-points-earned.ts   # Points earned notifications
```

## Scheduled Jobs

### Point Expiration (`src/jobs/expire-loyalty-points.ts`)
Runs daily at 2 AM to:
- Expire points that have passed their expiration date
- Send warning notifications at configured intervals (e.g., 30, 14, 7 days before)

**Configuration keys:**
| Key | Default | Description |
|-----|---------|-------------|
| `expiration_enabled` | `false` | Enable/disable expiration |
| `expiration_days` | `365` | Days until points expire |
| `expiration_warning_days` | `[30, 14, 7]` | Warning notification days |
| `activity_extends_expiration` | `true` | Activity resets timer |

### Birthday Bonus (`src/jobs/birthday-bonus.ts`)
Runs daily at 8 AM to:
- Check for customer birthdays
- Award bonus points (once per year)
- Send birthday notification

**Configuration keys:**
| Key | Default | Description |
|-----|---------|-------------|
| `birthday_bonus_enabled` | `false` | Enable/disable birthday bonus |
| `birthday_bonus_amount` | `0` | Points to award |

## Notification System

### Overview
The notification system provides abstract interfaces for email/SMS providers. By default, notifications log to console in development mode.

### Notification Event Types
- `points_earned` - Customer earned loyalty points
- `points_redeemed` - Customer redeemed points for discount
- `points_expiring` - Warning: points will expire soon
- `points_expired` - Points have expired
- `tier_upgrade` - Customer upgraded to higher tier
- `tier_downgrade` - Customer downgraded (if enabled)
- `referral_signup` - Someone used referral code
- `referral_completed` - Referral bonus awarded
- `birthday_bonus` - Birthday points awarded

### Admin API - Notification Settings

**List all notification settings:**
```bash
GET /admin/loyalty/notifications
```

**Configure notification for event type:**
```bash
POST /admin/loyalty/notifications
{
  "event_type": "points_earned",
  "display_name": "Points Earned",
  "email_enabled": true,
  "sms_enabled": false,
  "email_template_id": "sendgrid-template-123"
}
```

**Update specific event settings:**
```bash
PUT /admin/loyalty/notifications/:event_type
{
  "email_enabled": true,
  "sms_enabled": true
}
```

### Implementing Custom Notification Providers

```typescript
import { ILoyaltyNotificationProvider, NotificationPayload } from "../modules/loyalty/notifications"

class SendGridProvider implements ILoyaltyNotificationProvider {
  readonly id = "sendgrid"

  canHandle(channel: "email" | "sms"): boolean {
    return channel === "email"
  }

  async send(
    channel: "email" | "sms",
    payload: NotificationPayload,
    templateId?: string
  ): Promise<boolean> {
    // Implement SendGrid API call
    return true
  }
}
```

Register the provider in your application startup:
```typescript
import { createNotificationManager } from "../modules/loyalty/notifications"

const manager = createNotificationManager(container)
manager.registerProvider(new SendGridProvider())
```

## Store API - Birthday

**Get birthday info:**
```bash
GET /store/customers/me/loyalty/birthday
Authorization: Bearer <token>
x-publishable-api-key: <key>
```

Response:
```json
{
  "birthday": "1990-05-15",
  "birthday_bonus": {
    "enabled": true,
    "amount": 100,
    "received_this_year": false
  }
}
```

**Set/update birthday:**
```bash
PUT /store/customers/me/loyalty/birthday
Authorization: Bearer <token>
x-publishable-api-key: <key>
Content-Type: application/json

{
  "birthday": "1990-05-15"
}
```

## Full File Structure (Phase 3)

```
src/modules/loyalty/
├── index.ts
├── service.ts
├── models/
│   ├── loyalty-account.ts
│   ├── loyalty-tier.ts
│   ├── loyalty-transaction.ts
│   ├── loyalty-config.ts
│   ├── loyalty-referral.ts
│   ├── loyalty-point.ts (legacy)
│   ├── notification-setting.ts
│   └── index.ts
├── notifications/
│   ├── types.ts           # Notification interfaces
│   ├── manager.ts         # Notification manager
│   └── index.ts
├── migrations/
└── __tests__/

src/api/admin/loyalty/
├── config/route.ts
├── tiers/
│   ├── route.ts
│   └── [id]/route.ts
├── customers/[id]/
│   ├── route.ts
│   └── adjust/route.ts
└── notifications/
    ├── route.ts
    └── [event_type]/route.ts

src/api/store/customers/me/
├── loyalty/
│   ├── route.ts
│   ├── preview/route.ts
│   └── birthday/route.ts
└── referral/route.ts

src/jobs/
├── expire-loyalty-points.ts
└── birthday-bonus.ts

src/subscribers/
├── loyalty-order-placed.ts
├── loyalty-tier-change.ts
└── loyalty-points-earned.ts
```

## Rewards System

### How It Works

1. **Tier Discounts (Automatic)**:
   - Higher tiers get bigger automatic discounts on all orders
   - Applied when logged-in customer views cart
   - Shows slashed prices (original → discounted)
   - No points consumed - it's a tier benefit

2. **Points for Rewards (Manual)**:
   - Customers earn points on every purchase at a flat rate
   - Points are redeemed for specific rewards from the catalog
   - Reward types: coupons, free products, services, perks
   - Redeemed rewards go into customer's wallet

### Rewards API Endpoints

#### Admin Rewards Management
- `GET /admin/loyalty/rewards` - List all rewards
- `POST /admin/loyalty/rewards` - Create new reward
- `GET /admin/loyalty/rewards/:id` - Get reward details
- `PUT /admin/loyalty/rewards/:id` - Update reward
- `DELETE /admin/loyalty/rewards/:id` - Delete reward

#### Store Rewards (Customer-facing)
- `GET /store/customers/me/loyalty/rewards` - Browse available rewards
- `POST /store/customers/me/loyalty/rewards` - Redeem a reward with points
- `GET /store/customers/me/loyalty/wallet` - View redeemed rewards/coupons

### Reward Types

| Type | Description | Discount Field Usage |
|------|-------------|---------------------|
| `coupon_fixed` | Fixed amount off | `discount_value` = dollar amount |
| `coupon_percent` | Percentage off | `discount_value` = percentage |
| `free_product` | Free product | `product_id`, `variant_id` |
| `service` | Free service (consultation, etc.) | N/A |
| `perk` | Special access/benefit | N/A |

## Testing

Run unit tests:
```bash
npm run test:unit
```

Current test coverage: 78 tests passing

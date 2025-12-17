# Loyalty Rewards System - Project Plan

## Overview

A comprehensive loyalty/rewards system for Medusa v2 e-commerce platform that enables customer retention through points, tiers, referrals, and rewards.

## Project Phases

### Phase 1: Core Module (Completed)
**Duration:** Foundation
**Status:** ✅ Complete

#### Deliverables
- [x] LoyaltyAccount model with balance tracking
- [x] LoyaltyTier model for dynamic tiers
- [x] LoyaltyTransaction audit trail
- [x] LoyaltyConfig key-value storage
- [x] LoyaltyReferral tracking
- [x] Basic service methods (add/deduct points)
- [x] Database migrations

#### Key Files
```
src/modules/loyalty/
├── models/
│   ├── loyalty-account.ts
│   ├── loyalty-tier.ts
│   ├── loyalty-transaction.ts
│   ├── loyalty-config.ts
│   └── loyalty-referral.ts
├── service.ts
└── migrations/
```

---

### Phase 2: Admin & Store APIs (Completed)
**Duration:** API Layer
**Status:** ✅ Complete

#### Deliverables
- [x] Admin config management endpoints
- [x] Admin tier CRUD endpoints
- [x] Admin customer loyalty endpoints
- [x] Admin manual point adjustment
- [x] Store loyalty dashboard endpoint
- [x] Store referral endpoints
- [x] Store points preview endpoint
- [x] Cart loyalty workflows
- [x] Order points workflows

#### Admin API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/loyalty/config` | List all config |
| PUT | `/admin/loyalty/config` | Update config values |
| GET | `/admin/loyalty/tiers` | List all tiers |
| POST | `/admin/loyalty/tiers` | Create tier |
| GET | `/admin/loyalty/tiers/:id` | Get tier |
| PUT | `/admin/loyalty/tiers/:id` | Update tier |
| DELETE | `/admin/loyalty/tiers/:id` | Delete tier |
| GET | `/admin/loyalty/customers/:id` | Get customer loyalty |
| POST | `/admin/loyalty/customers/:id/adjust` | Adjust points |

#### Store API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/store/customers/me/loyalty` | Loyalty dashboard |
| POST | `/store/customers/me/loyalty/preview` | Points preview |
| GET | `/store/customers/me/referral` | Get referral code |
| POST | `/store/customers/me/referral` | Apply referral code |

---

### Phase 3: Notifications & Automation (Completed)
**Duration:** Automation Layer
**Status:** ✅ Complete

#### Deliverables
- [x] Notification type system
- [x] Notification manager with provider interface
- [x] Console notification provider (development)
- [x] Point expiration scheduled job
- [x] Birthday bonus scheduled job
- [x] Tier change subscriber
- [x] Points earned subscriber
- [x] Admin notification settings endpoints

#### Notification Events
| Event | Trigger |
|-------|---------|
| `points_earned` | Customer earns points |
| `points_redeemed` | Customer uses points |
| `points_expiring` | Warning before expiration |
| `points_expired` | Points have expired |
| `tier_upgrade` | Customer upgraded tier |
| `tier_downgrade` | Customer downgraded |
| `referral_signup` | Referral code used |
| `referral_completed` | Referral bonus awarded |
| `birthday_bonus` | Birthday points awarded |

#### Scheduled Jobs
| Job | Schedule | Description |
|-----|----------|-------------|
| `expire-loyalty-points` | Daily 2 AM | Expire old points, send warnings |
| `birthday-bonus` | Daily 8 AM | Award birthday bonuses |

---

### Phase 4: Admin UI & Advanced Features (Completed)
**Duration:** UI & Advanced Logic
**Completed:** December 17, 2024
**Status:** ✅ Complete

#### Deliverables
- [x] Admin loyalty dashboard page (`/admin/routes/loyalty/page.tsx`)
- [x] Admin customer loyalty widget (`/admin/widgets/customer-loyalty-widget.tsx`)
- [x] Admin tier management page (`/admin/routes/loyalty/tiers/page.tsx`)
- [x] Admin configuration page (`/admin/routes/loyalty/config/page.tsx`)
- [x] Admin stats endpoint (`/api/admin/loyalty/stats/route.ts`)
- [x] Tier downgrade scheduled job (`/jobs/tier-recalculation.ts`)
- [x] Checkout redemption preview API (`POST /store/cart/:id/loyalty/preview`)
- [x] Checkout redemption apply API (`POST /store/cart/:id/loyalty/apply`)
- [x] Checkout redemption remove API (`DELETE /store/cart/:id/loyalty`)
- [x] LoyaltyAccount metadata field for grace period tracking
- [x] 78 unit tests passing (44 core + 34 Phase 4)

#### Admin UI Components

**1. Loyalty Dashboard Page** (`/admin/routes/loyalty/page.tsx`)
- Overview statistics (total points issued, redeemed, active accounts)
- Tier distribution chart
- Recent transactions list
- Quick configuration access

**2. Customer Loyalty Widget** (`/admin/widgets/customer-loyalty-widget.tsx`)
- Shows on customer detail page
- Displays points balance, tier, lifetime stats
- Quick point adjustment form
- Transaction history

**3. Loyalty Configuration Page** (`/admin/routes/loyalty/config/page.tsx`)
- All configuration settings in organized sections
- Form-based editing with validation
- Real-time preview of changes

**4. Tier Management Page** (`/admin/routes/loyalty/tiers/page.tsx`)
- Visual tier ladder
- Drag-and-drop reordering
- Tier creation/editing modal

#### Tier Downgrade Logic

**Configuration:**
| Key | Default | Description |
|-----|---------|-------------|
| `tier_downgrade_enabled` | `false` | Enable/disable downgrades |
| `tier_reset_period` | `never` | `never`, `annual`, `quarterly` |
| `tier_grace_period_days` | `30` | Days before downgrade |
| `tier_downgrade_notification_days` | `[14, 7, 1]` | Warning days |

**Scheduled Job:** `tier-recalculation` (Monthly 1st at 3 AM)
- Recalculates tier eligibility
- Sends downgrade warnings
- Applies downgrades after grace period

#### Checkout Redemption Preview

**Store API:**
```
POST /store/cart/:id/loyalty/preview
{
  "points_to_redeem": 500
}

Response:
{
  "preview": {
    "available_points": 1500,
    "points_to_redeem": 500,
    "discount_amount": 5.00,
    "new_cart_total": 45.00,
    "remaining_points": 1000
  },
  "redemption_options": [
    { "points": 100, "discount": 1.00 },
    { "points": 500, "discount": 5.00 },
    { "points": 1000, "discount": 10.00 },
    { "points": 1500, "discount": 15.00, "label": "Use all points" }
  ]
}
```

---

## Configuration Reference

### Earning Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `earn_rate` | number | 1 | Points per currency unit |
| `earn_include_tax` | boolean | false | Include tax in calculation |
| `earn_include_shipping` | boolean | false | Include shipping |
| `earn_on_redemption_orders` | boolean | false | Earn on discounted portion |

### Redemption Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `redemption_rate` | number | 100 | Points per currency unit |
| `min_redemption` | number | 100 | Minimum points to redeem |
| `max_redemption_type` | string | "none" | "none", "percent", "fixed" |
| `max_redemption_value` | number | 0 | Max redemption value |

### Bonus Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `signup_bonus_enabled` | boolean | false | Enable signup bonus |
| `signup_bonus_amount` | number | 0 | Signup bonus points |
| `birthday_bonus_enabled` | boolean | false | Enable birthday bonus |
| `birthday_bonus_amount` | number | 0 | Birthday bonus points |

### Referral Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `referrer_bonus` | number | 0 | Points for referrer |
| `referee_bonus` | number | 0 | Points for referee |
| `referral_window_days` | number | 30 | Days to complete referral |
| `referral_trigger` | string | "first_purchase" | When to award bonus |

### Expiration Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `expiration_enabled` | boolean | false | Enable expiration |
| `expiration_days` | number | 365 | Days until expiration |
| `expiration_warning_days` | array | [30,14,7] | Warning days |
| `activity_extends_expiration` | boolean | true | Activity resets timer |

### Tier Configuration
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tier_calculation_basis` | string | "lifetime_earned" | Basis for tier |
| `tier_downgrade_enabled` | boolean | false | Enable downgrades |
| `tier_reset_period` | string | "never" | Reset period |
| `tier_grace_period_days` | number | 30 | Grace before downgrade |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN DASHBOARD                          │
├─────────────────────────────────────────────────────────────────┤
│  Loyalty Overview  │  Tier Management  │  Configuration         │
│  Customer Widget   │  Transaction Log  │  Notification Settings │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Admin Routes (/admin/loyalty/*)                                 │
│  Store Routes (/store/customers/me/loyalty/*)                    │
│  Cart Routes (/store/cart/:id/loyalty/*)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  LoyaltyModuleService                                            │
│  ├── Account Management                                          │
│  ├── Points Operations (earn, redeem, adjust)                    │
│  ├── Tier Management (upgrade, downgrade, check)                 │
│  ├── Referral System                                             │
│  ├── Configuration Cache                                         │
│  └── Transaction Logging                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  LoyaltyAccount  │  LoyaltyTier      │  LoyaltyTransaction      │
│  LoyaltyConfig   │  LoyaltyReferral  │  NotificationSetting     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Scheduled Jobs               │  Event Subscribers               │
│  ├── expire-loyalty-points    │  ├── order.placed → points      │
│  ├── birthday-bonus           │  ├── tier.changed → notify      │
│  └── tier-recalculation       │  └── points.earned → notify     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NOTIFICATION LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  NotificationManager                                             │
│  ├── Email Provider (SendGrid, etc.)                             │
│  ├── SMS Provider (Twilio, etc.)                                 │
│  └── Console Provider (development)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Strategy

### Unit Tests
- Service method testing with mocked database
- Configuration caching tests
- Points calculation tests
- Tier eligibility tests

### Integration Tests
- API endpoint testing
- Workflow execution tests
- Database migration tests

### E2E Tests
- Full customer journey (signup → earn → redeem)
- Admin configuration flow
- Referral completion flow

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Seed default tiers (Bronze, Silver, Gold, Platinum)
- [ ] Configure notification provider
- [ ] Set up scheduled jobs in hosting environment
- [ ] Configure initial settings via admin
- [ ] Test store endpoints with publishable API key
- [ ] Verify admin authentication

---

## Future Enhancements (Phase 5+)

1. **Gamification**
   - Achievement badges
   - Milestone rewards
   - Streak bonuses

2. **Advanced Redemption**
   - Product-specific redemption rates
   - Exclusive rewards catalog
   - Partner rewards

3. **Analytics Dashboard**
   - ROI tracking
   - Customer lifetime value impact
   - Tier conversion rates

4. **Multi-currency Support**
   - Currency-specific earn rates
   - Regional tier thresholds

5. **API Integrations**
   - Third-party loyalty platforms
   - CRM integrations
   - Marketing automation

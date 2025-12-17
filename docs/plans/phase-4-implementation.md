# Phase 4 Implementation Plan

## Status: COMPLETED ✅

## Overview
Phase 4 focuses on Admin UI components, tier downgrade logic, and checkout redemption features.

## Timeline
- **Start:** December 2024
- **Completed:** December 17, 2024

---

## Feature 1: Admin UI Components

### 1.1 Loyalty Dashboard Page
**File:** `src/admin/routes/loyalty/page.tsx`

**Components:**
- Stats cards (total points, active accounts, redemptions)
- Tier distribution visualization
- Recent activity feed
- Quick action buttons

**API Dependencies:**
- `GET /admin/loyalty/stats` (new endpoint)
- `GET /admin/loyalty/config`

### 1.2 Customer Loyalty Widget
**File:** `src/admin/widgets/customer-loyalty-widget.tsx`

**Location:** Customer detail page sidebar

**Features:**
- Points balance display
- Current tier with benefits
- Quick adjustment form
- Recent transactions (last 5)
- Link to full history

### 1.3 Tier Management Page
**File:** `src/admin/routes/loyalty/tiers/page.tsx`

**Features:**
- Visual tier ladder
- Create/Edit tier modal
- Delete with confirmation
- Multiplier visualization

### 1.4 Configuration Page
**File:** `src/admin/routes/loyalty/config/page.tsx`

**Sections:**
- Earning Rules
- Redemption Rules
- Bonus Configuration
- Expiration Settings
- Tier Settings
- Notification Settings

---

## Feature 2: Tier Downgrade Logic

### 2.1 Service Methods

```typescript
// New methods to add to LoyaltyModuleService

async checkTierDowngrade(customerId: string): Promise<{
  shouldDowngrade: boolean
  currentTier: Tier | null
  newTier: Tier | null
  gracePeriodEnd?: Date
}>

async applyTierDowngrade(customerId: string, newTierId: string): Promise<void>

async getTierDowngradeCandidates(): Promise<{
  customer_id: string
  current_tier_id: string
  calculated_tier_id: string
  grace_period_end: Date
}[]>
```

### 2.2 Configuration Keys

| Key | Type | Default |
|-----|------|---------|
| `tier_downgrade_enabled` | boolean | false |
| `tier_reset_period` | string | "never" |
| `tier_grace_period_days` | number | 30 |
| `tier_downgrade_notification_days` | number[] | [14, 7, 1] |

### 2.3 Scheduled Job
**File:** `src/jobs/tier-recalculation.ts`

**Schedule:** Monthly (1st at 3 AM)

**Logic:**
1. Get all accounts with tier assignments
2. For each account:
   - Calculate current tier eligibility
   - If below current tier:
     - Check if in grace period
     - If grace period expired: downgrade
     - If in grace period: send warning
   - If above current tier: upgrade (existing logic)

### 2.4 Notification Events

| Event | Payload |
|-------|---------|
| `tier_downgrade_warning` | days_remaining, current_tier, new_tier, points_needed |
| `tier_downgrade` | old_tier, new_tier, restore_threshold |

---

## Feature 3: Checkout Redemption Preview

### 3.1 API Endpoint

**Endpoint:** `POST /store/cart/:id/loyalty/preview`

**Request:**
```json
{
  "points_to_redeem": 500
}
```

**Response:**
```json
{
  "preview": {
    "available_points": 1500,
    "points_to_redeem": 500,
    "discount_amount": 5.00,
    "cart_total_before": 50.00,
    "cart_total_after": 45.00,
    "remaining_points": 1000,
    "points_to_earn": 45
  },
  "redemption_options": [
    {
      "points": 100,
      "discount": 1.00,
      "cart_total": 49.00
    },
    {
      "points": 500,
      "discount": 5.00,
      "cart_total": 45.00
    },
    {
      "points": 1000,
      "discount": 10.00,
      "cart_total": 40.00
    },
    {
      "points": 1500,
      "discount": 15.00,
      "cart_total": 35.00,
      "label": "Use all points"
    }
  ],
  "validation": {
    "can_redeem": true,
    "min_redemption": 100,
    "max_discount": 50.00,
    "max_discount_reason": null
  }
}
```

### 3.2 Apply Redemption Endpoint

**Endpoint:** `POST /store/cart/:id/loyalty/apply`

**Request:**
```json
{
  "points_to_redeem": 500
}
```

**Response:**
```json
{
  "success": true,
  "points_applied": 500,
  "discount_amount": 5.00,
  "new_cart_total": 45.00
}
```

### 3.3 Remove Redemption Endpoint

**Endpoint:** `DELETE /store/cart/:id/loyalty`

**Response:**
```json
{
  "success": true,
  "points_restored": 500,
  "new_cart_total": 50.00
}
```

---

## File Structure (Phase 4 Additions)

```
src/
├── admin/
│   ├── routes/
│   │   └── loyalty/
│   │       ├── page.tsx              # Dashboard
│   │       ├── config/
│   │       │   └── page.tsx          # Configuration
│   │       └── tiers/
│   │           └── page.tsx          # Tier management
│   └── widgets/
│       └── customer-loyalty-widget.tsx
│
├── api/
│   ├── admin/loyalty/
│   │   └── stats/
│   │       └── route.ts              # Stats endpoint
│   └── store/cart/
│       └── [id]/
│           └── loyalty/
│               ├── preview/
│               │   └── route.ts      # Preview endpoint
│               ├── apply/
│               │   └── route.ts      # Apply endpoint
│               └── route.ts          # Remove endpoint (DELETE)
│
├── jobs/
│   └── tier-recalculation.ts         # Monthly tier job
│
└── modules/loyalty/
    └── service.ts                     # Updated with downgrade methods
```

---

## Testing Plan

### Unit Tests (34 tests - PASSED ✅)
- [x] Tier qualification logic
- [x] Downgrade detection
- [x] Grace period calculations
- [x] Annual points calculation
- [x] Redemption preview calculations
- [x] Redemption option generation
- [x] Admin stats calculations
- [x] Tier distribution calculations

**Test File:** `src/modules/loyalty/__tests__/phase4.unit.spec.ts`

### Integration Tests
- [ ] Cart redemption flow
- [ ] Tier downgrade job execution
- [ ] Admin stats endpoint

### Manual Testing
- [ ] Admin UI navigation
- [ ] Configuration form validation
- [ ] Customer widget display
- [ ] Checkout redemption UX

---

## Rollout Plan

1. **Development**
   - Implement all features
   - Write tests
   - Local testing

2. **Staging**
   - Deploy to staging
   - QA testing
   - Performance testing

3. **Production**
   - Feature flag: `LOYALTY_PHASE_4_ENABLED`
   - Gradual rollout (10% → 50% → 100%)
   - Monitor error rates

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Admin page load time | < 1s |
| Redemption preview API | < 200ms |
| Tier recalculation job | < 5min for 10K accounts |
| Zero critical bugs | Week 1 post-launch |

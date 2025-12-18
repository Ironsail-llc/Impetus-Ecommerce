# Loyalty & Rewards System

A comprehensive points-based loyalty program for Impetus E-commerce built as a custom Medusa v2 module.

## Features

- **Points System** - Earn points on purchases, redeem for discounts
- **Tier System** - Bronze, Silver, Gold, Platinum with increasing benefits
- **Referral Program** - Share links, earn bonuses when friends purchase
- **Rewards Catalog** - Redeem points for discounts, free shipping, products
- **Birthday Rewards** - Special bonuses on customer birthdays
- **Transaction History** - Full audit trail of all point activities

---

## Configuration

All settings are managed via Admin API and stored in the database.

### Config Keys

| Key | Default | Description |
|-----|---------|-------------|
| `points_per_dollar` | 1 | Points earned per $1 spent |
| `points_redemption_rate` | 100 | Points needed per $1 discount |
| `min_redemption_points` | 100 | Minimum points to redeem |
| `max_redemption_percent` | 50 | Max % of order payable with points |
| `points_expiry_days` | 365 | Days until points expire (0 = never) |
| `signup_bonus` | 0 | Points awarded on account creation |
| `birthday_bonus` | 0 | Points awarded on birthday |
| `review_bonus` | 0 | Points for leaving a review |
| `referrer_bonus` | 0 | Points for referrer when friend purchases |
| `referee_bonus` | 0 | Points for referred friend |
| `referral_window_days` | 30 | Days referral link stays valid |
| `referral_trigger` | "first_purchase" | When referral completes: "signup", "first_purchase", "min_purchase" |

### Admin Config API

```bash
# Get all config
GET /admin/loyalty/config

# Update config
PUT /admin/loyalty/config
{
  "points_per_dollar": 2,
  "signup_bonus": 100
}
```

---

## Points System

### Earning Points

Points are automatically awarded when:
1. **Order placed** - Based on `points_per_dollar` setting
2. **Account created** - `signup_bonus` points
3. **Birthday** - `birthday_bonus` points (manually triggered)
4. **Referral completed** - `referrer_bonus` / `referee_bonus` points

### Redeeming Points

Points can be redeemed at checkout for discounts:
- Minimum: `min_redemption_points`
- Maximum: `max_redemption_percent` of order total
- Rate: `points_redemption_rate` points = $1

### Store API - Points

```bash
# Get customer loyalty account
GET /store/customers/me/loyalty
Response: {
  "account": {
    "id": "...",
    "customer_id": "...",
    "total_points_earned": 1500,
    "total_points_redeemed": 200,
    "current_balance": 1300,
    "lifetime_value": 450.00,
    "tier_id": "...",
    "referral_code": "REF-ABC123-XYZ"
  },
  "tier": { ... },
  "available_rewards": [ ... ]
}

# Get transaction history
GET /store/customers/me/loyalty?include_history=true

# Preview points redemption
GET /store/cart/:id/loyalty/preview?points=500
Response: {
  "points_to_redeem": 500,
  "discount_amount": 5.00,
  "remaining_balance": 800
}

# Apply points to cart
POST /store/cart/:id/loyalty/apply
{ "points": 500 }

# Remove points from cart
DELETE /store/cart/:id/loyalty
```

---

## Tier System

### Default Tiers

| Tier | Min Spend | Points Multiplier | Perks |
|------|-----------|-------------------|-------|
| Bronze | $0 | 1.0x | Base earning rate |
| Silver | $500 | 1.25x | Early access to sales |
| Gold | $1,500 | 1.5x | Free shipping, exclusive rewards |
| Platinum | $5,000 | 2.0x | VIP support, double points |

### Tier Progression

- Tiers are based on `lifetime_value` (total spend)
- Automatic upgrade check after each order
- Tiers never downgrade

### Admin Tier API

```bash
# List all tiers
GET /admin/loyalty/tiers

# Create tier
POST /admin/loyalty/tiers
{
  "name": "Diamond",
  "min_spend": 10000,
  "points_multiplier": 2.5,
  "perks": ["VIP Support", "Triple Points Events"],
  "is_default": false
}

# Update tier
PUT /admin/loyalty/tiers/:id

# Delete tier
DELETE /admin/loyalty/tiers/:id
```

---

## Referral Program

### How It Works

1. Customer gets unique referral code: `REF-ABC123-XYZ`
2. Customer shares link: `https://store.com?ref=REF-ABC123-XYZ`
3. Friend clicks link → cookie set for 30 days
4. Friend creates account → pending referral created
5. Friend places first order → both get bonus points

### Store API - Referrals

```bash
# Get referral info
GET /store/customers/me/referral
Response: {
  "referral_code": "REF-ABC123-XYZ",
  "share_url": "https://store.com?ref=REF-ABC123-XYZ",
  "referrer_bonus": 500,
  "referee_bonus": 100,
  "total_referrals": 5,
  "pending_referrals": 2,
  "completed_referrals": 3
}

# Apply referral code (manual entry)
POST /store/customers/me/referral
{ "referral_code": "REF-XYZ789-ABC" }

# Validate referral code (public)
GET /store/referral/validate/:code
Response: {
  "valid": true,
  "referrer_first_name": "John",
  "referee_bonus": 100
}
```

---

## Rewards Catalog

### Reward Types

| Type | Description |
|------|-------------|
| `discount_fixed` | Fixed amount off (e.g., $10 off) |
| `discount_percent` | Percentage off (e.g., 20% off) |
| `free_shipping` | Free shipping on order |
| `free_product` | Free product added to order |

### Store API - Rewards

```bash
# List available rewards
GET /store/customers/me/loyalty/rewards
Response: {
  "rewards": [
    {
      "id": "...",
      "name": "$10 Off",
      "description": "Get $10 off your next order",
      "points_required": 1000,
      "reward_type": "discount_fixed",
      "reward_value": 10,
      "is_available": true
    }
  ]
}

# Redeem a reward
POST /store/customers/me/loyalty/rewards
{ "reward_id": "reward_123" }
Response: {
  "customer_reward": {
    "id": "...",
    "code": "REWARD-ABC123",
    "status": "available",
    "expires_at": "2025-03-18T00:00:00Z"
  }
}

# Get my redeemed rewards
GET /store/customers/me/loyalty/wallet
```

### Admin Rewards API

```bash
# List all rewards
GET /admin/loyalty/rewards

# Create reward
POST /admin/loyalty/rewards
{
  "name": "Free Shipping",
  "description": "Free shipping on any order",
  "points_required": 500,
  "reward_type": "free_shipping",
  "is_active": true,
  "usage_limit": 100,
  "min_tier_id": null
}

# Update reward
PUT /admin/loyalty/rewards/:id

# Delete reward
DELETE /admin/loyalty/rewards/:id
```

---

## Admin Management

### Customer Management

```bash
# Get customer loyalty details
GET /admin/loyalty/customers/:id
Response: {
  "account": { ... },
  "tier": { ... },
  "recent_transactions": [ ... ],
  "referral_stats": { ... }
}

# Adjust customer points (admin override)
POST /admin/loyalty/customers/:id/adjust
{
  "points": 500,
  "type": "bonus",
  "description": "Compensation for delayed order"
}
# Use negative points to deduct
```

### Program Statistics

```bash
# Get loyalty program stats
GET /admin/loyalty/stats
Response: {
  "total_accounts": 1500,
  "total_points_issued": 500000,
  "total_points_redeemed": 150000,
  "active_points": 350000,
  "tier_distribution": {
    "Bronze": 800,
    "Silver": 400,
    "Gold": 200,
    "Platinum": 100
  },
  "referral_stats": {
    "total_referrals": 250,
    "completed_referrals": 180,
    "pending_referrals": 70
  }
}
```

---

## Birthday Rewards

```bash
# Set birthday (customer)
PUT /store/customers/me/loyalty/birthday
{ "birthday": "1990-05-15" }

# Claim birthday bonus (once per year)
POST /store/customers/me/loyalty/birthday
Response: {
  "success": true,
  "points_awarded": 100,
  "message": "Happy Birthday! 100 points added to your account."
}
```

---

## Database Models

### LoyaltyAccount
- `id`, `customer_id`, `tier_id`
- `total_points_earned`, `total_points_redeemed`, `current_balance`
- `lifetime_value`, `referral_code`
- `birthday`, `last_birthday_reward_year`

### LoyaltyPoint (Transaction)
- `id`, `account_id`, `points`, `type`
- `description`, `reference_type`, `reference_id`
- `expires_at`, `created_at`

### LoyaltyTier
- `id`, `name`, `min_spend`, `points_multiplier`
- `perks` (JSON array), `is_default`

### LoyaltyReward
- `id`, `name`, `description`, `points_required`
- `reward_type`, `reward_value`, `is_active`
- `usage_limit`, `times_redeemed`, `min_tier_id`

### LoyaltyReferral
- `id`, `referrer_account_id`, `referee_account_id`
- `status` (pending, completed, expired)
- `expires_at`, `completed_at`

### LoyaltyCustomerReward
- `id`, `account_id`, `reward_id`
- `code`, `status` (available, used, expired)
- `expires_at`, `used_at`

---

## Workflows & Subscribers

### Order Placed Flow
1. `order.placed` event triggers `handleOrderPointsWorkflow`
2. Calculate points: `order_total × points_per_dollar × tier_multiplier`
3. Add points to customer account
4. Check for tier upgrade
5. Complete any pending referrals
6. Deactivate used tier discount promotion

### Customer Created Flow
1. `customer.created` event triggers subscriber
2. Award `signup_bonus` points (if configured)
3. Check for referral cookie
4. If referred, create pending referral record

---

## Integration Notes

### Checkout Integration
The storefront should:
1. Show points balance on cart page
2. Allow points redemption before checkout
3. Display potential points to earn
4. Show tier progress bar

### Notification Hooks
Configure notifications at `/admin/loyalty/notifications`:
- `points_earned` - When customer earns points
- `tier_upgrade` - When customer reaches new tier
- `reward_redeemed` - When customer redeems a reward
- `referral_complete` - When referral bonus is awarded

# Telemedicine Compliance Module

## Overview

The Telemedicine Compliance module manages patient establishment requirements for telemedicine services. It handles regional compliance rules, controlled substance requirements, and synchronous consultation workflows.

This is a **white-label feature** with configurable options for different client requirements.

---

## Core Concepts

### Patient Establishment

A patient is "established" in a region once they have completed the required synchronous consultation (video call). Once established:

- The patient can purchase **all products** in that region without additional consultations
- Establishment is **per-region**, not per-product
- Establishment can be **indefinite** or **time-based** (configurable)

### Compliance Triggers

Requirements are triggered by:

1. **Region Rules** - Some states require video consultation before establishing a patient relationship
2. **Controlled Substances** - Products marked as controlled substances may require consultation regardless of region

### Post-Checkout Workflow

Compliance evaluation happens **after checkout**, not before. This allows:

- Capturing the sale immediately
- Creating urgency (customer has paid, needs to complete requirements)
- Nurturing customers through the compliance process
- Flexibility in fulfillment timing

---

## Data Models

### CustomerRegionEstablishment

Tracks whether a customer is established in a specific region.

```typescript
interface CustomerRegionEstablishment {
  id: string
  customer_id: string
  region_code: string  // "US-TX", "US-CA", "US-FL", etc.

  // Status
  established: boolean
  established_at: Date

  // Expiration
  expires_at?: Date  // null = indefinite (never expires)

  // Fulfillment tracking
  fulfillment_source: "consultation_product" | "emr_video_call" | "manual" | "webhook"
  fulfillment_reference_id?: string  // Order ID, EMR appointment ID, etc.

  // Audit
  created_at: Date
  updated_at: Date
}
```

### RegionComplianceRule

Configures compliance requirements per region.

```typescript
interface RegionComplianceRule {
  id: string
  region_code: string           // ISO region code: "US-TX"
  region_name: string           // Display name: "Texas"
  country_code: string          // "US"

  // Requirements
  requires_establishment: boolean  // Does this region require consultation?

  // Expiration override (optional)
  establishment_expiration_days?: number  // null = use global setting

  // Status
  active: boolean

  // Flexibility for future rules
  metadata?: Record<string, any>

  created_at: Date
  updated_at: Date
}
```

### ComplianceConfiguration

Global compliance settings (white-label configurable).

```typescript
interface ComplianceConfiguration {
  id: string

  // Expiration settings
  establishment_expiration_days?: number  // null = indefinite

  // Order behavior
  hold_orders_until_established: boolean  // Hold fulfillment until established?

  // Controlled substance behavior
  controlled_substance_requires_consultation: boolean

  // Products that can fulfill establishment
  consultation_product_ids: string[]

  created_at: Date
  updated_at: Date
}
```

### Product Compliance Metadata

Extension to product model for compliance settings.

```typescript
interface ProductComplianceMetadata {
  // Controlled substance classification
  controlled_substance: "none" | "schedule_ii" | "schedule_iii" | "schedule_iv" | "schedule_v"

  // Override: always require consultation regardless of region/schedule
  requires_synchronous_consultation: boolean

  // Specific consultation product for this therapy (optional)
  consultation_product_id?: string

  // Flag: this product CAN fulfill establishment requirements
  is_consultation_product: boolean
}
```

---

## Configuration Options

### Global Settings

| Setting | Options | Description |
|---------|---------|-------------|
| `establishment_expiration_days` | Number or null | How long establishment lasts. Null = indefinite |
| `hold_orders_until_established` | Boolean | Whether to hold order fulfillment until customer is established |
| `controlled_substance_requires_consultation` | Boolean | Whether controlled substances require consultation |
| `consultation_product_ids` | String[] | Products that fulfill establishment when purchased |

### Per-Region Settings

| Setting | Options | Description |
|---------|---------|-------------|
| `requires_establishment` | Boolean | Whether this region requires consultation |
| `establishment_expiration_days` | Number or null | Override global expiration for this region |
| `active` | Boolean | Enable/disable rule |

### Per-Product Settings

| Setting | Options | Description |
|---------|---------|-------------|
| `controlled_substance` | none, schedule_ii-v | DEA schedule classification |
| `requires_synchronous_consultation` | Boolean | Override: always require consultation |
| `is_consultation_product` | Boolean | This product fulfills establishment |

---

## Workflows

### Post-Checkout Compliance Evaluation

```
Order Placed
    │
    ▼
┌─────────────────────────────────────┐
│ Evaluate Order Items                │
│ • Check each product's controlled   │
│   substance status                  │
│ • Check customer's shipping region  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Check Region Rules                  │
│ • Does region require establishment?│
│ • Is customer already established?  │
│ • Has establishment expired?        │
└─────────────────────────────────────┘
    │
    ├─── Customer IS established ───▶ Continue normal fulfillment
    │
    ▼ Customer NOT established
┌─────────────────────────────────────┐
│ Create Compliance Requirement       │
│ • Record pending requirement        │
│ • Optionally hold order             │
│ • Trigger notifications             │
│ • Sync to EMR                       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Await Fulfillment                   │
│ • Digital product purchase          │
│ • EMR video call webhook            │
│ • Manual admin fulfillment          │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Establishment Complete              │
│ • Update CustomerRegionEstablishment│
│ • Fire webhook events               │
│ • Release held orders               │
│ • Send confirmation notifications   │
└─────────────────────────────────────┘
```

### Fulfillment Sources

Establishment can be fulfilled by multiple sources:

1. **Digital Product Purchase** - Customer purchases a consultation product
2. **EMR Video Call** - EMR system sends webhook when video call completes
3. **Manual Admin** - Admin manually marks customer as established
4. **External Webhook** - Third-party system triggers fulfillment

---

## API Endpoints

### Store API (Customer-Facing)

```
GET  /store/customers/me/compliance/status
     Returns customer's compliance status for their region

GET  /store/customers/me/compliance/requirements
     Returns pending compliance requirements

GET  /store/compliance/region/:regionCode
     Returns compliance rules for a region (public info)
```

### Admin API

```
GET    /admin/compliance/configuration
PUT    /admin/compliance/configuration
       Manage global compliance settings

GET    /admin/compliance/regions
POST   /admin/compliance/regions
PUT    /admin/compliance/regions/:id
DELETE /admin/compliance/regions/:id
       Manage region compliance rules

GET    /admin/compliance/customers/:customerId/status
POST   /admin/compliance/customers/:customerId/establish
       View and manually establish customers

GET    /admin/compliance/customers/:customerId/history
       View establishment history and audit trail
```

### Webhook Endpoints (Incoming)

```
POST /webhooks/emr/video-call-completed
     Receive video call completion from EMR

POST /webhooks/compliance/establish
     Generic endpoint for external systems to trigger establishment
```

---

## Events & Webhooks

### Outgoing Events

| Event | Description | Payload |
|-------|-------------|---------|
| `compliance.requirement_created` | New requirement triggered | customer_id, region, reason, order_id |
| `compliance.establishment_fulfilled` | Customer established in region | customer_id, region, source, expires_at |
| `compliance.establishment_expired` | Establishment expired | customer_id, region, expired_at |
| `compliance.establishment_renewed` | Establishment renewed | customer_id, region, new_expires_at |

### Incoming Webhooks

| Endpoint | Source | Purpose |
|----------|--------|---------|
| `/webhooks/emr/video-call-completed` | EMR System | Mark customer established after video call |
| `/webhooks/compliance/establish` | External | Generic fulfillment trigger |

---

## Frontend Integration

### Customer Dashboard Components

```tsx
// Compliance status banner
<ComplianceBanner />
// Shows if customer has pending requirements

// Compliance requirements list
<ComplianceRequirements />
// Lists what customer needs to complete

// Establishment status
<EstablishmentStatus region="US-TX" />
// Shows if customer is established in region
```

### Order Status Integration

Orders with pending compliance requirements should display:

- Warning banner explaining requirement
- Link to schedule/purchase consultation
- Status updates as requirement progresses

### Continuous Prompts

When customer has pending requirements:

- Dashboard banner prompts
- Order history notifications
- Email/SMS reminders
- Redirects to compliance flow when accessing restricted content

---

## Admin UI

### Compliance Settings Screen

Configure global compliance behavior:

- Establishment expiration (indefinite or time-based)
- Order hold behavior
- Controlled substance settings
- Consultation product selection

### Region Rules Manager

Manage per-region compliance requirements:

- Add/edit/delete region rules
- Enable/disable regions
- Override expiration per region

### Customer Compliance View

For customer service and manual operations:

- View customer's establishment status by region
- View compliance history and audit trail
- Manually establish/revoke establishment
- Add notes to compliance records

### Product Compliance Settings

In product edit screen:

- Controlled substance dropdown (None, Schedule II-V)
- Override consultation requirement checkbox
- Mark as consultation product checkbox

---

## Security Considerations

### Webhook Security

- All incoming webhooks must be signed with HMAC
- Verify webhook signatures before processing
- Log all webhook deliveries for audit
- Rate limit webhook endpoints

### Data Privacy

- Compliance data is PHI (Protected Health Information)
- Apply appropriate access controls
- Audit all access to compliance records
- Encrypt sensitive fields at rest

### Admin Access

- Require elevated permissions for manual establishment
- Log all admin actions on compliance records
- Two-factor authentication recommended for compliance admins

---

## Module Structure

```
src/modules/telemedicine-compliance/
├── models/
│   ├── customer-region-establishment.ts
│   ├── region-compliance-rule.ts
│   ├── compliance-configuration.ts
│   └── compliance-audit-log.ts
├── service.ts
├── subscribers/
│   ├── order-placed.ts
│   ├── digital-product-delivered.ts
│   └── customer-address-changed.ts
├── api/
│   ├── store/
│   │   ├── compliance-status.ts
│   │   └── requirements.ts
│   └── admin/
│       ├── configuration.ts
│       ├── region-rules.ts
│       └── customer-compliance.ts
├── webhooks/
│   ├── incoming/
│   │   └── emr.ts
│   └── handlers/
│       └── fulfillment.ts
├── migrations/
│   └── create-compliance-tables.ts
└── index.ts
```

---

## Future Considerations

- **Multiple requirement types** - Beyond consultation (ID verification, prescription review, etc.)
- **Compliance reporting** - Analytics on establishment rates, fulfillment times
- **Automated reminders** - Scheduled notifications for pending requirements
- **Expiration warnings** - Notify customers before establishment expires
- **Bulk operations** - Admin tools for bulk establishment updates

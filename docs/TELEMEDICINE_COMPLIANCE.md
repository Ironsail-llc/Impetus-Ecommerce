# Telemedicine Compliance Module

## Overview

The **Telemedicine Compliance** module (`src/modules/telemedicine-compliance`) manages the regulatory requirements for selling restricted products. It enforces a **"Customer + Region = Established"** logic, where a customer must be established (via consultation) in their region to purchase specific products.

## Core Logic: Establishment

- **Scope**: Customer + Region (e.g., `cus_123` + `US-TX`).
- **Effect**: Once established in a region, the customer is established for **ALL** products in that region.
- **Expiration**: Controlled by `expires_at` field (nullable for indefinite).

## Data Models

### 1. CustomerRegionEstablishment
**Location**: `src/modules/telemedicine-compliance/models/customer-region-establishment.ts`

Tracks the establishment status of a customer in a specific region.

```typescript
interface CustomerRegionEstablishment {
  id: string
  store_id: string
  customer_id: string
  region_code: string  // e.g., "US-TX", "US-CA"

  // Status
  established: boolean
  established_at: Date | null

  // Expiration
  expires_at: Date | null  // null = indefinite

  // Origin
  fulfillment_source: "consultation_product" | "emr_video_call" | "manual" | "webhook"
  fulfillment_reference_id: string | null   // e.g. order_id, appointment_id
  fulfillment_reference_type: string | null // e.g. "order", "emr_appointment"
  
  metadata: Record<string, any>
}
```

### 2. ComplianceConfiguration
**Location**: `src/modules/telemedicine-compliance/models/compliance-configuration.ts`

Global settings are stored as key-value pairs (using a `setConfig` pattern) but mapped to categories like:
- **expiration**: `establishment_expiration_days`
- **orders**: `hold_orders_until_established`
- **products**: `controlled_substance_requires_consultation`, `consultation_product_ids`

---

## API Reference

### Admin Endpoints

#### Configuration
- **GET /admin/compliance/configuration**: Retrieve all settings.
- **PUT /admin/compliance/configuration**: Update settings.
  ```json
  {
    "updates": {
      "establishment_expiration_days": 365,
      "hold_orders_until_established": true
    }
  }
  ```

#### Regions
- **GET /admin/compliance/regions**: List region rules.
- **POST /admin/compliance/regions**: Create/Update region rules.

#### Customers
- **GET /admin/compliance/customers/:id**: Get status and establishment history for a customer.

### Store Endpoints

- **GET /store/compliance/status**: Check current customer's establishment status in their region.

---

## Integration with Product Compliance

The module works in tandem with the **Product Compliance** module (`src/modules/product-compliance`), which extends the Product model.

### ProductControlledSubstance Model
**Location**: `src/modules/product-compliance/models/product-controlled-substance.ts`

| Field | Type | Description |
|-------|------|-------------|
| `controlled_substance` | Enum | `none`, `schedule_ii`...`schedule_v` |
| `requires_synchronous_consultation` | Boolean | Force consultation regardless of other rules |
| `is_consultation_product` | Boolean | If true, purchasing this product fulfills establishment |
| `consultation_product_id` | String | Links to a specific required consultation product |

---

## Webhooks & Events

### Incoming (EMR -> Us)
- **Endpoint**: `/webhooks/emr/video-call-completed`
- **Action**: Creates `CustomerRegionEstablishment` via `fulfillment_source: "emr_video_call"`.

### Outgoing (Us -> Subscribers)
- `compliance.requirement_created`: When an order needs an establishment check.
- `compliance.establishment_fulfilled`: When a customer is successfully established.

---

## Module Structure

```text
src/modules/telemedicine-compliance/
├── models/
│   ├── customer-region-establishment.ts
│   └── compliance-configuration.ts
├── service.ts       # Core logic
├── index.ts
└── migrations/

src/modules/product-compliance/
├── models/
│   └── product-controlled-substance.ts
└── service.ts
```

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

## User Interface

### Admin Dashboard
**Routes**:
- `/admin/compliance`: Main dashboard.
- `/admin/compliance/regions`: Region rules management.
- `/admin/compliance/configuration`: Global settings.
- `/admin/compliance/customers/[id]`: Customer specific compliance view.

### Storefront Components
**Location**: `src/lib/data/compliance.ts` (Data Layer)
- **Compliance Banner**: Alerts users to missing requirements.
- **Status Badge**: Shows "Established" or "Action Required".
- **My Requirements**: Account page section for managing compliance.

---

## Integration Tests
**Location**: `integration-tests/http/compliance.spec.ts`
Covers key user stories:
1.  Admin configuring rules.
2.  Customer checking status.
3.  System enforcing holds/blocks.

Run via: `npm run test:integration -- --testPathPattern=compliance`

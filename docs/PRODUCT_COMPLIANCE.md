# Product Compliance Module

## Overview

The **Product Compliance** module (`src/modules/product-compliance`) extends the core Medusa Product via `ProductControlledSubstance` to add regulatory metadata.

## Data Model

### ProductControlledSubstance
**Location**: `src/modules/product-compliance/models/product-controlled-substance.ts`

This model allows tagging products with DEA schedules and telemedicine workflow flags.

```typescript
interface ProductControlledSubstance {
  id: string
  store_id: string
  
  // Classification
  controlled_substance: "none" | "schedule_ii" | "schedule_iii" | "schedule_iv" | "schedule_v"

  // Workflow Flags
  requires_synchronous_consultation: boolean // Always require live consult
  is_consultation_product: boolean           // This product IS a consult (fulfills requirement)
  consultation_product_id: string | null     // This product REQUIRES buying this consult ID
  
  metadata: Record<string, any>
}
```

## Relationship

It is linked to the core `Product` entity via a **One-to-One** relationship managed by the Medusa Module Linker.

## Usage

1.  **Marking Controls**: Admin sets `controlled_substance` to "schedule_iii".
2.  **Consultation Products**: Admin marks a "Video Visit" product as `is_consultation_product = true`.
3.  **Requirements**: The `telemedicine-compliance` module checks these flags during `order.placed` to determine if `CustomerRegionEstablishment` is required.

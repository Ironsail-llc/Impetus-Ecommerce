# Patient Access & Gating System

## Overview

Impetus E-commerce creates a strict distinction between general visitors and verified patients. This 3-tier access model is crucial for regulatory compliance (e.g., selling prescription medications) and business logic.

## Access Tiers

1.  **Visitor**: Unauthenticated user. Can browse public pages but sees limited product details.
2.  **User**: Authenticated account holder (Customer). Can see standard products but not restricted RX products.
3.  **Patient**: Authenticated customer who has been medically verified by Impetus One. Has full access to all products, including RX.

---

## Technical Implementation

### 1. "Patients" Customer Group

The core mechanism for gating is the **Patients** customer group in Medusa.

*   **Group Name**: "Patients"
*   **Metadata**: `is_vip: true` (used for frontend logic)
*   **Creation**: Automatically created via seed script (`src/scripts/seed-gating.ts`) if it doesn't exist.

### 2. "Restricted" Product Tag

Products that require a prescription must be tagged.

*   **Tag Value**: "Restricted"
*   **Effect**: Products with this tag are hidden from all users *except* those in the "Patients" group.
*   **Management**: Admin users can toggle this status using the "Restricted Access" widget on the product details page (`src/admin/widgets/product-restricted-switcher.tsx`).

### 3. Verification Flow (Impetus One Integration)

A customer becomes a "Patient" via an external webhook event from the Impetus One medical platform.

**Endpoint**: `POST /webhooks/impetus-one`

**Payload**:
```json
{
  "email": "customer@example.com",
  "status": "verified",
  "internal_id": "imp_12345"
}
```

**Process**:
1.  Impetus One verifies the patient medically.
2.  Webhook is sent to E-commerce backend.
3.  Backend workflow (`addCustomerToGroupWorkflow`) looks up customer by email.
4.  Customer is added to the "Patients" group.
5.  Customer now has access to restricted products.

---

## Configuration & Usage

### Seeding Data
To initialize the group and a test restricted product:
```bash
npx medusa exec ./src/scripts/seed-gating.ts
```

### Admin Widget
In the Medusa Admin > Product Details:
*   Look for the **Restricted Access** card in the sidebar.
*   Toggle "Restricted" on/off.
*   "Restricted" = Only Patients can view/buy.
*   "Public" = Everyone sees it.

---

## Frontend Considerations

The storefront implementation (Next.js) handles the visualization:
*   **Middleware/Context**: Checks `customer.groups` for `id` matching the "Patients" group.
*   **Price Gating**: Prices may be hidden for non-logged-in users.
*   **Product Hiding**: Restricted products are filtered out of PLP (Product Listing Pages) and Search results for non-patients.
*   **Redirects**: Direct access to a restricted PDP (Product Detail Page) by a non-patient redirects to a "Get Prescribed" landing page.

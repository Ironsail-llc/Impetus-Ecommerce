# NMI Payment Integration

## Overview

Impetus E-commerce integrates with **NMI (Network Merchants Inc.)** to provide secure credit card processing. The integration supports authorization, capture, refunds, and voids, designed with multi-tenancy in mind.

---

## Features

*   **Payment Actions**:
    *   **Authorize**: Reserve funds on customer's card.
    *   **Capture**: Finalize transaction and take funds (upon fulfillment).
    *   **Refund**: Return funds to customer.
    *   **Void**: Cancel a pending authorization.
*   **Tokenization**: Uses NMI "Collect.js" (or similar client-side tokenization) to ensure PCI compliance. Raw card data never hits the backend.
*   **Webhooks**: Listens for NMI events (e.g., `transaction.captured`) to sync status if actions happen outside the platform.

---

## Configuration

The integration supports both **Global** (single merchant) and **Store-specific** (multi-tenant) credentials.

### 1. Global Setup (`.env`)

For a single-store deployment, set credentials in environment variables:

```bash
# Backend .env
NMI_SECURITY_KEY=security-key-from-nmi-portal

# Storefront .env.local
NEXT_PUBLIC_NMI_PUBLIC_KEY=public-key-from-nmi-portal
```

*   **Security Key**: Private API key for backend-to-NMI communication (`src/modules/nmi-payment/service.ts`).
*   **Public Key**: Public key for frontend tokenization forms.

### 2. Multi-Tenant Setup

For platforms hosting multiple clients (stores) on one backend, credentials can be overridden per store.

**Mechanism**:
*   The `NmiPaymentProvider` service checks the current `store_id`.
*   It looks up the **Store Metadata**.
*   If `store.metadata.nmi_security_key` exists, it uses that instead of the global env var.

**Admin Configuration**:
1.  Go to Medusa Admin > Settings > Stores (or via API).
2.  Edit Store metadata to include:
    *   `nmi_security_key`: "client-specific-key"
    *   `nmi_public_key`: "client-specific-public-key" (returned to frontend context)

---

## Technical Details

### Service: `NmiPaymentProvider`
*   **Location**: `src/modules/nmi-payment/service.ts`
*   **Identifier**: `nmi`
*   **API Endpoint**: `https://secure.nmi.com/api/transact.php`

### Flow
1.  **Initiate**: Frontend requests payment session. Backend creates NMI session placeholder.
2.  **Tokenize**: Frontend uses Public Key to convert card # to a `payment_token`.
3.  **Authorize**: Frontend sends `payment_token` to backend `authorizePayment`.
4.  **Transaction**: Backend posts `type: auth`, `payment_token`, and `amount` to NMI.
5.  **Response**: NMI returns `transactionid`. Backend saves this to `payment_session.data`.

### Webhook Handling
The module listens for normalized event names if configured via the core Webhooks module, allowing external NMI updates to reflect in the order status.

---

## Debugging

*   **Logs**: Check backend logs for `[Store: <id>] NMI request failed`.
*   **NMI Portal**: Log in to NMI Dashboard > Transaction Reports to cross-reference `transactionid` or error codes.
*   **Common Errors**:
    *   `Invalid Security Key`: Check env vars or store metadata.
    *   `Duplicate Transaction`: NMI blocks identical amounts within short windows (use distinct testing amounts).

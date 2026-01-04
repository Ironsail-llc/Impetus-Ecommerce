# Multi-Tenancy Guide

## Overview

Impetus E-commerce is architected to support **Multi-Tenancy** (White Labeling). This means a single backend instance can serve multiple distinct "Stores" (Tenants), each with its own branding, products, orders, and configuration.

---

## Architecture

### The "Store" Entity
In Medusa, the **Store** is the root entity for tenency.
*   **Single-Tenant Mode**: One default Store exists.
*   **Multi-Tenant Mode**: Multiple Stores exist. All resources (Products, Orders, Customers) are linked to a specific `store_id`.

### Request Context
*   **Storefront**: Sends a `x-publishable-api-key` or similar identifier that maps to a `store_id`.
*   **Backend**: Middleware resolves the `store_id` and filters all DB queries to ensure **Data Isolation**. A request for Store A cannot see Store B's orders.

---

## Configuration & Overrides

While the backend code is shared, behavior can be customized per tenant using **Metadata** and **Configuration Injection**.

### 1. Payment Providers (NMI Example)
Instead of hardcoding one NMI key, the `NmiPaymentProvider` service dynamically checks:
1.  Is there a `store_id` in the context?
2.  Does this Store have `nmi_security_key` in its metadata?
3.  **Yes**: Use Store key.
4.  **No**: Fallback to global `process.env.NMI_SECURITY_KEY`.

This allows a platform model where the platform owner has a default gateway, but enterprise clients use their own merchant accounts.

### 2. Fulfillment Providers
Similar logic applies to shipping. Store-specific carrier accounts (FedEx, UPS) can be stored in Metadata and utilized by the fulfillment modules.

### 3. Frontend Branding
The Storefront application handles visual "skinning":
*   The Storefront detects the hostname (e.g., `client-a.com` vs `client-b.com`).
*   Fetches public store settings (Logo, Colors) from the backend Store API.
*   Applies a dynamic theme.

---

## Deployment Strategy

For a full White-Label deployment, you have two options:

### Option A: Shared Backend (True Multi-Tenant)
*   **1 Backend Deployment**: Serves `api.platform.com`
*   **N Storefront Deployments**: `shop.client-a.com`, `shop.client-b.com`
*   **Pros**: Efficient, single maintenance point.
*   **Cons**: Higher risk (one bug breaks all), strict data isolation required.

### Option B: Isolated Instances (Managed Hosting)
*   **N Backend Deployments**: `api.client-a.com`, `api.client-b.com`
*   **N Storefront Deployments**: `shop.client-a.com`, `shop.client-b.com`
*   **Pros**: Complete isolation, zero data leakage risk, easy custom code per client.
*   **Cons**: Operational overhead (updating N instances).

**Impetus E-commerce currently supports BOTH**, but defaults to **Option B** for Enterprise clients requiring strict HIPAA/Data sovereignty.

---

## Developer Guidelines

When adding new modules:
1.  **Always use `scope`**: Ensure `store_id` is passed to all workflows and services.
2.  **Avoid Global State**: Do not rely solely on `process.env` for tenant-variable configs (keys, secrets, emails).
3.  **Test Isolation**: Verify that creating a product in Store A does not make it appear in Store B.

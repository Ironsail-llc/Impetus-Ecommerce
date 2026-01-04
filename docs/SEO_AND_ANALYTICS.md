# SEO & Analytics

## Overview

In the headless architecture of Impetus E-commerce, **SEO and Analytics are primarily Storefront concerns**. The backend's role is to provide structured, rich data via APIs to allow the frontend to render optimized meta tags and tracking pixels.

---

## Search Engine Optimization (SEO)

### Backend Role
The Medusa backend provides the following SEO-relevant data:
*   **Handles**: URL-friendly slugs for Products, Collections, and Categories (e.g., `/products/restricted-rx-10mg`).
*   **Metadata**: Title, Description, and Thumbnail images.
*   **Structured Data**: Product attributes (Price, SKU, Availability) mapped to JSON-LD schemas.

### Frontend Implementation (Next.js)
The storefront uses `next/head` or the Metadata API to render:
*   `<title>`: From Product Title.
*   `<meta name="description">`: From Product Description.
*   `<link rel="canonical">`: To prevent duplicate content issues.
*   **Robots Control**: Logic to `noindex` restricted pages (e.g., Patient-only products) to prevent them from appearing in public search results.

---

## Analytics & Tracking

### 1. Google Analytics 4 (GA4) & Meta Pixel
These are client-side integrations.
*   **Configuration**: Add Measurement IDs to the **Storefront** environment variables (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FB_PIXEL_ID`).
*   **Events**:
    *   `view_item` (Product Page)
    *   `add_to_cart`
    *   `begin_checkout`
    *   `purchase`

### 2. Server-Side Tracking (CAPI)
For higher accuracy (bypassing ad-blockers), you can implement Server-Side APIs.
*   **Conversion API (CAPI)**: Can be implemented in a Medusa Subscriber (listing to `order.placed`), sending a direct HTTP request to Facebook/Google APIs.
*   Currently, this is **not enabled by default** but the architecture supports it via the `src/subscribers` directory.

---

## Best Practices

1.  **Restricted Products**: Ensure that "Restricted" products (for Patients only) are strictly set to `noindex`. You do not want prescription drugs appearing in Google Shopping feeds without proper gating.
2.  **Sitemaps**: The storefront should generate a `sitemap.xml` by querying the `store/products` API (filtering out restricted items).
3.  **Performance**: Optimize image delivery (handled by Medusa's file API + Next.js Image Optimization) to improve Core Web Vitals.

# Bundled Products System

A product bundling system for Impetus E-commerce that allows creating product bundles with multiple items sold together.

## Features

- **Product Bundles** - Group multiple products into a single purchasable bundle
- **Bundle Items** - Each item has configurable quantity
- **Linked Products** - Bundle linked to a sellable product variant
- **Storefront API** - Browse bundles with full product details

---

## How Bundles Work

A bundle consists of:
1. **Bundle Product** - The main product customers purchase (e.g., "Starter Kit")
2. **Bundle Items** - Individual products included in the bundle with quantities

```
Bundle: "Fitness Starter Kit" ($99.99)
├── Item: Yoga Mat (qty: 1)
├── Item: Resistance Bands (qty: 3)
└── Item: Water Bottle (qty: 1)
```

Customers purchase the bundle product, and the included items are what they receive.

---

## Database Models

### Bundle
- `id` - Unique identifier
- `title` - Bundle name
- `description` - Bundle description
- `items` - Related bundle items
- `product` - Linked product (via module link)

### BundleItem
- `id` - Unique identifier
- `quantity` - Number of this product in bundle (default: 1)
- `bundle` - Parent bundle
- `product` - Linked product (via module link)

---

## Admin API

### List Bundles

```bash
GET /admin/bundles
Authorization: Bearer <admin_token>
```

Query Parameters:
- `offset` - Pagination offset (default: 0)
- `limit` - Items per page (default: 20)

Response:
```json
{
  "bundles": [
    {
      "id": "bundle_01ABC...",
      "title": "Fitness Starter Kit",
      "description": "Everything you need to start",
      "product": {
        "id": "prod_01XYZ...",
        "title": "Fitness Starter Kit",
        "variants": [...]
      },
      "items": [
        {
          "id": "item_01...",
          "quantity": 1,
          "product": {
            "id": "prod_02...",
            "title": "Yoga Mat"
          }
        }
      ]
    }
  ],
  "count": 5,
  "offset": 0,
  "limit": 20
}
```

### Create Bundle

```bash
POST /admin/bundles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Fitness Starter Kit",
  "description": "Everything you need to get started",
  "product": {
    "title": "Fitness Starter Kit",
    "status": "published",
    "options": [
      { "title": "Size", "values": ["Standard"] }
    ],
    "variants": [
      {
        "title": "Standard",
        "prices": [
          { "amount": 9999, "currency_code": "usd" }
        ],
        "options": { "Size": "Standard" }
      }
    ]
  },
  "items": [
    { "product_id": "prod_yoga_mat", "quantity": 1 },
    { "product_id": "prod_bands", "quantity": 3 },
    { "product_id": "prod_bottle", "quantity": 1 }
  ]
}
```

Response:
```json
{
  "bundle": {
    "id": "bundle_01ABC...",
    "title": "Fitness Starter Kit",
    "items": [...]
  }
}
```

### Get Bundle

```bash
GET /admin/bundles/:id
Authorization: Bearer <admin_token>
```

### Update Bundle

```bash
PUT /admin/bundles/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Updated Bundle Name",
  "description": "Updated description"
}
```

### Delete Bundle

```bash
DELETE /admin/bundles/:id
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "id": "bundle_01ABC...",
  "deleted": true
}
```

---

## Store API

### List Bundles (Storefront)

```bash
GET /store/bundles
```

Returns bundles with full product details including:
- Bundle product with variants and prices
- All bundle items with their product details
- Product images

Query Parameters:
- `offset` - Pagination offset (default: 0)
- `limit` - Items per page (default: 20)

Response:
```json
{
  "bundles": [
    {
      "id": "bundle_01ABC...",
      "title": "Fitness Starter Kit",
      "description": "Everything you need",
      "product": {
        "id": "prod_01XYZ...",
        "title": "Fitness Starter Kit",
        "variants": [
          {
            "id": "var_01...",
            "prices": [
              { "amount": 9999, "currency_code": "usd" }
            ]
          }
        ],
        "images": [...]
      },
      "items": [
        {
          "id": "item_01...",
          "quantity": 1,
          "product": {
            "id": "prod_02...",
            "title": "Yoga Mat",
            "variants": [...],
            "images": [...]
          }
        }
      ]
    }
  ],
  "count": 5,
  "offset": 0,
  "limit": 20
}
```

### Get Single Bundle

```bash
GET /store/bundles/:id
```

---

## Module Links

The bundle system uses Medusa module links to connect bundles with products:

### Bundle → Product Link
Links the bundle itself to a sellable product:
```typescript
// src/links/bundle-product.ts
defineLink(
  BundledProductModule.linkable.bundle,
  ProductModule.linkable.product
)
```

### BundleItem → Product Link
Links each bundle item to its included product:
```typescript
// src/links/bundle-item-product.ts
defineLink(
  BundledProductModule.linkable.bundleItem,
  ProductModule.linkable.product
)
```

---

## Workflow

Bundle creation uses a workflow that:
1. Creates the bundle record
2. Creates bundle items
3. Creates the bundle product (if provided)
4. Links bundle to product
5. Links each item to its product

---

## Storefront Integration

### Displaying Bundles

```tsx
// Example React component
function BundleCard({ bundle }) {
  const bundlePrice = bundle.product.variants[0].prices[0];
  const itemsValue = bundle.items.reduce((total, item) => {
    const price = item.product.variants[0].prices[0].amount;
    return total + (price * item.quantity);
  }, 0);
  const savings = itemsValue - bundlePrice.amount;

  return (
    <div className="bundle-card">
      <h2>{bundle.title}</h2>
      <p>{bundle.description}</p>

      <div className="bundle-items">
        <h3>Includes:</h3>
        {bundle.items.map(item => (
          <div key={item.id}>
            {item.quantity}x {item.product.title}
          </div>
        ))}
      </div>

      <div className="pricing">
        <span className="bundle-price">
          ${(bundlePrice.amount / 100).toFixed(2)}
        </span>
        {savings > 0 && (
          <span className="savings">
            Save ${(savings / 100).toFixed(2)}!
          </span>
        )}
      </div>

      <button onClick={() => addToCart(bundle.product.variants[0].id)}>
        Add Bundle to Cart
      </button>
    </div>
  );
}
```

### Adding to Cart

Add the bundle's product variant to cart like any other product:

```bash
POST /store/carts/:id/line-items
{
  "variant_id": "bundle_variant_id",
  "quantity": 1
}
```

---

## Best Practices

1. **Price Bundles Attractively** - Bundles should offer savings vs buying items separately
2. **Clear Descriptions** - List what's included in the bundle description
3. **Quality Images** - Show all included items in bundle product images
4. **Inventory Management** - Monitor stock of bundled items to avoid overselling

---

## Configuration

The bundled product module is registered in `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "./src/modules/bundled-product",
  },
]
```

# Digital Products System

A complete digital product delivery system for Impetus E-commerce that enables selling and delivering downloadable files like ebooks, software, music, videos, and other digital content.

## Features

- **Digital Product Management** - Create and manage downloadable products
- **Media Files** - Attach multiple files (main + preview) to products
- **Secure Downloads** - Customers can only download products they've purchased
- **Preview Files** - Optional preview/sample files for product pages
- **Order Tracking** - Track digital product delivery status
- **Custom Fulfillment** - Digital fulfillment provider (no shipping needed)

---

## How It Works

1. **Admin creates digital product** with uploaded files
2. **Product linked to variant** for sale on storefront
3. **Customer purchases** the product variant
4. **Order completed** creates digital product order record
5. **Customer downloads** files from their account

```
Admin uploads files → Creates digital product → Links to variant
                                                      ↓
Customer purchases variant → Order placed → Digital order created
                                                      ↓
Customer views purchases → Downloads files (secure URL)
```

---

## Database Models

### DigitalProduct
- `id` - Unique identifier
- `name` - Product name
- `medias` - Attached media files
- `orders` - Associated digital orders
- `product_variant` - Linked variant (via module link)

### DigitalProductMedia
- `id` - Unique identifier
- `type` - Media type: `main` or `preview`
- `fileId` - Reference to uploaded file in File module
- `mimeType` - File MIME type (e.g., "application/pdf")
- `digitalProduct` - Parent digital product

### DigitalProductOrder
- `id` - Unique identifier
- `status` - Order status: `pending` or `sent`
- `products` - Digital products in this order
- `order` - Linked Medusa order (via module link)

---

## Media Types

| Type | Description | Access |
|------|-------------|--------|
| `main` | The actual product file(s) | Purchased customers only |
| `preview` | Sample/preview file | Public (for product pages) |

---

## Admin API

### List Digital Products

```bash
GET /admin/digital-products
Authorization: Bearer <admin_token>
```

Query Parameters:
- `offset` - Pagination offset (default: 0)
- `limit` - Items per page (default: 20)

Response:
```json
{
  "digital_products": [
    {
      "id": "digi_01ABC...",
      "name": "Complete JavaScript Course",
      "medias": [
        {
          "id": "media_01...",
          "type": "main",
          "fileId": "file_abc123",
          "mimeType": "application/zip"
        },
        {
          "id": "media_02...",
          "type": "preview",
          "fileId": "file_xyz789",
          "mimeType": "application/pdf"
        }
      ],
      "product_variant": {
        "id": "var_01...",
        "title": "Digital Download"
      }
    }
  ],
  "count": 10,
  "limit": 20,
  "offset": 0
}
```

### Create Digital Product

```bash
POST /admin/digital-products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Complete JavaScript Course",
  "medias": [
    {
      "type": "main",
      "file_id": "file_abc123",
      "mime_type": "application/zip"
    },
    {
      "type": "preview",
      "file_id": "file_xyz789",
      "mime_type": "application/pdf"
    }
  ],
  "product": {
    "title": "Complete JavaScript Course",
    "status": "published",
    "options": [
      { "title": "Format", "values": ["Digital Download"] }
    ],
    "variants": [
      {
        "title": "Digital Download",
        "prices": [
          { "amount": 4999, "currency_code": "usd" }
        ],
        "options": { "Format": "Digital Download" },
        "manage_inventory": false
      }
    ]
  }
}
```

Response:
```json
{
  "digital_product": {
    "id": "digi_01ABC...",
    "name": "Complete JavaScript Course",
    "medias": [...]
  }
}
```

### Upload Media File

```bash
POST /admin/digital-products/upload/:type
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

file: <binary>
```

Where `:type` is `main` or `preview`.

Response:
```json
{
  "file": {
    "id": "file_abc123",
    "url": "https://storage.example.com/...",
    "mime_type": "application/pdf"
  }
}
```

### Get Digital Product

```bash
GET /admin/digital-products/:id
Authorization: Bearer <admin_token>
```

### Update Digital Product

```bash
PUT /admin/digital-products/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Product Name"
}
```

### Delete Digital Product

```bash
DELETE /admin/digital-products/:id
Authorization: Bearer <admin_token>
```

---

## Store API

### Get My Digital Products

Returns all digital products the customer has purchased.

```bash
GET /store/customers/me/digital-products
Authorization: Bearer <customer_token>
```

Response:
```json
{
  "digital_products": [
    {
      "id": "digi_01ABC...",
      "name": "Complete JavaScript Course",
      "medias": [
        {
          "id": "media_01...",
          "type": "main",
          "fileId": "file_abc123",
          "mimeType": "application/zip"
        }
      ]
    }
  ]
}
```

### Download File

Get a secure download URL for a purchased file.

```bash
POST /store/customers/me/digital-products/:mediaId/download
Authorization: Bearer <customer_token>
```

Response:
```json
{
  "url": "https://storage.example.com/signed-url..."
}
```

**Security:** Only returns URL if customer has purchased the product containing this media.

### Get Preview File (Public)

Get the preview file for a digital product (for product pages).

```bash
GET /store/digital-products/:id/preview
```

Response:
```json
{
  "preview": {
    "id": "media_02...",
    "url": "https://storage.example.com/preview..."
  }
}
```

### Complete Digital Order

Called after checkout to create the digital product order.

```bash
POST /store/carts/:id/complete-digital
```

---

## Module Links

### DigitalProduct → ProductVariant
Links digital products to their sellable variant:
```typescript
// src/links/digital-product-variant.ts
defineLink(
  DigitalProductModule.linkable.digitalProduct,
  ProductModule.linkable.productVariant
)
```

### DigitalProductOrder → Order
Links digital orders to Medusa orders:
```typescript
// src/links/digital-product-order.ts
defineLink(
  DigitalProductModule.linkable.digitalProductOrder,
  OrderModule.linkable.order
)
```

---

## Fulfillment Provider

Digital products use a custom fulfillment provider that handles "delivery" without shipping:

```typescript
// src/modules/digital-product-fulfillment/service.ts
class DigitalProductFulfillmentService {
  static identifier = "digital"

  async getFulfillmentOptions() {
    return [{ id: "digital-fulfillment" }]
  }

  async createFulfillment() {
    // No physical shipment needed
    return { data: {}, labels: [] }
  }
}
```

Configured in `medusa-config.ts`:
```typescript
{
  resolve: "@medusajs/medusa/fulfillment",
  options: {
    providers: [
      {
        resolve: "./src/modules/digital-product-fulfillment",
        id: "digital",
      },
    ],
  },
}
```

---

## Storefront Integration

### Product Page with Preview

```tsx
function DigitalProductPage({ product, digitalProduct }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // Fetch preview file
    fetch(`/store/digital-products/${digitalProduct.id}/preview`)
      .then(res => res.json())
      .then(data => setPreviewUrl(data.preview?.url));
  }, []);

  return (
    <div>
      <h1>{product.title}</h1>
      <p>{product.description}</p>

      {previewUrl && (
        <div className="preview">
          <h3>Preview Sample</h3>
          <a href={previewUrl} target="_blank">
            View Sample PDF
          </a>
        </div>
      )}

      <button onClick={() => addToCart(product.variants[0].id)}>
        Buy Now - ${product.variants[0].prices[0].amount / 100}
      </button>
    </div>
  );
}
```

### Customer Downloads Page

```tsx
function MyDownloads() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/store/customers/me/digital-products', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setProducts(data.digital_products));
  }, []);

  const handleDownload = async (mediaId) => {
    const res = await fetch(
      `/store/customers/me/digital-products/${mediaId}/download`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const { url } = await res.json();
    window.open(url, '_blank');
  };

  return (
    <div>
      <h1>My Downloads</h1>
      {products.map(product => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          {product.medias
            .filter(m => m.type === 'main')
            .map(media => (
              <button
                key={media.id}
                onClick={() => handleDownload(media.id)}
              >
                Download ({media.mimeType})
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
```

---

## Order Status Flow

```
Customer purchases → Order placed → status: "pending"
                          ↓
         Order completed/fulfilled → status: "sent"
                          ↓
          Customer can download files
```

---

## Best Practices

1. **File Security** - Use signed URLs with expiration for downloads
2. **Preview Files** - Always provide a preview/sample for customers
3. **Clear Naming** - Use descriptive product names and media types
4. **Multiple Formats** - Consider offering multiple file formats (PDF, EPUB, etc.)
5. **Download Limits** - Consider implementing download count limits
6. **Email Notifications** - Send download links via email after purchase

---

## Configuration

The digital product modules are registered in `medusa-config.ts`:

```typescript
modules: [
  {
    resolve: "./src/modules/digital-product",
  },
  {
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [
        {
          resolve: "./src/modules/digital-product-fulfillment",
          id: "digital",
        },
      ],
    },
  },
]
```

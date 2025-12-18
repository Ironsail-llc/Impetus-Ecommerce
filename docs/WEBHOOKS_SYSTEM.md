# Webhooks System

A production-ready webhook delivery system for Impetus E-commerce with HMAC signing, automatic retries, and full delivery tracking.

## Features

- **HMAC-SHA256 Signatures** - Secure payload verification
- **Automatic Retries** - Exponential backoff with jitter
- **Delivery Tracking** - Full audit trail of all attempts
- **Dead Letter Queue** - Failed deliveries preserved for review
- **Per-Endpoint Configuration** - Custom retry limits, timeouts, headers

---

## Supported Events

| Event | Description |
|-------|-------------|
| `order.placed` | Order successfully placed |
| `order.completed` | Order fulfilled and completed |
| `order.canceled` | Order canceled |
| `customer.created` | New customer registered |
| `customer.updated` | Customer profile updated |
| `webhook.test` | Manual test webhook |

---

## Quick Start

### 1. Create a Webhook Endpoint

```bash
POST /admin/webhooks
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Order Notifications",
  "url": "https://your-service.com/webhooks/orders",
  "events": ["order.placed", "order.completed"],
  "description": "Send order events to fulfillment system",
  "max_retries": 5,
  "timeout_ms": 10000
}
```

Response:
```json
{
  "endpoint": {
    "id": "01ABC123...",
    "name": "Order Notifications",
    "url": "https://your-service.com/webhooks/orders",
    "secret": "whsec_abc123def456...",
    "events": ["order.placed", "order.completed"],
    "is_active": true,
    "max_retries": 5,
    "timeout_ms": 10000
  },
  "message": "Webhook endpoint created successfully"
}
```

**Save the `secret`** - You'll need it to verify webhook signatures.

### 2. Test Your Endpoint

```bash
POST /admin/webhooks/:id/test
Authorization: Bearer <admin_token>
```

This sends a test payload to verify your endpoint is working.

---

## Webhook Payload Format

All webhooks are sent as POST requests with JSON body:

```json
{
  "id": "evt_01ABC123...",
  "type": "order.placed",
  "created_at": "2025-12-18T20:00:00.000Z",
  "api_version": "2025-01",
  "data": {
    "object": {
      "id": "order_01XYZ...",
      "display_id": 1001,
      "customer_id": "cus_01ABC...",
      "email": "customer@example.com",
      "total": 9999,
      "currency_code": "usd",
      "items": [...],
      "shipping_address": {...}
    }
  },
  "metadata": {
    "source": "medusa",
    "store_id": "impetus_main",
    "environment": "production"
  }
}
```

---

## Security Headers

Every webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `X-Medusa-Signature` | HMAC-SHA256 signature of payload |
| `X-Medusa-Timestamp` | Unix timestamp (ms) when sent |
| `X-Medusa-Event` | Event type (e.g., "order.placed") |
| `X-Medusa-Delivery-Id` | Unique delivery ID for idempotency |
| `Content-Type` | `application/json` |

### Verifying Signatures

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,      // Raw request body
  signature: string,    // X-Medusa-Signature header
  secret: string,       // Your endpoint secret
  timestamp: string     // X-Medusa-Timestamp header
): boolean {
  // Recreate the signed payload
  const signedPayload = `${timestamp}.${payload}`;

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express.js example
app.post('/webhooks/orders', (req, res) => {
  const signature = req.headers['x-medusa-signature'];
  const timestamp = req.headers['x-medusa-timestamp'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET, timestamp)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the webhook...
  const event = req.body;
  console.log(`Received ${event.type} event`);

  res.status(200).json({ received: true });
});
```

### Timestamp Validation

To prevent replay attacks, also validate the timestamp:

```typescript
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function isTimestampValid(timestamp: string): boolean {
  const webhookTime = parseInt(timestamp, 10);
  const now = Date.now();
  return Math.abs(now - webhookTime) < MAX_AGE_MS;
}
```

---

## Retry Behavior

Failed deliveries are automatically retried with exponential backoff:

| Attempt | Delay | Cumulative Time |
|---------|-------|-----------------|
| 1 | Immediate | 0 |
| 2 | ~1 second | ~1s |
| 3 | ~5 minutes | ~5m |
| 4 | ~30 minutes | ~35m |
| 5 | ~1 hour | ~1h 35m |
| 6 | ~2 hours | ~3h 35m |
| ... | ... | ... |

### Retry Conditions

**Will Retry:**
- HTTP 5xx errors (server errors)
- Network timeouts
- Connection refused

**Will NOT Retry:**
- HTTP 2xx (success)
- HTTP 4xx (client errors - bad request, unauthorized, etc.)

After max retries, the delivery moves to **dead letter queue** for manual review.

---

## Admin API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/webhooks` | List all endpoints with stats |
| POST | `/admin/webhooks` | Create new endpoint |
| GET | `/admin/webhooks/:id` | Get endpoint details |
| PUT | `/admin/webhooks/:id` | Update endpoint |
| DELETE | `/admin/webhooks/:id` | Delete endpoint |
| POST | `/admin/webhooks/:id/test` | Send test webhook |
| POST | `/admin/webhooks/:id/rotate-secret` | Generate new secret |
| GET | `/admin/webhooks/:id/deliveries` | Endpoint delivery history |

### Deliveries

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/webhooks/deliveries` | List all deliveries |
| GET | `/admin/webhooks/deliveries/:id` | Delivery details + attempts |
| DELETE | `/admin/webhooks/deliveries/:id` | Remove from dead letter queue |
| POST | `/admin/webhooks/deliveries/:id/retry` | Manual retry |

### Query Parameters

```bash
# Filter deliveries
GET /admin/webhooks/deliveries?status=failed&event_type=order.placed&limit=20

# Status values: pending, processing, success, failed, dead_letter
```

---

## Example: List Endpoints with Stats

```bash
GET /admin/webhooks
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "endpoints": [
    {
      "id": "01ABC123...",
      "name": "Order Notifications",
      "url": "https://your-service.com/webhooks/orders",
      "secret": "...abc123",
      "events": ["order.placed", "order.completed"],
      "is_active": true,
      "last_triggered_at": "2025-12-18T20:00:00.000Z",
      "stats": {
        "total": 150,
        "successful": 145,
        "failed": 5,
        "successRate": 96.67,
        "avgResponseTime": 234
      }
    }
  ]
}
```

---

## Example: View Failed Delivery

```bash
GET /admin/webhooks/deliveries/01DEF456
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "delivery": {
    "id": "01DEF456...",
    "endpoint_id": "01ABC123...",
    "endpoint_name": "Order Notifications",
    "endpoint_url": "https://your-service.com/webhooks/orders",
    "event_type": "order.placed",
    "status": "dead_letter",
    "attempts": 5,
    "response_status": 500,
    "response_body": "{\"error\":\"Internal server error\"}",
    "error_message": "HTTP 500 - max retries exceeded",
    "payload": { ... }
  },
  "attempts": [
    {
      "attempt_number": 1,
      "response_status": 500,
      "response_time_ms": 1234,
      "error_message": "HTTP 500",
      "attempted_at": "2025-12-18T20:00:00.000Z"
    },
    // ... more attempts
  ]
}
```

---

## Rotating Secrets

If you need to rotate a webhook secret:

```bash
POST /admin/webhooks/:id/rotate-secret
Authorization: Bearer <admin_token>
```

Response:
```json
{
  "secret": "whsec_newSecret123...",
  "message": "Secret rotated successfully. Update your endpoint with this new secret."
}
```

**Important:** Update your receiving endpoint immediately after rotating, as the old secret becomes invalid.

---

## Best Practices

### For Receiving Webhooks

1. **Respond quickly** - Return 200 within 5 seconds, process async
2. **Verify signatures** - Always validate HMAC signatures
3. **Handle duplicates** - Use `X-Medusa-Delivery-Id` for idempotency
4. **Log everything** - Store raw payloads for debugging

### For Endpoint Configuration

1. **Use HTTPS** - Always use secure URLs
2. **Set reasonable timeouts** - 10-30 seconds recommended
3. **Monitor dead letter queue** - Review failed deliveries regularly
4. **Rotate secrets periodically** - Every 90 days recommended

---

## Database Schema

### WebhookEndpoint
- `id`, `name`, `url`, `secret`
- `events` (JSON array)
- `is_active`, `headers` (custom headers)
- `max_retries`, `timeout_ms`
- `total_deliveries`, `successful_deliveries`, `failed_deliveries`
- `last_triggered_at`

### WebhookDelivery
- `id`, `endpoint_id`, `event_type`
- `payload`, `payload_hash`
- `status` (pending, processing, success, failed, dead_letter)
- `attempts`, `max_attempts`, `next_retry_at`
- `response_status`, `response_body`, `response_time_ms`
- `error_message`, `error_category`
- `idempotency_key`

### WebhookDeliveryAttempt
- `id`, `delivery_id`, `attempt_number`
- `request_url`, `request_headers`
- `response_status`, `response_headers`, `response_body`
- `response_time_ms`, `success`
- `error_message`, `error_type`
- `attempted_at`

---

## Troubleshooting

### Webhook not triggering
1. Check endpoint `is_active` is true
2. Verify event type is in endpoint's `events` array
3. Check server logs for subscriber errors

### Signature verification failing
1. Ensure you're using the raw request body (not parsed JSON)
2. Check timestamp is included in signed payload
3. Verify secret matches exactly (no extra whitespace)

### All deliveries failing
1. Check endpoint URL is accessible from server
2. Verify SSL certificate is valid
3. Check firewall rules allow outbound HTTPS
4. Review response body in delivery details

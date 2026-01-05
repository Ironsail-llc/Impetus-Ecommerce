# Webhooks Module

## Overview

The Webhooks module provides a robust, application-wide infrastructure for sending and receiving webhooks. It enables real-time integration with external systems like EMR platforms, analytics tools, notification services, and third-party applications.

This is a **core infrastructure module** used by all other modules that need to communicate with external systems.

---

## Core Concepts

### Outgoing Webhooks

Events that occur in our system trigger webhooks to external subscribers:

- Order events (placed, paid, shipped, delivered)
- Customer events (created, updated)
- Compliance events (requirement created, establishment fulfilled)
- Product events (created, updated, inventory changed)

### Incoming Webhooks

External systems can send webhooks to our endpoints:

- EMR video call completions
- Payment processor callbacks
- Shipping carrier updates
- Third-party fulfillment notifications

### Webhook Subscriptions

External systems register subscriptions to receive specific events:

- Select which events to receive
- Configure retry policies
- Secure with HMAC signatures

---

## Data Models

### WebhookSubscription

Defines an external system's subscription to events.

```typescript
interface WebhookSubscription {
  id: string

  // Target endpoint
  url: string
  secret: string  // For HMAC signature generation

  // Events subscribed to
  events: string[]  // ["order.placed", "compliance.established", ...]

  // Configuration
  active: boolean
  retry_policy: "none" | "exponential" | "linear"
  max_retries: number  // Default: 5
  timeout_ms: number   // Default: 30000

  // Filtering (optional)
  filters?: {
    // Only send events matching these criteria
    region_codes?: string[]
    product_ids?: string[]
    customer_groups?: string[]
  }

  // Metadata
  name: string
  description?: string
  created_by: string

  created_at: Date
  updated_at: Date
}
```

### WebhookDelivery

Tracks individual webhook delivery attempts.

```typescript
interface WebhookDelivery {
  id: string
  subscription_id: string
  event_id: string
  event_type: string

  // Request
  url: string
  payload: Record<string, any>
  headers: Record<string, string>

  // Response
  status: "pending" | "delivered" | "failed" | "retrying"
  response_code?: number
  response_body?: string
  response_time_ms?: number

  // Retry tracking
  attempts: number
  next_retry_at?: Date
  last_error?: string

  // Timestamps
  created_at: Date
  delivered_at?: Date
}
```

### WebhookEvent

Represents an event that can trigger webhooks.

```typescript
interface WebhookEvent {
  id: string
  type: string  // "order.placed", "compliance.established"

  // Event data
  data: Record<string, any>

  // Context
  occurred_at: Date
  source_module: string
  source_action: string

  // Processing
  processed: boolean
  delivery_count: number

  created_at: Date
}
```

### IncomingWebhookLog

Audit log for received webhooks.

```typescript
interface IncomingWebhookLog {
  id: string

  // Source
  endpoint: string  // "/webhooks/emr/video-call-completed"
  source_ip: string
  source_identifier?: string  // EMR system ID, etc.

  // Request
  method: string
  headers: Record<string, string>
  payload: Record<string, any>

  // Validation
  signature_valid: boolean
  signature_header?: string

  // Processing
  status: "received" | "processed" | "rejected" | "error"
  processing_result?: Record<string, any>
  error_message?: string

  // Timestamps
  received_at: Date
  processed_at?: Date
}
```

---

## Event Types

### Order Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `order.placed` | New order created | Customer completes checkout |
| `order.paid` | Payment confirmed | Payment processor confirms |
| `order.processing` | Order being prepared | Fulfillment starts |
| `order.shipped` | Order shipped | Tracking number added |
| `order.delivered` | Order delivered | Carrier confirms delivery |
| `order.cancelled` | Order cancelled | Admin or customer cancels |
| `order.refunded` | Order refunded | Refund processed |

### Customer Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `customer.created` | New customer registered | Account creation |
| `customer.updated` | Customer info changed | Profile update |
| `customer.address_added` | New address added | Address book update |
| `customer.address_changed` | Address modified | Address edit |
| `customer.deleted` | Customer account deleted | Account deletion |

### Compliance Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `compliance.requirement_created` | New compliance requirement | Post-checkout evaluation |
| `compliance.establishment_fulfilled` | Customer established | Consultation completed |
| `compliance.establishment_expired` | Establishment expired | Time-based expiration |
| `compliance.establishment_revoked` | Establishment revoked | Admin action |

### Product Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `product.created` | New product added | Admin creates product |
| `product.updated` | Product modified | Admin updates product |
| `product.deleted` | Product removed | Admin deletes product |
| `product.inventory_updated` | Stock level changed | Inventory adjustment |
| `product.controlled_substance_changed` | Compliance status changed | Admin updates classification |

### Digital Product Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `digital_product.purchased` | Digital product bought | Checkout complete |
| `digital_product.delivered` | Access granted | Fulfillment complete |
| `digital_product.expired` | Access expired | Time-based expiration |

### Loyalty Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `loyalty.points_earned` | Points added | Purchase, referral, etc. |
| `loyalty.points_redeemed` | Points spent | Reward redemption |
| `loyalty.tier_changed` | Customer tier changed | Points threshold reached |
| `loyalty.reward_claimed` | Reward claimed | Customer claims reward |

---

## Webhook Payload Structure

### Standard Envelope

All webhook payloads follow this structure:

```typescript
interface WebhookPayload {
  // Unique event identifier
  id: string

  // Event type
  type: string

  // API version for payload format
  api_version: string  // "2024-01-01"

  // When event occurred
  created_at: string  // ISO 8601

  // Event-specific data
  data: Record<string, any>

  // Metadata
  metadata: {
    subscription_id: string
    delivery_attempt: number
    idempotency_key: string
  }
}
```

### Example Payloads

#### Order Placed

```json
{
  "id": "evt_01ABC123",
  "type": "order.placed",
  "api_version": "2024-01-01",
  "created_at": "2026-01-04T22:30:00Z",
  "data": {
    "order": {
      "id": "order_XYZ789",
      "display_id": 1234,
      "email": "customer@example.com",
      "customer_id": "cus_ABC456",
      "currency_code": "usd",
      "total": 15999,
      "subtotal": 14999,
      "tax_total": 1000,
      "shipping_total": 0,
      "items": [
        {
          "id": "item_001",
          "title": "Testosterone Therapy",
          "quantity": 1,
          "unit_price": 14999,
          "variant_id": "var_001",
          "product_id": "prod_001"
        }
      ],
      "shipping_address": {
        "first_name": "John",
        "last_name": "Doe",
        "address_1": "123 Main St",
        "city": "Austin",
        "province": "TX",
        "postal_code": "78701",
        "country_code": "US"
      },
      "created_at": "2026-01-04T22:30:00Z"
    }
  },
  "metadata": {
    "subscription_id": "ws_001",
    "delivery_attempt": 1,
    "idempotency_key": "order_XYZ789_placed"
  }
}
```

#### Compliance Establishment Fulfilled

```json
{
  "id": "evt_02DEF456",
  "type": "compliance.establishment_fulfilled",
  "api_version": "2024-01-01",
  "created_at": "2026-01-04T23:00:00Z",
  "data": {
    "customer_id": "cus_ABC456",
    "region_code": "US-TX",
    "region_name": "Texas",
    "establishment": {
      "id": "est_001",
      "established": true,
      "established_at": "2026-01-04T23:00:00Z",
      "expires_at": null,
      "fulfillment_source": "emr_video_call",
      "fulfillment_reference_id": "appt_EMR123"
    },
    "trigger": {
      "order_id": "order_XYZ789",
      "product_id": "prod_001",
      "reason": "controlled_substance"
    }
  },
  "metadata": {
    "subscription_id": "ws_002",
    "delivery_attempt": 1,
    "idempotency_key": "cus_ABC456_US-TX_established"
  }
}
```

---

## Security

### HMAC Signatures

All outgoing webhooks are signed using HMAC-SHA256:

```typescript
// Signature generation
const signature = crypto
  .createHmac('sha256', subscription.secret)
  .update(JSON.stringify(payload))
  .digest('hex')

// Header sent
headers['X-Webhook-Signature'] = `sha256=${signature}`
headers['X-Webhook-Timestamp'] = timestamp
```

### Signature Verification

Recipients should verify signatures:

```typescript
function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  )
}
```

### Incoming Webhook Validation

For incoming webhooks (e.g., from EMR):

1. Verify source IP against allowlist (optional)
2. Validate HMAC signature
3. Check timestamp to prevent replay attacks
4. Validate payload schema
5. Log all requests for audit

### Secret Management

- Secrets are generated using cryptographically secure random bytes
- Secrets are stored encrypted at rest
- Secrets can be rotated without downtime (support multiple active secrets)

---

## Retry Policy

### Exponential Backoff

Default retry schedule:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 8 hours |

After max retries, webhook is marked as failed.

### Retry Conditions

Webhooks are retried when:

- Connection timeout
- HTTP 5xx response
- HTTP 429 (rate limited)

Webhooks are NOT retried when:

- HTTP 2xx response (success)
- HTTP 4xx response (client error, except 429)
- Invalid URL
- Subscription inactive

---

## API Endpoints

### Admin API - Subscription Management

```
GET    /admin/webhooks/subscriptions
       List all webhook subscriptions

POST   /admin/webhooks/subscriptions
       Create new subscription

GET    /admin/webhooks/subscriptions/:id
       Get subscription details

PUT    /admin/webhooks/subscriptions/:id
       Update subscription

DELETE /admin/webhooks/subscriptions/:id
       Delete subscription

POST   /admin/webhooks/subscriptions/:id/rotate-secret
       Rotate subscription secret

POST   /admin/webhooks/subscriptions/:id/test
       Send test webhook to subscription
```

### Admin API - Delivery Management

```
GET    /admin/webhooks/deliveries
       List webhook deliveries (with filters)

GET    /admin/webhooks/deliveries/:id
       Get delivery details

POST   /admin/webhooks/deliveries/:id/retry
       Manually retry failed delivery
```

### Admin API - Event Types

```
GET    /admin/webhooks/event-types
       List all available event types with descriptions
```

### Incoming Webhook Endpoints

```
POST   /webhooks/emr/video-call-completed
       Receive video call completion from EMR

POST   /webhooks/emr/appointment-scheduled
       Receive appointment scheduling from EMR

POST   /webhooks/emr/patient-updated
       Receive patient updates from EMR

POST   /webhooks/shipping/:carrier/update
       Receive shipping updates from carriers

POST   /webhooks/payment/:provider/callback
       Receive payment callbacks
```

---

## Admin UI

### Webhooks Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Webhooks                                        │
├─────────────────────────────────────────────────────────────┤
│  Overview                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 5           │  │ 1,234       │  │ 99.2%       │         │
│  │ Subscriptions│  │ Deliveries  │  │ Success Rate│         │
│  │             │  │ (24h)       │  │ (24h)       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  [+ Add Webhook Subscription]                               │
└─────────────────────────────────────────────────────────────┘
```

### Subscription List

```
┌─────────────────────────────────────────────────────────────┐
│  Webhook Subscriptions                                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┬─────────────────────┬────────┬──────────┐ │
│  │ Name        │ URL                 │ Events │ Status   │ │
│  ├─────────────┼─────────────────────┼────────┼──────────┤ │
│  │ EMR Sync    │ emr.example.com/... │ 8      │ ● Active │ │
│  │ Analytics   │ analytics.io/...    │ 12     │ ● Active │ │
│  │ Slack       │ hooks.slack.com/... │ 3      │ ○ Paused │ │
│  └─────────────┴─────────────────────┴────────┴──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Subscription Detail

```
┌─────────────────────────────────────────────────────────────┐
│  EMR Sync                                         [Edit]    │
├─────────────────────────────────────────────────────────────┤
│  Status: ● Active                                           │
│  URL: https://emr.example.com/webhooks/impetus              │
│  Created: Jan 1, 2026 by admin@impetus.com                  │
│                                                             │
│  Events Subscribed (8)                                      │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ☑ order.placed                                         ││
│  │ ☑ order.shipped                                        ││
│  │ ☑ customer.created                                     ││
│  │ ☑ customer.updated                                     ││
│  │ ☑ compliance.requirement_created                       ││
│  │ ☑ compliance.establishment_fulfilled                   ││
│  │ ☑ compliance.establishment_expired                     ││
│  │ ☑ digital_product.delivered                            ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  Recent Deliveries                                          │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ✓ compliance.establishment_fulfilled  200  52ms  2m ago││
│  │ ✓ order.placed                        200  48ms  15m ago│
│  │ ✓ customer.created                    200  61ms  1h ago││
│  │ ✗ order.placed                        500  --    2h ago││
│  │   └─ [Retry] Failed after 3 attempts                   ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  [Test Webhook] [Rotate Secret] [Pause] [Delete]           │
└─────────────────────────────────────────────────────────────┘
```

### Delivery Log

```
┌─────────────────────────────────────────────────────────────┐
│  Webhook Deliveries                                         │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All Subscriptions ▼] [All Events ▼] [24h ▼]     │
│           [All Statuses ▼]                                  │
│                                                             │
│  ┌──────┬────────────────────┬─────────┬──────┬──────────┐ │
│  │Status│ Event              │ Target  │ Code │ Time     │ │
│  ├──────┼────────────────────┼─────────┼──────┼──────────┤ │
│  │  ✓   │ order.placed       │ EMR     │ 200  │ 2m ago   │ │
│  │  ✓   │ order.placed       │ Analyt. │ 200  │ 2m ago   │ │
│  │  ⟳   │ order.shipped      │ Slack   │ 429  │ 5m ago   │ │
│  │  ✗   │ customer.created   │ EMR     │ 500  │ 1h ago   │ │
│  └──────┴────────────────────┴─────────┴──────┴──────────┘ │
│                                                             │
│  [Export CSV]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
src/modules/webhooks/
├── models/
│   ├── webhook-subscription.ts
│   ├── webhook-delivery.ts
│   ├── webhook-event.ts
│   └── incoming-webhook-log.ts
├── service.ts              # Core webhook service
├── sender.ts               # Outgoing webhook sender
├── receiver.ts             # Incoming webhook processor
├── signature.ts            # HMAC signature utilities
├── retry.ts                # Retry logic
├── api/
│   └── admin/
│       ├── subscriptions.ts
│       ├── deliveries.ts
│       └── event-types.ts
├── incoming/
│   ├── emr.ts              # EMR webhook handlers
│   ├── shipping.ts         # Shipping webhook handlers
│   └── payment.ts          # Payment webhook handlers
├── jobs/
│   ├── process-pending.ts  # Process pending deliveries
│   └── retry-failed.ts     # Retry failed deliveries
├── migrations/
│   └── create-webhook-tables.ts
└── index.ts
```

---

## Integration Guide

### Subscribing to Webhooks

1. **Register Subscription**
   - Create subscription via Admin UI or API
   - Select events to receive
   - Configure endpoint URL
   - Store the generated secret securely

2. **Implement Endpoint**
   - Create POST endpoint at your URL
   - Verify HMAC signature
   - Process payload
   - Return 200 for success

3. **Handle Retries**
   - Implement idempotency using `idempotency_key`
   - Return 200 even if already processed
   - Return 5xx to trigger retry

### Sending Webhooks to Us

1. **Contact Admin**
   - Request incoming webhook configuration
   - Receive endpoint URL and shared secret

2. **Implement Sender**
   - Sign payloads with HMAC-SHA256
   - Include signature in header
   - Include timestamp in header

3. **Handle Responses**
   - 200: Successfully processed
   - 400: Invalid payload or signature
   - 500: Server error, retry later

---

## Best Practices

### For Webhook Consumers

1. **Verify Signatures** - Always verify HMAC signatures before processing
2. **Implement Idempotency** - Handle duplicate deliveries gracefully
3. **Respond Quickly** - Return 200 within 30 seconds, process async if needed
4. **Log Everything** - Keep audit trail of received webhooks
5. **Handle Failures** - Implement your own retry logic for critical events

### For Webhook Producers

1. **Use Standard Events** - Follow naming conventions
2. **Include Context** - Provide enough data to avoid API callbacks
3. **Document Payloads** - Keep payload documentation up to date
4. **Version Payloads** - Include API version for backward compatibility
5. **Test Thoroughly** - Use test webhook feature before going live

---

## Monitoring & Alerts

### Metrics to Track

- Delivery success rate
- Average response time
- Retry queue depth
- Failed delivery count
- Events per minute

### Recommended Alerts

- Success rate drops below 95%
- Response time exceeds 5 seconds average
- Retry queue depth exceeds 1000
- Any subscription has >10 consecutive failures

---

## Future Considerations

- **Webhook versioning** - Multiple payload versions for backward compatibility
- **Event replay** - Ability to replay historical events
- **Batch webhooks** - Combine multiple events into single delivery
- **Webhook transforms** - Custom payload transformation per subscription
- **Dead letter queue** - Permanent storage for failed webhooks
- **GraphQL subscriptions** - Real-time alternative to webhooks

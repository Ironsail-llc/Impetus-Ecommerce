# Webhooks System

## Overview

A robust, platform-wide webhook infrastructure designed to handle both **incoming** (EMR -> Us) and **outgoing** (Us -> External) events. It features subscription management, reliable delivery with retries, and comprehensive audit logging.

## Core Concepts

### Webhook Subscription
Represents an external system's registration to receive events.

```typescript
interface WebhookSubscription {
    id: string

    // Target
    url: string
    secret: string  // Used for HMAC signing of payloads

    // Scope
    events: string[]  // e.g. ["order.placed", "compliance.established"]

    // Configuration
    active: boolean
    retry_policy: "none" | "exponential"
    max_retries: number

    // Metadata
    name: string      // e.g. "EMR Sync", "Klaviyo"
    description?: string
    created_by: string
}
```

### Webhook Delivery
An immutable record of a specific event dispatch attempt.

```typescript
interface WebhookDelivery {
    id: string
    subscription_id: string
    event_type: string

    // content
    payload: Record<string, any>

    // Status
    status: "pending" | "delivered" | "failed" | "retrying"
    response_code?: number
    response_body?: string

    // Retry Logic
    attempts: number
    next_retry_at?: Date
    
    delivered_at?: Date
    created_at: Date
}
```

---

## Architecture

### Outgoing Webhooks

**Payload Structure**
All outgoing webhooks follow a standardized envelope:

```json
{
  "id": "evt_abc123",
  "type": "compliance.establishment_fulfilled",
  "created_at": "2026-01-04T22:30:00Z",
  "data": {
    "customer_id": "cus_xyz",
    "region_code": "US-TX",
    "establishment": {
      "id": "est_456",
      "established": true
      // ...
    }
  },
  "metadata": {
    "api_version": "1.0",
    "webhook_subscription_id": "sub_789"
  }
}
```

**Event Types**
The system supports a wide range of events across domains:

| Domain | Event Type | Description |
|--------|------------|-------------|
| **Compliance** | `compliance.requirement_created` | validation needed |
| | `compliance.establishment_fulfilled` | user verified in region |
| | `compliance.establishment_expired` | verification lapsed |
| | `compliance.consultation_scheduled` | appointment booked |
| **Orders** | `order.placed` | new order created |
| | `order.paid` | payment captured |
| | `order.shipped` | fulfillment created |
| | `order.delivered` | shipment arrived |
| | `order.cancelled` | order voided |
| **Customer** | `customer.created` | new registration |
| | `customer.address_changed` | typically triggers region check |

### Incoming Webhooks

The system exposes endpoints for external partners (like EMRs) to push updates.

**Example: EMR Video Call Completion**

`POST /webhooks/emr/video-call-completed`

```json
{
  "event": "video_call.completed",
  "patient_external_id": "cus_xyz",
  "appointment_id": "appt_789",
  "provider_id": "dr_abc",
  "call_duration_minutes": 15,
  "completed_at": "2026-01-04T22:30:00Z"
}
```

**Processing Flow**:
1.  **Validate Signature**: Ensure authenticity.
2.  **Lookup**: Find customer by `patient_external_id`.
3.  **Region Logic**: Determine region from customer address.
4.  **Update**: Create or update `CustomerRegionEstablishment`.
5.  **Trigger**: Fire internal `compliance.establishment_fulfilled` event to notify downstream subscribers.

---

## File Structure

```text
src/modules/webhooks/
├── models/
│   ├── webhook-subscription.ts
│   └── webhook-delivery.ts
├── service.ts               # Dispatcher & Retry Logic
├── api/
│   └── admin/
│       └── subscriptions.ts # CRUD for subscriptions
└── index.ts
```

import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Checkbox,
  Badge,
  Table,
  Switch,
} from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft, ArrowPath, Key } from "@medusajs/icons"

const AVAILABLE_EVENTS = [
  { id: "order.placed", label: "Order Placed" },
  { id: "order.completed", label: "Order Completed" },
  { id: "order.canceled", label: "Order Canceled" },
  { id: "customer.created", label: "Customer Created" },
  { id: "customer.updated", label: "Customer Updated" },
]

type Delivery = {
  id: string
  event_type: string
  status: string
  attempts: number
  response_status?: number
  created_at: string
}

type Endpoint = {
  id: string
  name: string
  url: string
  secret: string
  description?: string
  events: string[]
  is_active: boolean
  max_retries: number
  timeout_ms: number
  total_deliveries: number
  successful_deliveries: number
  failed_deliveries: number
  last_triggered_at?: string
}

const WebhookDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    events: [] as string[],
    is_active: true,
    max_retries: 5,
    timeout_ms: 10000,
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [endpointRes, deliveriesRes] = await Promise.all([
        fetch(`/admin/webhooks/${id}`, { credentials: "include" }),
        fetch(`/admin/webhooks/${id}/deliveries?limit=10`, { credentials: "include" }),
      ])

      if (endpointRes.ok) {
        const data = await endpointRes.json()
        setEndpoint(data.endpoint)
        setFormData({
          name: data.endpoint.name,
          url: data.endpoint.url,
          description: data.endpoint.description || "",
          events: data.endpoint.events,
          is_active: data.endpoint.is_active,
          max_retries: data.endpoint.max_retries,
          timeout_ms: data.endpoint.timeout_ms,
        })
      }

      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json()
        setDeliveries(data.deliveries || [])
      }
    } catch (error) {
      console.error("Failed to fetch webhook:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventToggle = (eventId: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/admin/webhooks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert("Webhook updated successfully!")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to update webhook:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleRotateSecret = async () => {
    if (!confirm("Are you sure? The old secret will stop working immediately.")) return

    try {
      const response = await fetch(`/admin/webhooks/${id}/rotate-secret`, {
        method: "POST",
        credentials: "include",
      })
      const result = await response.json()
      if (response.ok) {
        alert(`New secret:\n${result.secret}\n\nSave this - you won't see it again!`)
        fetchData()
      }
    } catch (error) {
      console.error("Failed to rotate secret:", error)
    }
  }

  const handleTest = async () => {
    try {
      const response = await fetch(`/admin/webhooks/${id}/test`, {
        method: "POST",
        credentials: "include",
      })
      const result = await response.json()
      if (result.success) {
        alert("Test webhook sent successfully!")
        fetchData()
      } else {
        alert(`Test failed: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      alert("Failed to send test webhook")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "green"
      case "failed": return "red"
      case "dead_letter": return "red"
      case "pending": return "blue"
      case "processing": return "orange"
      default: return "grey"
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading webhook...</Text>
      </Container>
    )
  }

  if (!endpoint) {
    return (
      <Container className="p-8">
        <Text>Webhook not found</Text>
      </Container>
    )
  }

  const successRate = endpoint.total_deliveries > 0
    ? ((endpoint.successful_deliveries / endpoint.total_deliveries) * 100).toFixed(1)
    : "N/A"

  return (
    <Container className="p-8">
      <Link
        to="/webhooks"
        className="flex items-center gap-2 text-ui-fg-subtle hover:text-ui-fg-base mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Webhooks
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <Heading level="h1">{endpoint.name}</Heading>
          <Text className="text-ui-fg-subtle mt-1 font-mono text-sm">
            {endpoint.url}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleTest}>
            <ArrowPath className="mr-2" />
            Send Test
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Text className="text-ui-fg-subtle text-sm">Total Deliveries</Text>
          <Text className="text-2xl font-semibold">{endpoint.total_deliveries}</Text>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Text className="text-ui-fg-subtle text-sm">Successful</Text>
          <Text className="text-2xl font-semibold text-ui-tag-green-text">
            {endpoint.successful_deliveries}
          </Text>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Text className="text-ui-fg-subtle text-sm">Failed</Text>
          <Text className="text-2xl font-semibold text-ui-tag-red-text">
            {endpoint.failed_deliveries}
          </Text>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Text className="text-ui-fg-subtle text-sm">Success Rate</Text>
          <Text className="text-2xl font-semibold">{successRate}%</Text>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column - Settings */}
        <div className="col-span-2 space-y-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <Heading level="h2" className="mb-4">Settings</Heading>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Active</Label>
                  <Text className="text-ui-fg-subtle text-xs">
                    Enable or disable this endpoint
                  </Text>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_retries">Max Retries</Label>
                  <Input
                    id="max_retries"
                    type="number"
                    value={formData.max_retries}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_retries: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timeout_ms">Timeout (ms)</Label>
                  <Input
                    id="timeout_ms"
                    type="number"
                    value={formData.timeout_ms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeout_ms: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <Heading level="h2" className="mb-4">Subscribed Events</Heading>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_EVENTS.map((event) => (
                <div key={event.id} className="flex items-center gap-2">
                  <Checkbox
                    id={event.id}
                    checked={formData.events.includes(event.id)}
                    onCheckedChange={() => handleEventToggle(event.id)}
                  />
                  <Label htmlFor={event.id} className="cursor-pointer">
                    {event.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Deliveries */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h2">Recent Deliveries</Heading>
              <Link to={`/webhooks/deliveries?endpoint_id=${id}`}>
                <Button variant="secondary" size="small">View All</Button>
              </Link>
            </div>

            {deliveries.length === 0 ? (
              <Text className="text-ui-fg-subtle">No deliveries yet</Text>
            ) : (
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Event</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Attempts</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {deliveries.map((delivery) => (
                    <Table.Row key={delivery.id}>
                      <Table.Cell>
                        <Link
                          to={`/webhooks/deliveries/${delivery.id}`}
                          className="text-ui-fg-interactive hover:underline"
                        >
                          {delivery.event_type}
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge color={getStatusColor(delivery.status)} size="small">
                          {delivery.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>{delivery.attempts}</Table.Cell>
                      <Table.Cell>
                        <Text className="text-ui-fg-subtle text-sm">
                          {new Date(delivery.created_at).toLocaleString()}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}
          </div>
        </div>

        {/* Right column - Secret */}
        <div className="space-y-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5" />
              <Heading level="h2">Signing Secret</Heading>
            </div>

            <div className="bg-ui-bg-subtle rounded-lg p-3 mb-4">
              <Text className="font-mono text-sm break-all">
                {showSecret ? endpoint.secret : `${"•".repeat(20)}...${endpoint.secret.slice(-6)}`}
              </Text>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? "Hide" : "Reveal"}
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(endpoint.secret)
                  alert("Secret copied!")
                }}
              >
                Copy
              </Button>
            </div>

            <div className="border-t border-ui-border-base mt-4 pt-4">
              <Button
                variant="danger"
                size="small"
                onClick={handleRotateSecret}
                className="w-full"
              >
                Rotate Secret
              </Button>
              <Text className="text-ui-fg-subtle text-xs mt-2 text-center">
                This will invalidate the current secret
              </Text>
            </div>
          </div>

          {endpoint.last_triggered_at && (
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
              <Text className="text-ui-fg-subtle text-sm">Last Triggered</Text>
              <Text className="font-medium">
                {new Date(endpoint.last_triggered_at).toLocaleString()}
              </Text>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export default WebhookDetailsPage

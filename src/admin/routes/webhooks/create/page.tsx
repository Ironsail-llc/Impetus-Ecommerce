import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Checkbox,
  Textarea,
} from "@medusajs/ui"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "@medusajs/icons"
import { Link } from "react-router-dom"

const AVAILABLE_EVENTS = [
  { id: "order.placed", label: "Order Placed", description: "When a new order is created" },
  { id: "order.completed", label: "Order Completed", description: "When an order is fulfilled" },
  { id: "order.canceled", label: "Order Canceled", description: "When an order is canceled" },
  { id: "customer.created", label: "Customer Created", description: "When a new customer registers" },
  { id: "customer.updated", label: "Customer Updated", description: "When customer profile changes" },
]

const CreateWebhookPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    description: "",
    events: [] as string[],
    max_retries: 5,
    timeout_ms: 10000,
  })

  const handleEventToggle = (eventId: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Failed to create webhook")
      }

      // Show the secret to the user
      alert(
        `Webhook created successfully!\n\nSave this secret - you won't see it again:\n${result.endpoint.secret}`
      )

      navigate("/webhooks")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-8 max-w-2xl">
      <Link
        to="/webhooks"
        className="flex items-center gap-2 text-ui-fg-subtle hover:text-ui-fg-base mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Webhooks
      </Link>

      <Heading level="h1" className="mb-2">Create Webhook Endpoint</Heading>
      <Text className="text-ui-fg-subtle mb-6">
        Configure a new endpoint to receive event notifications
      </Text>

      {error && (
        <div className="bg-ui-tag-red-bg text-ui-tag-red-text p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Order Notifications"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>

        <div>
          <Label htmlFor="url">Endpoint URL</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://your-service.com/webhooks"
            value={formData.url}
            onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
            required
          />
          <Text className="text-ui-fg-subtle text-xs mt-1">
            Must be HTTPS for production use
          </Text>
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe what this webhook is used for..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        <div>
          <Label className="mb-3 block">Events to Subscribe</Label>
          <div className="space-y-3 border border-ui-border-base rounded-lg p-4">
            {AVAILABLE_EVENTS.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <Checkbox
                  id={event.id}
                  checked={formData.events.includes(event.id)}
                  onCheckedChange={() => handleEventToggle(event.id)}
                />
                <div>
                  <Label htmlFor={event.id} className="font-medium cursor-pointer">
                    {event.label}
                  </Label>
                  <Text className="text-ui-fg-subtle text-xs">{event.description}</Text>
                </div>
              </div>
            ))}
          </div>
          {formData.events.length === 0 && (
            <Text className="text-ui-tag-orange-text text-xs mt-2">
              Select at least one event
            </Text>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="max_retries">Max Retries</Label>
            <Input
              id="max_retries"
              type="number"
              min={0}
              max={10}
              value={formData.max_retries}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, max_retries: parseInt(e.target.value) }))
              }
            />
            <Text className="text-ui-fg-subtle text-xs mt-1">
              Number of retry attempts on failure
            </Text>
          </div>
          <div>
            <Label htmlFor="timeout_ms">Timeout (ms)</Label>
            <Input
              id="timeout_ms"
              type="number"
              min={1000}
              max={30000}
              step={1000}
              value={formData.timeout_ms}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timeout_ms: parseInt(e.target.value) }))
              }
            />
            <Text className="text-ui-fg-subtle text-xs mt-1">
              Request timeout in milliseconds
            </Text>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-ui-border-base">
          <Link to="/webhooks">
            <Button variant="secondary" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || formData.events.length === 0}
          >
            {loading ? "Creating..." : "Create Endpoint"}
          </Button>
        </div>
      </form>
    </Container>
  )
}

export default CreateWebhookPage

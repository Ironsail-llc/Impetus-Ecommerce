import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  CodeBlock,
} from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, ArrowPath } from "@medusajs/icons"

type Attempt = {
  id: string
  attempt_number: number
  response_status?: number
  response_time_ms?: number
  response_body?: string
  error_message?: string
  error_type?: string
  success: boolean
  attempted_at: string
}

type Delivery = {
  id: string
  endpoint_id: string
  endpoint_name?: string
  endpoint_url?: string
  event_type: string
  status: string
  attempts: number
  max_attempts: number
  response_status?: number
  response_body?: string
  error_message?: string
  payload: any
  created_at: string
  next_retry_at?: string
}

const DeliveryDetailsPage = () => {
  const { id } = useParams()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const response = await fetch(`/admin/webhooks/deliveries/${id}`, {
        credentials: "include",
      })
      const result = await response.json()
      setDelivery(result.delivery)
      setAttempts(result.attempts || [])
    } catch (error) {
      console.error("Failed to fetch delivery:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    try {
      const response = await fetch(`/admin/webhooks/deliveries/${id}/retry`, {
        method: "POST",
        credentials: "include",
      })
      if (response.ok) {
        alert("Retry queued successfully!")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to retry:", error)
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
        <Text>Loading delivery...</Text>
      </Container>
    )
  }

  if (!delivery) {
    return (
      <Container className="p-8">
        <Text>Delivery not found</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <Link
        to="/webhooks/deliveries"
        className="flex items-center gap-2 text-ui-fg-subtle hover:text-ui-fg-base mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deliveries
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Heading level="h1">{delivery.event_type}</Heading>
            <Badge color={getStatusColor(delivery.status)}>
              {delivery.status}
            </Badge>
          </div>
          <Text className="text-ui-fg-subtle mt-1">
            Delivery ID: {delivery.id}
          </Text>
        </div>
        {(delivery.status === "failed" || delivery.status === "dead_letter") && (
          <Button onClick={handleRetry}>
            <ArrowPath className="mr-2" />
            Retry Now
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Payload */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <Heading level="h2" className="mb-4">Payload</Heading>
            <div className="bg-ui-bg-subtle rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Attempts */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <Heading level="h2" className="mb-4">
              Delivery Attempts ({attempts.length})
            </Heading>

            {attempts.length === 0 ? (
              <Text className="text-ui-fg-subtle">No attempts yet</Text>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className={`border rounded-lg p-4 ${
                      attempt.success
                        ? "border-ui-tag-green-border bg-ui-tag-green-bg/10"
                        : "border-ui-tag-red-border bg-ui-tag-red-bg/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge color={attempt.success ? "green" : "red"}>
                          Attempt #{attempt.attempt_number}
                        </Badge>
                        {attempt.response_status && (
                          <Badge
                            color={attempt.response_status < 400 ? "green" : "red"}
                          >
                            HTTP {attempt.response_status}
                          </Badge>
                        )}
                        {attempt.response_time_ms && (
                          <Text className="text-ui-fg-subtle text-sm">
                            {attempt.response_time_ms}ms
                          </Text>
                        )}
                      </div>
                      <Text className="text-ui-fg-subtle text-sm">
                        {new Date(attempt.attempted_at).toLocaleString()}
                      </Text>
                    </div>

                    {attempt.error_message && (
                      <div className="mt-2">
                        <Text className="text-ui-tag-red-text text-sm font-medium">
                          {attempt.error_type}: {attempt.error_message}
                        </Text>
                      </div>
                    )}

                    {attempt.response_body && (
                      <div className="mt-2">
                        <Text className="text-ui-fg-subtle text-xs mb-1">Response:</Text>
                        <div className="bg-ui-bg-subtle rounded p-2 overflow-auto max-h-32">
                          <pre className="text-xs font-mono">
                            {attempt.response_body.slice(0, 500)}
                            {attempt.response_body.length > 500 && "..."}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <Heading level="h2" className="mb-4">Details</Heading>

            <div className="space-y-3">
              <div>
                <Text className="text-ui-fg-subtle text-sm">Endpoint</Text>
                <Link
                  to={`/webhooks/${delivery.endpoint_id}`}
                  className="text-ui-fg-interactive hover:underline"
                >
                  {delivery.endpoint_name || "View Endpoint"}
                </Link>
              </div>

              <div>
                <Text className="text-ui-fg-subtle text-sm">URL</Text>
                <Text className="font-mono text-sm break-all">
                  {delivery.endpoint_url}
                </Text>
              </div>

              <div>
                <Text className="text-ui-fg-subtle text-sm">Created</Text>
                <Text>{new Date(delivery.created_at).toLocaleString()}</Text>
              </div>

              <div>
                <Text className="text-ui-fg-subtle text-sm">Attempts</Text>
                <Text>
                  {delivery.attempts} / {delivery.max_attempts}
                </Text>
              </div>

              {delivery.next_retry_at && delivery.status !== "success" && (
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Next Retry</Text>
                  <Text>{new Date(delivery.next_retry_at).toLocaleString()}</Text>
                </div>
              )}

              {delivery.error_message && (
                <div>
                  <Text className="text-ui-fg-subtle text-sm">Last Error</Text>
                  <Text className="text-ui-tag-red-text text-sm">
                    {delivery.error_message}
                  </Text>
                </div>
              )}
            </div>
          </div>

          {/* Response */}
          {delivery.response_body && (
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
              <Heading level="h2" className="mb-4">Last Response</Heading>
              <Badge
                color={delivery.response_status && delivery.response_status < 400 ? "green" : "red"}
                className="mb-2"
              >
                HTTP {delivery.response_status}
              </Badge>
              <div className="bg-ui-bg-subtle rounded p-2 overflow-auto max-h-48">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {delivery.response_body}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}

export default DeliveryDetailsPage

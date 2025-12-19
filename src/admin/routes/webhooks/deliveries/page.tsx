import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  Select,
} from "@medusajs/ui"
import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowPath } from "@medusajs/icons"

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
  error_message?: string
  created_at: string
  next_retry_at?: string
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "dead_letter", label: "Dead Letter" },
]

const DeliveriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const status = searchParams.get("status") || ""
  const endpointId = searchParams.get("endpoint_id") || ""

  const fetchDeliveries = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set("status", status)
      if (endpointId) params.set("endpoint_id", endpointId)
      params.set("limit", "50")

      const response = await fetch(`/admin/webhooks/deliveries?${params}`, {
        credentials: "include",
      })
      const result = await response.json()
      setDeliveries(result.deliveries || [])
      setTotal(result.count || 0)
    } catch (error) {
      console.error("Failed to fetch deliveries:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [status, endpointId])

  const handleRetry = async (deliveryId: string) => {
    try {
      const response = await fetch(`/admin/webhooks/deliveries/${deliveryId}/retry`, {
        method: "POST",
        credentials: "include",
      })
      if (response.ok) {
        alert("Retry queued successfully!")
        fetchDeliveries()
      }
    } catch (error) {
      console.error("Failed to retry delivery:", error)
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

  return (
    <Container className="p-8">
      <Link
        to="/webhooks"
        className="flex items-center gap-2 text-ui-fg-subtle hover:text-ui-fg-base mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Webhooks
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Webhook Deliveries</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            {total} total deliveries
          </Text>
        </div>
        <Button variant="secondary" onClick={fetchDeliveries}>
          <ArrowPath className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="w-48">
          <Select
            value={status}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams)
              if (value) {
                params.set("status", value)
              } else {
                params.delete("status")
              }
              setSearchParams(params)
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Filter by status" />
            </Select.Trigger>
            <Select.Content>
              {STATUS_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>

        {endpointId && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              const params = new URLSearchParams(searchParams)
              params.delete("endpoint_id")
              setSearchParams(params)
            }}
          >
            Clear endpoint filter
          </Button>
        )}
      </div>

      {loading ? (
        <Text>Loading deliveries...</Text>
      ) : deliveries.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
          <Text className="text-ui-fg-subtle">
            No deliveries found
          </Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Event</Table.HeaderCell>
              <Table.HeaderCell>Endpoint</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Response</Table.HeaderCell>
              <Table.HeaderCell>Attempts</Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {deliveries.map((delivery) => (
              <Table.Row key={delivery.id}>
                <Table.Cell>
                  <Link
                    to={`/webhooks/deliveries/${delivery.id}`}
                    className="text-ui-fg-interactive hover:underline font-medium"
                  >
                    {delivery.event_type}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Link
                    to={`/webhooks/${delivery.endpoint_id}`}
                    className="text-ui-fg-subtle hover:underline text-sm"
                  >
                    {delivery.endpoint_name || delivery.endpoint_id.slice(0, 8)}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={getStatusColor(delivery.status)} size="small">
                    {delivery.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {delivery.response_status ? (
                    <Badge
                      color={delivery.response_status < 400 ? "green" : "red"}
                      size="small"
                    >
                      {delivery.response_status}
                    </Badge>
                  ) : delivery.error_message ? (
                    <Text className="text-ui-tag-red-text text-xs truncate max-w-[150px]">
                      {delivery.error_message}
                    </Text>
                  ) : (
                    <Text className="text-ui-fg-subtle">-</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-sm">
                    {delivery.attempts}/{delivery.max_attempts}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">
                    {new Date(delivery.created_at).toLocaleString()}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {(delivery.status === "failed" || delivery.status === "dead_letter") && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleRetry(delivery.id)}
                    >
                      Retry
                    </Button>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export default DeliveriesPage

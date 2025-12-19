import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Text,
  Button,
  Badge,
  IconButton,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PencilSquare, Trash, Plus, ArrowPath } from "@medusajs/icons"

type WebhookEndpoint = {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at?: string
  stats?: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
}

const WebhooksPage = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEndpoints = async () => {
    try {
      const response = await fetch(`/admin/webhooks`, {
        credentials: "include",
      })
      const result = await response.json()
      setEndpoints(result.endpoints || [])
    } catch (error) {
      console.error("Failed to fetch webhooks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEndpoints()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return

    try {
      await fetch(`/admin/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      fetchEndpoints()
    } catch (error) {
      console.error("Failed to delete webhook:", error)
    }
  }

  const handleTest = async (id: string) => {
    try {
      const response = await fetch(`/admin/webhooks/${id}/test`, {
        method: "POST",
        credentials: "include",
      })
      const result = await response.json()
      if (result.success) {
        alert("Test webhook sent successfully!")
      } else {
        alert(`Test failed: ${result.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to test webhook:", error)
      alert("Failed to send test webhook")
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading webhooks...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Webhooks</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Manage webhook endpoints for event notifications
          </Text>
        </div>
        <div className="flex gap-2">
          <Link to="/webhooks/deliveries">
            <Button variant="secondary">View Deliveries</Button>
          </Link>
          <Link to="/webhooks/create">
            <Button>
              <Plus className="mr-2" />
              Create Endpoint
            </Button>
          </Link>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
          <Text className="text-ui-fg-subtle mb-4">
            No webhook endpoints created yet
          </Text>
          <Link to="/webhooks/create">
            <Button variant="secondary">Create your first endpoint</Button>
          </Link>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>URL</Table.HeaderCell>
              <Table.HeaderCell>Events</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Success Rate</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {endpoints.map((endpoint) => (
              <Table.Row key={endpoint.id}>
                <Table.Cell>
                  <Link
                    to={`/webhooks/${endpoint.id}`}
                    className="font-medium text-ui-fg-interactive hover:underline"
                  >
                    {endpoint.name}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm font-mono truncate max-w-[200px]">
                    {endpoint.url}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-wrap gap-1">
                    {endpoint.events.slice(0, 2).map((event) => (
                      <Badge key={event} color="purple" size="small">
                        {event}
                      </Badge>
                    ))}
                    {endpoint.events.length > 2 && (
                      <Badge color="grey" size="small">
                        +{endpoint.events.length - 2}
                      </Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={endpoint.is_active ? "green" : "grey"}>
                    {endpoint.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {endpoint.stats ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-ui-bg-subtle rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            endpoint.stats.successRate >= 90
                              ? "bg-ui-tag-green-bg"
                              : endpoint.stats.successRate >= 70
                              ? "bg-ui-tag-orange-bg"
                              : "bg-ui-tag-red-bg"
                          }`}
                          style={{ width: `${endpoint.stats.successRate}%` }}
                        />
                      </div>
                      <Text className="text-sm text-ui-fg-subtle">
                        {endpoint.stats.successRate.toFixed(0)}%
                      </Text>
                    </div>
                  ) : (
                    <Text className="text-ui-fg-subtle">-</Text>
                  )}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <IconButton
                      variant="transparent"
                      onClick={() => handleTest(endpoint.id)}
                      title="Send test webhook"
                    >
                      <ArrowPath />
                    </IconButton>
                    <Link to={`/webhooks/${endpoint.id}`}>
                      <IconButton variant="transparent" title="Edit">
                        <PencilSquare />
                      </IconButton>
                    </Link>
                    <IconButton
                      variant="transparent"
                      onClick={() => handleDelete(endpoint.id)}
                      title="Delete"
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Webhooks",
  icon: ArrowPath,
})

export default WebhooksPage

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
import { PencilSquare, Trash, Plus } from "@medusajs/icons"

type Bundle = {
  id: string
  title: string
  description?: string
  items: {
    id: string
    quantity: number
    product?: {
      id: string
      title: string
    }
  }[]
  product?: {
    id: string
    title: string
  }
}

const BundlesPage = () => {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBundles = async () => {
    try {
      const response = await fetch(`/admin/bundles`, {
        credentials: "include",
      })
      const result = await response.json()
      setBundles(result.bundles || [])
    } catch (error) {
      console.error("Failed to fetch bundles:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBundles()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return

    try {
      await fetch(`/admin/bundles/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      fetchBundles()
    } catch (error) {
      console.error("Failed to delete bundle:", error)
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading bundles...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Bundles</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Manage your product bundles
          </Text>
        </div>
        <Link to="/bundles/create">
          <Button>
            <Plus className="mr-2" />
            Create Bundle
          </Button>
        </Link>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
          <Text className="text-ui-fg-subtle mb-4">
            No bundles created yet
          </Text>
          <Link to="/bundles/create">
            <Button variant="secondary">Create your first bundle</Button>
          </Link>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
              <Table.HeaderCell>Items</Table.HeaderCell>
              <Table.HeaderCell>Bundle Product</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {bundles.map((bundle) => (
              <Table.Row key={bundle.id}>
                <Table.Cell>
                  <Text className="font-medium">{bundle.title}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle">
                    {bundle.description || "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color="purple">
                    {bundle.items?.length || 0} products
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {bundle.product ? (
                    <Link
                      to={`/products/${bundle.product.id}`}
                      className="text-ui-fg-interactive hover:underline"
                    >
                      {bundle.product.title}
                    </Link>
                  ) : (
                    <Text className="text-ui-fg-subtle">-</Text>
                  )}
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link to={`/bundles/${bundle.id}`}>
                      <IconButton variant="transparent">
                        <PencilSquare />
                      </IconButton>
                    </Link>
                    <IconButton
                      variant="transparent"
                      onClick={() => handleDelete(bundle.id)}
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
  label: "Bundles",
  icon: Plus,
})

export default BundlesPage

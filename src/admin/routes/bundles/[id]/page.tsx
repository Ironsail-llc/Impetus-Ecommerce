import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ArrowLeft } from "@medusajs/icons"

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
      thumbnail?: string
    }
  }[]
  product?: {
    id: string
    title: string
    thumbnail?: string
  }
}

const BundleDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    const fetchBundle = async () => {
      try {
        const response = await fetch(`/admin/bundles/${id}`, {
          credentials: "include",
        })
        const result = await response.json()
        setBundle(result.bundle)
        setTitle(result.bundle?.title || "")
        setDescription(result.bundle?.description || "")
      } catch (error) {
        console.error("Failed to fetch bundle:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchBundle()
    }
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/admin/bundles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ title, description }),
      })
      navigate("/bundles")
    } catch (error) {
      console.error("Failed to update bundle:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading bundle...</Text>
      </Container>
    )
  }

  if (!bundle) {
    return (
      <Container className="p-8">
        <Text>Bundle not found</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <Link
        to="/bundles"
        className="flex items-center text-ui-fg-subtle hover:text-ui-fg-base mb-4"
      >
        <ArrowLeft className="mr-2" />
        Back to Bundles
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Bundle Details
            </Heading>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bundle title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bundle description"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} isLoading={saving}>
                Save Changes
              </Button>
            </div>
          </div>

          {/* Bundle Items */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Bundle Items
            </Heading>

            {bundle.items?.length === 0 ? (
              <Text className="text-ui-fg-subtle">
                No items in this bundle
              </Text>
            ) : (
              <div className="space-y-3">
                {bundle.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border border-ui-border-base rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {item.product?.thumbnail && (
                        <img
                          src={item.product.thumbnail}
                          alt={item.product.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <Text className="font-medium">
                          {item.product?.title || "Unknown Product"}
                        </Text>
                        <Text className="text-ui-fg-subtle text-sm">
                          Quantity: {item.quantity}
                        </Text>
                      </div>
                    </div>
                    {item.product && (
                      <Link to={`/products/${item.product.id}`}>
                        <Button variant="secondary" size="small">
                          View Product
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bundle Product */}
          {bundle.product && (
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
              <Heading level="h2" className="mb-4">
                Bundle Product
              </Heading>
              <div className="flex items-center gap-3">
                {bundle.product.thumbnail && (
                  <img
                    src={bundle.product.thumbnail}
                    alt={bundle.product.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <Text className="font-medium">{bundle.product.title}</Text>
                  <Link to={`/products/${bundle.product.id}`}>
                    <Button variant="secondary" size="small" className="mt-2">
                      View Product
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Summary
            </Heading>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text className="text-ui-fg-subtle">Bundle ID</Text>
                <Text className="font-mono text-sm">{bundle.id}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-ui-fg-subtle">Total Items</Text>
                <Badge color="purple">{bundle.items?.length || 0}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default BundleDetailPage

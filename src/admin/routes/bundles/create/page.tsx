import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Select,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Plus, Trash } from "@medusajs/icons"

type Product = {
  id: string
  title: string
  thumbnail?: string
  variants: {
    id: string
    title: string
  }[]
}

type BundleItem = {
  product_id: string
  product_title: string
  quantity: number
}

const CreateBundlePage = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`/admin/products?limit=100`, {
          credentials: "include",
        })
        const result = await response.json()
        setProducts(result.products || [])
      } catch (error) {
        console.error("Failed to fetch products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleAddItem = () => {
    if (!selectedProductId) return

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    // Check if already added
    if (bundleItems.some((item) => item.product_id === selectedProductId)) {
      alert("This product is already in the bundle")
      return
    }

    setBundleItems([
      ...bundleItems,
      {
        product_id: selectedProductId,
        product_title: product.title,
        quantity: 1,
      },
    ])
    setSelectedProductId("")
  }

  const handleRemoveItem = (productId: string) => {
    setBundleItems(bundleItems.filter((item) => item.product_id !== productId))
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    setBundleItems(
      bundleItems.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    )
  }

  const handleCreate = async () => {
    if (!title) {
      alert("Please enter a bundle title")
      return
    }

    if (bundleItems.length < 2) {
      alert("Please add at least 2 products to the bundle")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/admin/bundles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          product: {
            title: title,
            description: description,
            status: "published",
            variants: [
              {
                title: "Default",
                manage_inventory: false,
              },
            ],
          },
          items: bundleItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        }),
      })

      if (response.ok) {
        navigate("/bundles")
      } else {
        const error = await response.json()
        alert(`Failed to create bundle: ${error.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to create bundle:", error)
      alert("Failed to create bundle")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading...</Text>
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

      <Heading level="h1" className="mb-6">
        Create Bundle
      </Heading>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Bundle Details
            </Heading>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Summer Essentials Bundle"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's included in this bundle"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Add Products */}
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Bundle Items
            </Heading>

            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select a product to add" />
                  </Select.Trigger>
                  <Select.Content>
                    {products.map((product) => (
                      <Select.Item key={product.id} value={product.id}>
                        {product.title}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <Button onClick={handleAddItem} disabled={!selectedProductId}>
                <Plus className="mr-1" />
                Add
              </Button>
            </div>

            {bundleItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-ui-border-base rounded-lg">
                <Text className="text-ui-fg-subtle">
                  Add products to create your bundle
                </Text>
              </div>
            ) : (
              <div className="space-y-3">
                {bundleItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center justify-between p-3 border border-ui-border-base rounded-lg"
                  >
                    <Text className="font-medium">{item.product_title}</Text>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Qty:</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.product_id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-16"
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleRemoveItem(item.product_id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <Heading level="h2" className="mb-4">
              Summary
            </Heading>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <Text className="text-ui-fg-subtle">Products</Text>
                <Text className="font-medium">{bundleItems.length}</Text>
              </div>
              <div className="flex justify-between">
                <Text className="text-ui-fg-subtle">Total Items</Text>
                <Text className="font-medium">
                  {bundleItems.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              isLoading={saving}
              disabled={!title || bundleItems.length < 2}
            >
              Create Bundle
            </Button>

            {bundleItems.length < 2 && bundleItems.length > 0 && (
              <Text className="text-ui-fg-subtle text-sm mt-2 text-center">
                Add at least 2 products
              </Text>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

export default CreateBundlePage

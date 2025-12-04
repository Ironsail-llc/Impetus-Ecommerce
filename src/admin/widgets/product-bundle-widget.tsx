import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

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
}

const ProductBundleWidget = ({ data }: { data: { id: string } }) => {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const response = await fetch(`/admin/bundles`, {
          credentials: "include",
        })
        const result = await response.json()

        // Filter bundles that contain this product
        const productBundles = result.bundles?.filter((bundle: Bundle) =>
          bundle.items?.some((item) => item.product?.id === data.id)
        ) || []

        setBundles(productBundles)
      } catch (error) {
        console.error("Failed to fetch bundles:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBundles()
  }, [data.id])

  if (loading) {
    return (
      <Container className="p-4">
        <Text className="text-ui-fg-subtle">Loading bundles...</Text>
      </Container>
    )
  }

  if (bundles.length === 0) {
    return (
      <Container className="p-4">
        <Heading level="h2" className="mb-2">Bundles</Heading>
        <Text className="text-ui-fg-subtle">
          This product is not part of any bundle.
        </Text>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <Heading level="h2" className="mb-4">Bundles</Heading>
      <div className="space-y-3">
        {bundles.map((bundle) => (
          <div
            key={bundle.id}
            className="p-3 border border-ui-border-base rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <Text className="font-medium">{bundle.title}</Text>
              <Badge color="purple">
                {bundle.items?.length || 0} items
              </Badge>
            </div>
            {bundle.description && (
              <Text className="text-ui-fg-subtle text-sm">
                {bundle.description}
              </Text>
            )}
          </div>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductBundleWidget

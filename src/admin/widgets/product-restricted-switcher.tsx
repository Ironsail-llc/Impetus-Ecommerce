import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Switch, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"

const ProductRestrictedSwitcher = ({ data }: { data: HttpTypes.AdminProduct }) => {
    const [isRestricted, setIsRestricted] = useState(false)
    const [loading, setLoading] = useState(true)

    // Initial check
    useEffect(() => {
        if (data.tags) {
            const hasTag = data.tags.some((t: any) => t.value === "Restricted")
            setIsRestricted(hasTag)
        }
        setLoading(false)
    }, [data])

    const handleToggle = async (checked: boolean) => {
        setLoading(true)
        try {
            // Fetch latest product data
            const res = await fetch(`/admin/products/${data.id}`, { headers: { "Content-Type": "application/json" } })
            const { product } = await res.json()

            let newTags = product.tags || []

            if (checked) {
                // If we are enabling restriction, ensure the "Restricted" tag exists
                // 1. Check if it's already on the product (avoid refetch if possible, but we just fetched)
                if (!newTags.some((t: any) => t.value === "Restricted")) {
                    // 2. We need to find the tag ID or create it
                    let restrictedTagId: string | undefined

                    // Search for existing tag
                    const tagSearchRes = await fetch(`/admin/product-tags?limit=1&q=Restricted`, { headers: { "Content-Type": "application/json" } })
                    const { product_tags } = await tagSearchRes.json()
                    const existingTag = product_tags.find((t: any) => t.value === "Restricted")

                    if (existingTag) {
                        restrictedTagId = existingTag.id
                    } else {
                        // Create it
                        const createTagRes = await fetch(`/admin/product-tags`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ value: "Restricted" })
                        })

                        if (!createTagRes.ok) {
                            throw new Error("Failed to create Restricted tag")
                        }

                        const { product_tag } = await createTagRes.json()
                        restrictedTagId = product_tag.id
                    }

                    if (restrictedTagId) {
                        newTags.push({ id: restrictedTagId })
                    }
                }
            } else {
                // If disabling, remove the tag
                newTags = newTags.filter((t: any) => t.value !== "Restricted")
            }

            // Transform tags for update payload - Medusa expects ID for existing, but here we normalized to objects
            // We should only send IDs for all tags to be safe and consistent
            const tagsPayload = newTags.map((t: any) => ({ id: t.id }))

            const updateRes = await fetch(`/admin/products/${data.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: tagsPayload })
            })

            if (updateRes.ok) {
                setIsRestricted(checked)
                toast.success(`Product is now ${checked ? "Restricted" : "Unrestricted"}`)
            } else {
                const err = await updateRes.json()
                console.error("Update failed", err)
                throw new Error("Failed to update")
            }

        } catch (e) {
            toast.error("Failed to update restricted status")
            console.error(e)
            // Revert visual state if failed
            setIsRestricted(!checked)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container className="p-4 flex items-center justify-between">
            <div>
                <Heading level="h2">Restricted Access</Heading>
                <Text className="text-ui-fg-subtle text-small">
                    Only verifiable patients can view this product.
                </Text>
            </div>
            <div className="flex items-center gap-2">
                <Switch
                    checked={isRestricted}
                    onCheckedChange={handleToggle}
                    disabled={loading}
                />
                <Text className="text-small font-medium">
                    {isRestricted ? "Restricted" : "Public"}
                </Text>
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product.details.side.before",
})

export default ProductRestrictedSwitcher

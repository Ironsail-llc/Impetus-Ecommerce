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
            // We need to fetch the existing tags to avoid overwriting them?
            // The data prop might be stale if we don't re-fetch, but for now we trust it or fetches fresh?
            // Actually, Medusa V2 Update Product usually takes a list of tags. 
            // If we send just the new tag, does it replace all? Yes, usually.
            // So we must be careful.

            // Let's fetch the latest product first to be safe.
            const res = await fetch(`/admin/products/${data.id}`, { headers: { "Content-Type": "application/json" } })
            const { product } = await res.json()

            let newTags = product.tags || []

            if (checked) {
                if (!newTags.some((t: any) => t.value === "Restricted")) {
                    newTags.push({ value: "Restricted" })
                }
            } else {
                newTags = newTags.filter((t: any) => t.value !== "Restricted")
            }

            // Transform tags for update payload (usually expects [{id: ...}, {value: ...}] or just values?)
            // V2 Product Update expects `tags: [{id: ...} | {value: ...}]`
            const tagsPayload = newTags.map((t: any) => t.id ? { id: t.id } : { value: t.value })

            const updateRes = await fetch(`/admin/products/${data.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tags: tagsPayload })
            })

            if (updateRes.ok) {
                setIsRestricted(checked)
                toast.success(`Product is now ${checked ? "Restricted" : "Unrestricted"}`)
            } else {
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

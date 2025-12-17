import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  IconButton,
  Input,
  Label,
  Drawer,
  Textarea,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Plus, PencilSquare, Trash } from "@medusajs/icons"

type Tier = {
  id: string
  name: string
  sort_order: number
  threshold: number
  discount_percent: number
  benefits_description: string | null
  is_default: boolean
}

const TierForm = ({
  tier,
  onSave,
  onClose,
}: {
  tier: Tier | null
  onSave: (data: Partial<Tier>) => Promise<void>
  onClose: () => void
}) => {
  const [formData, setFormData] = useState({
    name: tier?.name || "",
    threshold: tier?.threshold?.toString() || "0",
    discount_percent: tier?.discount_percent?.toString() || "0",
    benefits_description: tier?.benefits_description || "",
    is_default: tier?.is_default || false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: formData.name,
        threshold: Number(formData.threshold),
        discount_percent: Number(formData.discount_percent),
        benefits_description: formData.benefits_description || null,
        is_default: formData.is_default,
      })
      onClose()
    } catch (error) {
      console.error("Failed to save tier:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Tier Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Gold"
          required
        />
      </div>

      <div>
        <Label htmlFor="threshold">Points Threshold *</Label>
        <Input
          id="threshold"
          type="number"
          value={formData.threshold}
          onChange={(e) => setFormData({ ...formData, threshold: e.target.value })}
          placeholder="Points required to reach tier"
          min="0"
          required
        />
        <Text className="text-ui-fg-muted text-xs mt-1">
          Minimum lifetime points to qualify for this tier
        </Text>
      </div>

      <div>
        <Label htmlFor="discount_percent">Automatic Discount %</Label>
        <Input
          id="discount_percent"
          type="number"
          value={formData.discount_percent}
          onChange={(e) => setFormData({ ...formData, discount_percent: e.target.value })}
          min="0"
          max="100"
        />
        <Text className="text-ui-fg-muted text-xs mt-1">
          Discount automatically applied to all orders for customers at this tier
        </Text>
      </div>

      <div>
        <Label htmlFor="benefits">Benefits Description</Label>
        <Textarea
          id="benefits"
          value={formData.benefits_description}
          onChange={(e) => setFormData({ ...formData, benefits_description: e.target.value })}
          placeholder="Free shipping, Early access, etc."
          rows={3}
        />
        <Text className="text-ui-fg-muted text-xs mt-1">
          Comma-separated list of benefits
        </Text>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          Default tier for new customers
        </Label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saving || !formData.name}>
          {saving ? "Saving..." : tier ? "Update Tier" : "Create Tier"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

const TiersPage = () => {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier | null>(null)

  const fetchTiers = async () => {
    try {
      const response = await fetch("/admin/loyalty/tiers", {
        credentials: "include",
      })
      if (response.ok) {
        const result = await response.json()
        setTiers(result.tiers || [])
      }
    } catch (error) {
      console.error("Failed to fetch tiers:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTiers()
  }, [])

  const handleSave = async (data: Partial<Tier>) => {
    const url = editingTier
      ? `/admin/loyalty/tiers/${editingTier.id}`
      : "/admin/loyalty/tiers"
    const method = editingTier ? "PUT" : "POST"

    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to save tier")
    }

    fetchTiers()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return

    try {
      await fetch(`/admin/loyalty/tiers/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      fetchTiers()
    } catch (error) {
      console.error("Failed to delete tier:", error)
    }
  }

  const openCreate = () => {
    setEditingTier(null)
    setDrawerOpen(true)
  }

  const openEdit = (tier: Tier) => {
    setEditingTier(tier)
    setDrawerOpen(true)
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading tiers...</Text>
      </Container>
    )
  }

  // Sort tiers by threshold
  const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold)

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/loyalty">
            <IconButton variant="transparent">
              <ArrowLeft />
            </IconButton>
          </Link>
          <div>
            <Heading level="h1">Loyalty Tiers</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Configure membership tiers and their benefits
            </Text>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2" />
          Add Tier
        </Button>
      </div>

      {/* Tier Ladder Visualization */}
      <div className="mb-8 p-6 bg-ui-bg-subtle rounded-lg">
        <Text className="text-sm font-medium mb-4">Tier Ladder</Text>
        <div className="flex items-end gap-4 h-40">
          {sortedTiers.map((tier, index) => {
            const maxThreshold = Math.max(...sortedTiers.map((t) => t.threshold), 1)
            const height = Math.max((tier.threshold / maxThreshold) * 100, 20)

            return (
              <div
                key={tier.id}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full bg-ui-tag-green-bg rounded-t-lg flex items-end justify-center pb-2 transition-all"
                  style={{ height: `${height}%` }}
                >
                  <Text className="text-ui-tag-green-text text-xs font-medium">
                    {tier.discount_percent}% off
                  </Text>
                </div>
                <div className="mt-2 text-center">
                  <Text className="font-medium text-sm">{tier.name}</Text>
                  <Text className="text-ui-fg-muted text-xs">
                    {tier.threshold.toLocaleString()} pts
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tiers Table */}
      {sortedTiers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
          <Text className="text-ui-fg-subtle mb-4">No tiers created yet</Text>
          <Button variant="secondary" onClick={openCreate}>
            Create your first tier
          </Button>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Tier Name</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Threshold</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Auto Discount</Table.HeaderCell>
              <Table.HeaderCell>Benefits</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sortedTiers.map((tier) => (
              <Table.Row key={tier.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <Text className="font-medium">{tier.name}</Text>
                    {tier.is_default && (
                      <Badge color="blue" size="small">Default</Badge>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Text>{tier.threshold.toLocaleString()} pts</Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  {tier.discount_percent > 0 ? (
                    <Badge color="green">{tier.discount_percent}% off</Badge>
                  ) : (
                    <Text className="text-ui-fg-muted">None</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm truncate max-w-[200px]">
                    {tier.benefits_description || "-"}
                  </Text>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton variant="transparent" onClick={() => openEdit(tier)}>
                      <PencilSquare />
                    </IconButton>
                    <IconButton variant="transparent" onClick={() => handleDelete(tier.id)}>
                      <Trash />
                    </IconButton>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {/* Create/Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingTier ? `Edit ${editingTier.name}` : "Create Tier"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4">
            <TierForm
              tier={editingTier}
              onSave={handleSave}
              onClose={() => setDrawerOpen(false)}
            />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Tiers",
})

export default TiersPage

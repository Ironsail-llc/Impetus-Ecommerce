import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  Input,
  Label,
  Switch,
  Select,
  toast,
  Drawer,
  IconButton,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, PencilSquare, Trash, Plus } from "@medusajs/icons"

type RegionRule = {
  id: string
  region_code: string
  region_name: string
  country_code: string
  requires_establishment: boolean
  establishment_expiration_days: number | null
  active: boolean
  created_at: string
  updated_at: string
}

type RegionFormData = {
  region_code: string
  region_name: string
  country_code: string
  requires_establishment: boolean
  establishment_expiration_days: number | null
  active: boolean
}

const US_STATES = [
  { code: "US-AL", name: "Alabama" },
  { code: "US-AK", name: "Alaska" },
  { code: "US-AZ", name: "Arizona" },
  { code: "US-AR", name: "Arkansas" },
  { code: "US-CA", name: "California" },
  { code: "US-CO", name: "Colorado" },
  { code: "US-CT", name: "Connecticut" },
  { code: "US-DE", name: "Delaware" },
  { code: "US-FL", name: "Florida" },
  { code: "US-GA", name: "Georgia" },
  { code: "US-HI", name: "Hawaii" },
  { code: "US-ID", name: "Idaho" },
  { code: "US-IL", name: "Illinois" },
  { code: "US-IN", name: "Indiana" },
  { code: "US-IA", name: "Iowa" },
  { code: "US-KS", name: "Kansas" },
  { code: "US-KY", name: "Kentucky" },
  { code: "US-LA", name: "Louisiana" },
  { code: "US-ME", name: "Maine" },
  { code: "US-MD", name: "Maryland" },
  { code: "US-MA", name: "Massachusetts" },
  { code: "US-MI", name: "Michigan" },
  { code: "US-MN", name: "Minnesota" },
  { code: "US-MS", name: "Mississippi" },
  { code: "US-MO", name: "Missouri" },
  { code: "US-MT", name: "Montana" },
  { code: "US-NE", name: "Nebraska" },
  { code: "US-NV", name: "Nevada" },
  { code: "US-NH", name: "New Hampshire" },
  { code: "US-NJ", name: "New Jersey" },
  { code: "US-NM", name: "New Mexico" },
  { code: "US-NY", name: "New York" },
  { code: "US-NC", name: "North Carolina" },
  { code: "US-ND", name: "North Dakota" },
  { code: "US-OH", name: "Ohio" },
  { code: "US-OK", name: "Oklahoma" },
  { code: "US-OR", name: "Oregon" },
  { code: "US-PA", name: "Pennsylvania" },
  { code: "US-RI", name: "Rhode Island" },
  { code: "US-SC", name: "South Carolina" },
  { code: "US-SD", name: "South Dakota" },
  { code: "US-TN", name: "Tennessee" },
  { code: "US-TX", name: "Texas" },
  { code: "US-UT", name: "Utah" },
  { code: "US-VT", name: "Vermont" },
  { code: "US-VA", name: "Virginia" },
  { code: "US-WA", name: "Washington" },
  { code: "US-WV", name: "West Virginia" },
  { code: "US-WI", name: "Wisconsin" },
  { code: "US-WY", name: "Wyoming" },
  { code: "US-DC", name: "District of Columbia" },
]

const defaultFormData: RegionFormData = {
  region_code: "",
  region_name: "",
  country_code: "US",
  requires_establishment: true,
  establishment_expiration_days: null,
  active: true,
}

const RegionRulesPage = () => {
  const [regions, setRegions] = useState<RegionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRegion, setEditingRegion] = useState<RegionRule | null>(null)
  const [formData, setFormData] = useState<RegionFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchRegions = async () => {
    try {
      const res = await fetch("/admin/compliance/regions", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setRegions(data.regions || [])
      }
    } catch (error) {
      console.error("Failed to fetch regions:", error)
      toast.error("Failed to load region rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegions()
  }, [])

  const handleStateSelect = (stateCode: string) => {
    const state = US_STATES.find(s => s.code === stateCode)
    if (state) {
      setFormData(prev => ({
        ...prev,
        region_code: state.code,
        region_name: state.name,
        country_code: "US",
      }))
    }
  }

  const openAddDrawer = () => {
    setEditingRegion(null)
    setFormData(defaultFormData)
    setDrawerOpen(true)
  }

  const openEditDrawer = (region: RegionRule) => {
    setEditingRegion(region)
    setFormData({
      region_code: region.region_code,
      region_name: region.region_name,
      country_code: region.country_code,
      requires_establishment: region.requires_establishment,
      establishment_expiration_days: region.establishment_expiration_days,
      active: region.active,
    })
    setDrawerOpen(true)
  }

  const handleSave = async () => {
    if (!formData.region_code || !formData.region_name) {
      toast.error("Region code and name are required")
      return
    }

    setSaving(true)
    try {
      const url = editingRegion
        ? `/admin/compliance/regions/${editingRegion.id}`
        : "/admin/compliance/regions"
      const method = editingRegion ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingRegion ? "Region rule updated" : "Region rule created")
        setDrawerOpen(false)
        fetchRegions()
      } else {
        const error = await res.json()
        toast.error(error.message || "Failed to save region rule")
      }
    } catch (error) {
      console.error("Failed to save region:", error)
      toast.error("Failed to save region rule")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/admin/compliance/regions/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        toast.success("Region rule deleted")
        setDeleteConfirm(null)
        fetchRegions()
      } else {
        toast.error("Failed to delete region rule")
      }
    } catch (error) {
      console.error("Failed to delete region:", error)
      toast.error("Failed to delete region rule")
    }
  }

  const toggleActive = async (region: RegionRule) => {
    try {
      const res = await fetch(`/admin/compliance/regions/${region.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !region.active }),
      })

      if (res.ok) {
        toast.success(`Region rule ${region.active ? "deactivated" : "activated"}`)
        fetchRegions()
      }
    } catch (error) {
      console.error("Failed to toggle region:", error)
      toast.error("Failed to update region rule")
    }
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading region rules...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/compliance">
          <IconButton variant="transparent">
            <ArrowLeft />
          </IconButton>
        </Link>
        <div className="flex-1">
          <Heading level="h1">Region Compliance Rules</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Configure which regions require patient establishment before ordering
          </Text>
        </div>
        <Button onClick={openAddDrawer}>
          <Plus className="mr-2" />
          Add Region
        </Button>
      </div>

      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg">
        {regions.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Region</Table.HeaderCell>
                <Table.HeaderCell>Country</Table.HeaderCell>
                <Table.HeaderCell>Requires Establishment</Table.HeaderCell>
                <Table.HeaderCell>Expiration</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {regions.map((region) => (
                <Table.Row key={region.id}>
                  <Table.Cell>
                    <div>
                      <Text className="font-medium">{region.region_name}</Text>
                      <Text className="text-ui-fg-subtle text-xs">{region.region_code}</Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color="grey">{region.country_code}</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={region.requires_establishment ? "orange" : "grey"}>
                      {region.requires_establishment ? "Required" : "Not Required"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Text className="text-ui-fg-subtle">
                      {region.establishment_expiration_days
                        ? `${region.establishment_expiration_days} days`
                        : "Never"}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={region.active}
                        onCheckedChange={() => toggleActive(region)}
                      />
                      <Badge color={region.active ? "green" : "grey"}>
                        {region.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-2">
                      <IconButton
                        variant="transparent"
                        onClick={() => openEditDrawer(region)}
                      >
                        <PencilSquare />
                      </IconButton>
                      {deleteConfirm === region.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDelete(region.id)}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <IconButton
                          variant="transparent"
                          onClick={() => setDeleteConfirm(region.id)}
                        >
                          <Trash />
                        </IconButton>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Text className="text-ui-fg-subtle mb-4">
              No region rules configured yet
            </Text>
            <Button onClick={openAddDrawer}>
              <Plus className="mr-2" />
              Add Your First Region
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingRegion ? "Edit Region Rule" : "Add Region Rule"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4 space-y-4">
            <div>
              <Label htmlFor="state-select">Select US State</Label>
              <Select
                value={formData.region_code}
                onValueChange={handleStateSelect}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a state..." />
                </Select.Trigger>
                <Select.Content>
                  {US_STATES.map((state) => (
                    <Select.Item key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Text className="text-ui-fg-subtle text-xs mt-1">
                Or enter custom region below
              </Text>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="region_code">Region Code</Label>
                <Input
                  id="region_code"
                  value={formData.region_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, region_code: e.target.value }))
                  }
                  placeholder="e.g., US-TX"
                />
              </div>
              <div>
                <Label htmlFor="region_name">Region Name</Label>
                <Input
                  id="region_name"
                  value={formData.region_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, region_name: e.target.value }))
                  }
                  placeholder="e.g., Texas"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                value={formData.country_code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, country_code: e.target.value }))
                }
                placeholder="e.g., US"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-ui-border-base">
              <div>
                <Text className="font-medium">Requires Establishment</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Customers must be established before ordering in this region
                </Text>
              </div>
              <Switch
                checked={formData.requires_establishment}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, requires_establishment: checked }))
                }
              />
            </div>

            <div>
              <Label htmlFor="expiration">Establishment Expiration (days)</Label>
              <Input
                id="expiration"
                type="number"
                value={formData.establishment_expiration_days ?? ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    establishment_expiration_days: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
                placeholder="Leave empty for no expiration"
              />
              <Text className="text-ui-fg-subtle text-xs mt-1">
                After this many days, customers will need to re-establish
              </Text>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Text className="font-medium">Active</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Enable this region rule
                </Text>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              variant="secondary"
              onClick={() => setDrawerOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingRegion ? "Update" : "Create"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Region Rules",
})

export default RegionRulesPage

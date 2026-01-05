import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Switch,
  Select,
  toast,
  IconButton,
  Badge,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Plus, XMark } from "@medusajs/icons"

type ComplianceConfig = {
  establishment_expiration_days: number | null
  hold_orders_until_established: boolean
  controlled_substance_requires_consultation: boolean
  consultation_product_ids: string[]
  send_requirement_notification: boolean
  notification_channels: string[]
  reminder_days: number[]
}

type Product = {
  id: string
  title: string
}

const defaultConfig: ComplianceConfig = {
  establishment_expiration_days: null,
  hold_orders_until_established: true,
  controlled_substance_requires_consultation: true,
  consultation_product_ids: [],
  send_requirement_notification: true,
  notification_channels: ["email"],
  reminder_days: [3, 7, 14],
}

const ComplianceConfigurationPage = () => {
  const [config, setConfig] = useState<ComplianceConfig>(defaultConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [newReminderDay, setNewReminderDay] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, productsRes] = await Promise.all([
          fetch("/admin/compliance/configuration", { credentials: "include" }),
          fetch("/admin/products?limit=100", { credentials: "include" }),
        ])

        if (configRes.ok) {
          const data = await configRes.json()
          if (data.config) {
            setConfig({
              ...defaultConfig,
              ...data.config,
            })
          }
        }

        if (productsRes.ok) {
          const data = await productsRes.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
        toast.error("Failed to load configuration")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/compliance/configuration", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: config }),
      })

      if (res.ok) {
        toast.success("Configuration saved successfully")
      } else {
        const error = await res.json()
        toast.error(error.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Failed to save:", error)
      toast.error("Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  const addConsultationProduct = () => {
    if (selectedProduct && !config.consultation_product_ids.includes(selectedProduct)) {
      setConfig((prev) => ({
        ...prev,
        consultation_product_ids: [...prev.consultation_product_ids, selectedProduct],
      }))
      setSelectedProduct("")
    }
  }

  const removeConsultationProduct = (productId: string) => {
    setConfig((prev) => ({
      ...prev,
      consultation_product_ids: prev.consultation_product_ids.filter((id) => id !== productId),
    }))
  }

  const toggleNotificationChannel = (channel: string) => {
    setConfig((prev) => ({
      ...prev,
      notification_channels: prev.notification_channels.includes(channel)
        ? prev.notification_channels.filter((c) => c !== channel)
        : [...prev.notification_channels, channel],
    }))
  }

  const addReminderDay = () => {
    const day = parseInt(newReminderDay)
    if (day > 0 && !config.reminder_days.includes(day)) {
      setConfig((prev) => ({
        ...prev,
        reminder_days: [...prev.reminder_days, day].sort((a, b) => a - b),
      }))
      setNewReminderDay("")
    }
  }

  const removeReminderDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      reminder_days: prev.reminder_days.filter((d) => d !== day),
    }))
  }

  const getProductTitle = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    return product?.title || productId
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading configuration...</Text>
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
          <Heading level="h1">Compliance Configuration</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Global settings for telemedicine compliance
          </Text>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Establishment Settings */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          <Heading level="h2" className="mb-4">Establishment Settings</Heading>

          <div className="space-y-4">
            <div>
              <Label htmlFor="expiration">Default Expiration (days)</Label>
              <Input
                id="expiration"
                type="number"
                value={config.establishment_expiration_days ?? ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    establishment_expiration_days: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
                placeholder="Leave empty for no expiration"
                className="max-w-xs"
              />
              <Text className="text-ui-fg-subtle text-xs mt-1">
                How long customer establishment remains valid. Leave empty for indefinite.
              </Text>
            </div>

            <div className="flex items-center justify-between py-3 border-t border-ui-border-base">
              <div>
                <Text className="font-medium">Hold Orders Until Established</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Prevent order fulfillment until customer is established in their region
                </Text>
              </div>
              <Switch
                checked={config.hold_orders_until_established}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, hold_orders_until_established: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between py-3 border-t border-ui-border-base">
              <div>
                <Text className="font-medium">Controlled Substances Require Consultation</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Require synchronous consultation for Schedule II-V products
                </Text>
              </div>
              <Switch
                checked={config.controlled_substance_requires_consultation}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, controlled_substance_requires_consultation: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* Consultation Products */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          <Heading level="h2" className="mb-4">Consultation Products</Heading>
          <Text className="text-ui-fg-subtle mb-4">
            Products that can fulfill establishment requirements when purchased
          </Text>

          <div className="flex gap-2 mb-4">
            <Select
              value={selectedProduct}
              onValueChange={setSelectedProduct}
            >
              <Select.Trigger className="flex-1">
                <Select.Value placeholder="Select a product..." />
              </Select.Trigger>
              <Select.Content>
                {products
                  .filter((p) => !config.consultation_product_ids.includes(p.id))
                  .map((product) => (
                    <Select.Item key={product.id} value={product.id}>
                      {product.title}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select>
            <Button onClick={addConsultationProduct} disabled={!selectedProduct}>
              <Plus className="mr-1" />
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.consultation_product_ids.length === 0 ? (
              <Text className="text-ui-fg-subtle text-sm">No consultation products configured</Text>
            ) : (
              config.consultation_product_ids.map((productId) => (
                <Badge key={productId} color="blue" className="flex items-center gap-1">
                  {getProductTitle(productId)}
                  <button
                    onClick={() => removeConsultationProduct(productId)}
                    className="ml-1 hover:text-ui-fg-interactive"
                  >
                    <XMark className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          <Heading level="h2" className="mb-4">Notification Settings</Heading>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3">
              <div>
                <Text className="font-medium">Send Requirement Notifications</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Notify customers when they have pending compliance requirements
                </Text>
              </div>
              <Switch
                checked={config.send_requirement_notification}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, send_requirement_notification: checked }))
                }
              />
            </div>

            <div className="border-t border-ui-border-base pt-4">
              <Label className="mb-2 block">Notification Channels</Label>
              <div className="flex gap-4">
                {["email", "sms", "push"].map((channel) => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.notification_channels.includes(channel)}
                      onChange={() => toggleNotificationChannel(channel)}
                      className="rounded border-ui-border-base"
                    />
                    <Text className="capitalize">{channel}</Text>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-ui-border-base pt-4">
              <Label className="mb-2 block">Reminder Schedule (days after requirement created)</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  type="number"
                  value={newReminderDay}
                  onChange={(e) => setNewReminderDay(e.target.value)}
                  placeholder="Days"
                  className="max-w-[100px]"
                />
                <Button onClick={addReminderDay} disabled={!newReminderDay}>
                  <Plus className="mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config.reminder_days.length === 0 ? (
                  <Text className="text-ui-fg-subtle text-sm">No reminder days configured</Text>
                ) : (
                  config.reminder_days.map((day) => (
                    <Badge key={day} color="purple" className="flex items-center gap-1">
                      {day} days
                      <button
                        onClick={() => removeReminderDay(day)}
                        className="ml-1 hover:text-ui-fg-interactive"
                      >
                        <XMark className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button (bottom) */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Configuration",
})

export default ComplianceConfigurationPage

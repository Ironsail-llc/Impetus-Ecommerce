import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Select, Switch, toast, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"

type ControlledSubstanceLevel =
  | "none"
  | "schedule_ii"
  | "schedule_iii"
  | "schedule_iv"
  | "schedule_v"

interface ProductComplianceData {
  controlled_substance: ControlledSubstanceLevel
  requires_synchronous_consultation: boolean
  is_consultation_product: boolean
  consultation_product_id: string | null
}

const SCHEDULE_OPTIONS = [
  { value: "none", label: "Not Controlled" },
  { value: "schedule_ii", label: "Schedule II" },
  { value: "schedule_iii", label: "Schedule III" },
  { value: "schedule_iv", label: "Schedule IV" },
  { value: "schedule_v", label: "Schedule V" },
]

const getScheduleBadgeColor = (level: ControlledSubstanceLevel) => {
  switch (level) {
    case "schedule_ii":
      return "red"
    case "schedule_iii":
      return "orange"
    case "schedule_iv":
      return "yellow"
    case "schedule_v":
      return "blue"
    default:
      return "grey"
  }
}

const ProductComplianceWidget = ({ data }: { data: HttpTypes.AdminProduct }) => {
  const [compliance, setCompliance] = useState<ProductComplianceData>({
    controlled_substance: "none",
    requires_synchronous_consultation: false,
    is_consultation_product: false,
    consultation_product_id: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch compliance data on mount
  useEffect(() => {
    const fetchCompliance = async () => {
      try {
        const res = await fetch(`/admin/products/${data.id}/compliance`, {
          headers: { "Content-Type": "application/json" },
        })
        if (res.ok) {
          const { compliance: complianceData } = await res.json()
          if (complianceData) {
            setCompliance({
              controlled_substance: complianceData.controlled_substance || "none",
              requires_synchronous_consultation: complianceData.requires_synchronous_consultation || false,
              is_consultation_product: complianceData.is_consultation_product || false,
              consultation_product_id: complianceData.consultation_product_id || null,
            })
          }
        }
      } catch (e) {
        console.error("Failed to fetch compliance data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchCompliance()
  }, [data.id])

  const updateCompliance = async (updates: Partial<ProductComplianceData>) => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/products/${data.id}/compliance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...compliance,
          ...updates,
        }),
      })

      if (res.ok) {
        setCompliance((prev) => ({ ...prev, ...updates }))
        toast.success("Compliance settings updated")
      } else {
        throw new Error("Failed to update")
      }
    } catch (e) {
      toast.error("Failed to update compliance settings")
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleChange = (value: string) => {
    const newLevel = value as ControlledSubstanceLevel
    // If setting to schedule II or III, automatically enable consultation requirement
    const requiresConsultation =
      newLevel === "schedule_ii" || newLevel === "schedule_iii"
        ? true
        : compliance.requires_synchronous_consultation

    updateCompliance({
      controlled_substance: newLevel,
      requires_synchronous_consultation: requiresConsultation,
    })
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Heading level="h2">Compliance Settings</Heading>
        <Text className="text-ui-fg-subtle text-small">Loading...</Text>
      </Container>
    )
  }

  return (
    <Container className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Heading level="h2">Compliance Settings</Heading>
        {compliance.controlled_substance !== "none" && (
          <Badge color={getScheduleBadgeColor(compliance.controlled_substance)}>
            {SCHEDULE_OPTIONS.find((o) => o.value === compliance.controlled_substance)?.label}
          </Badge>
        )}
      </div>

      {/* Controlled Substance Level */}
      <div className="space-y-2">
        <Text className="text-small font-medium">Controlled Substance Level</Text>
        <Select
          value={compliance.controlled_substance}
          onValueChange={handleScheduleChange}
          disabled={saving}
        >
          <Select.Trigger>
            <Select.Value placeholder="Select schedule..." />
          </Select.Trigger>
          <Select.Content>
            {SCHEDULE_OPTIONS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Text className="text-ui-fg-subtle text-xsmall">
          DEA controlled substance schedule classification
        </Text>
      </div>

      {/* Requires Synchronous Consultation */}
      <div className="flex items-center justify-between py-2 border-t border-ui-border-base">
        <div>
          <Text className="text-small font-medium">Requires Consultation</Text>
          <Text className="text-ui-fg-subtle text-xsmall">
            Customer must complete video consultation before purchase
          </Text>
        </div>
        <Switch
          checked={compliance.requires_synchronous_consultation}
          onCheckedChange={(checked) =>
            updateCompliance({ requires_synchronous_consultation: checked })
          }
          disabled={saving}
        />
      </div>

      {/* Is Consultation Product */}
      <div className="flex items-center justify-between py-2 border-t border-ui-border-base">
        <div>
          <Text className="text-small font-medium">Consultation Product</Text>
          <Text className="text-ui-fg-subtle text-xsmall">
            Purchasing this product fulfills patient establishment
          </Text>
        </div>
        <Switch
          checked={compliance.is_consultation_product}
          onCheckedChange={(checked) =>
            updateCompliance({ is_consultation_product: checked })
          }
          disabled={saving}
        />
      </div>

      {/* Status Summary */}
      {compliance.controlled_substance !== "none" && (
        <div className="pt-2 border-t border-ui-border-base">
          <Text className="text-ui-fg-subtle text-xsmall">
            This product requires patient establishment in the customer&apos;s region
            {compliance.requires_synchronous_consultation && " with synchronous video consultation"}
            .
          </Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductComplianceWidget

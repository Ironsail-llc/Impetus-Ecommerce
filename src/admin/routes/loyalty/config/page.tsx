import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  IconButton,
  Switch,
  Badge,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Check } from "@medusajs/icons"

type ConfigItem = {
  key: string
  value: any
  type: string
}

const ConfigSection = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) => (
  <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6 mb-6">
    <Heading level="h2" className="mb-1">{title}</Heading>
    <Text className="text-ui-fg-subtle text-sm mb-4">{description}</Text>
    <div className="space-y-4">{children}</div>
  </div>
)

const ConfigRow = ({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) => (
  <div className="flex items-start justify-between py-3 border-b border-ui-border-base last:border-0">
    <div className="flex-1 pr-4">
      <Label className="font-medium">{label}</Label>
      {description && (
        <Text className="text-ui-fg-muted text-xs mt-1">{description}</Text>
      )}
    </div>
    <div className="flex-shrink-0 w-48">{children}</div>
  </div>
)

const ConfigPage = () => {
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/admin/loyalty/config", {
          credentials: "include",
        })
        if (response.ok) {
          const result = await response.json()
          const configObj: Record<string, any> = {}
          result.config?.forEach((c: ConfigItem) => {
            configObj[c.key] = c.value
          })
          setConfig(configObj)
        }
      } catch (error) {
        console.error("Failed to fetch config:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch("/admin/loyalty/config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      if (response.ok) {
        setHasChanges(false)
      }
    } catch (error) {
      console.error("Failed to save config:", error)
    } finally {
      setSaving(false)
    }
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/loyalty">
            <IconButton variant="transparent">
              <ArrowLeft />
            </IconButton>
          </Link>
          <div>
            <Heading level="h1">Loyalty Configuration</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Configure your loyalty program settings
            </Text>
          </div>
        </div>
        <Button onClick={saveConfig} disabled={!hasChanges || saving}>
          {saving ? "Saving..." : "Save Changes"}
          {hasChanges && <Badge color="orange" className="ml-2">Unsaved</Badge>}
        </Button>
      </div>

      {/* Earning Rules */}
      <ConfigSection
        title="Earning Rules"
        description="Configure how customers earn loyalty points"
      >
        <ConfigRow
          label="Earn Rate"
          description="Points earned per dollar spent"
        >
          <Input
            type="number"
            value={config.earn_rate || 1}
            onChange={(e) => updateConfig("earn_rate", Number(e.target.value))}
            min="0"
            step="0.1"
          />
        </ConfigRow>
        <ConfigRow
          label="Include Tax"
          description="Calculate points on tax amount"
        >
          <Switch
            checked={config.earn_include_tax || false}
            onCheckedChange={(checked) => updateConfig("earn_include_tax", checked)}
          />
        </ConfigRow>
        <ConfigRow
          label="Include Shipping"
          description="Calculate points on shipping cost"
        >
          <Switch
            checked={config.earn_include_shipping || false}
            onCheckedChange={(checked) => updateConfig("earn_include_shipping", checked)}
          />
        </ConfigRow>
        <ConfigRow
          label="Earn on Redemption Orders"
          description="Earn points even when redeeming"
        >
          <Switch
            checked={config.earn_on_redemption_orders || false}
            onCheckedChange={(checked) => updateConfig("earn_on_redemption_orders", checked)}
          />
        </ConfigRow>
      </ConfigSection>

      {/* Redemption Rules */}
      <ConfigSection
        title="Redemption Rules"
        description="Configure how customers can use their points"
      >
        <ConfigRow
          label="Redemption Rate"
          description="Points required per dollar discount"
        >
          <Input
            type="number"
            value={config.redemption_rate || 100}
            onChange={(e) => updateConfig("redemption_rate", Number(e.target.value))}
            min="1"
          />
        </ConfigRow>
        <ConfigRow
          label="Minimum Redemption"
          description="Minimum points to redeem"
        >
          <Input
            type="number"
            value={config.min_redemption || 100}
            onChange={(e) => updateConfig("min_redemption", Number(e.target.value))}
            min="0"
          />
        </ConfigRow>
        <ConfigRow
          label="Max Redemption Type"
          description="Limit on redemption amount"
        >
          <select
            value={config.max_redemption_type || "none"}
            onChange={(e) => updateConfig("max_redemption_type", e.target.value)}
            className="w-full h-10 px-3 border border-ui-border-base rounded-lg bg-ui-bg-base"
          >
            <option value="none">No Limit</option>
            <option value="percent">Percentage of Order</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </ConfigRow>
        {config.max_redemption_type !== "none" && (
          <ConfigRow
            label="Max Redemption Value"
            description={config.max_redemption_type === "percent" ? "Maximum percentage" : "Maximum amount"}
          >
            <Input
              type="number"
              value={config.max_redemption_value || 0}
              onChange={(e) => updateConfig("max_redemption_value", Number(e.target.value))}
              min="0"
            />
          </ConfigRow>
        )}
      </ConfigSection>

      {/* Bonuses */}
      <ConfigSection
        title="Bonus Points"
        description="Configure signup and birthday bonuses"
      >
        <ConfigRow
          label="Signup Bonus"
          description="Award points on account creation"
        >
          <Switch
            checked={config.signup_bonus_enabled || false}
            onCheckedChange={(checked) => updateConfig("signup_bonus_enabled", checked)}
          />
        </ConfigRow>
        {config.signup_bonus_enabled && (
          <ConfigRow label="Signup Bonus Amount" description="Points to award">
            <Input
              type="number"
              value={config.signup_bonus_amount || 0}
              onChange={(e) => updateConfig("signup_bonus_amount", Number(e.target.value))}
              min="0"
            />
          </ConfigRow>
        )}
        <ConfigRow
          label="Birthday Bonus"
          description="Award points on customer birthday"
        >
          <Switch
            checked={config.birthday_bonus_enabled || false}
            onCheckedChange={(checked) => updateConfig("birthday_bonus_enabled", checked)}
          />
        </ConfigRow>
        {config.birthday_bonus_enabled && (
          <ConfigRow label="Birthday Bonus Amount" description="Points to award">
            <Input
              type="number"
              value={config.birthday_bonus_amount || 0}
              onChange={(e) => updateConfig("birthday_bonus_amount", Number(e.target.value))}
              min="0"
            />
          </ConfigRow>
        )}
      </ConfigSection>

      {/* Referral */}
      <ConfigSection
        title="Referral Program"
        description="Configure referral bonuses"
      >
        <ConfigRow
          label="Referrer Bonus"
          description="Points for the person referring"
        >
          <Input
            type="number"
            value={config.referrer_bonus || 0}
            onChange={(e) => updateConfig("referrer_bonus", Number(e.target.value))}
            min="0"
          />
        </ConfigRow>
        <ConfigRow
          label="Referee Bonus"
          description="Points for the new customer"
        >
          <Input
            type="number"
            value={config.referee_bonus || 0}
            onChange={(e) => updateConfig("referee_bonus", Number(e.target.value))}
            min="0"
          />
        </ConfigRow>
        <ConfigRow
          label="Referral Trigger"
          description="When to award referral bonus"
        >
          <select
            value={config.referral_trigger || "first_purchase"}
            onChange={(e) => updateConfig("referral_trigger", e.target.value)}
            className="w-full h-10 px-3 border border-ui-border-base rounded-lg bg-ui-bg-base"
          >
            <option value="signup">On Signup</option>
            <option value="first_purchase">First Purchase</option>
            <option value="min_purchase">Minimum Purchase</option>
          </select>
        </ConfigRow>
      </ConfigSection>

      {/* Expiration */}
      <ConfigSection
        title="Point Expiration"
        description="Configure when points expire"
      >
        <ConfigRow
          label="Enable Expiration"
          description="Points expire after inactivity"
        >
          <Switch
            checked={config.expiration_enabled || false}
            onCheckedChange={(checked) => updateConfig("expiration_enabled", checked)}
          />
        </ConfigRow>
        {config.expiration_enabled && (
          <>
            <ConfigRow label="Expiration Days" description="Days until points expire">
              <Input
                type="number"
                value={config.expiration_days || 365}
                onChange={(e) => updateConfig("expiration_days", Number(e.target.value))}
                min="30"
              />
            </ConfigRow>
            <ConfigRow
              label="Activity Extends Expiration"
              description="Reset timer on activity"
            >
              <Switch
                checked={config.activity_extends_expiration ?? true}
                onCheckedChange={(checked) => updateConfig("activity_extends_expiration", checked)}
              />
            </ConfigRow>
          </>
        )}
      </ConfigSection>

      {/* Tier Settings */}
      <ConfigSection
        title="Tier Settings"
        description="Configure tier calculation and downgrades"
      >
        <ConfigRow
          label="Tier Calculation Basis"
          description="How tier eligibility is calculated"
        >
          <select
            value={config.tier_calculation_basis || "lifetime_earned"}
            onChange={(e) => updateConfig("tier_calculation_basis", e.target.value)}
            className="w-full h-10 px-3 border border-ui-border-base rounded-lg bg-ui-bg-base"
          >
            <option value="lifetime_earned">Lifetime Points Earned</option>
            <option value="current_balance">Current Balance</option>
            <option value="annual">Annual Points</option>
          </select>
        </ConfigRow>
        <ConfigRow
          label="Enable Tier Downgrades"
          description="Customers can lose tier status"
        >
          <Switch
            checked={config.tier_downgrade_enabled || false}
            onCheckedChange={(checked) => updateConfig("tier_downgrade_enabled", checked)}
          />
        </ConfigRow>
        {config.tier_downgrade_enabled && (
          <>
            <ConfigRow label="Reset Period" description="When to recalculate tiers">
              <select
                value={config.tier_reset_period || "never"}
                onChange={(e) => updateConfig("tier_reset_period", e.target.value)}
                className="w-full h-10 px-3 border border-ui-border-base rounded-lg bg-ui-bg-base"
              >
                <option value="never">Never</option>
                <option value="annual">Annual</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </ConfigRow>
            <ConfigRow label="Grace Period (Days)" description="Days before downgrade">
              <Input
                type="number"
                value={config.tier_grace_period_days || 30}
                onChange={(e) => updateConfig("tier_grace_period_days", Number(e.target.value))}
                min="0"
              />
            </ConfigRow>
          </>
        )}
      </ConfigSection>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Configuration",
})

export default ConfigPage

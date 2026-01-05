import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ShieldCheck, MapPin, Users, Clock } from "@medusajs/icons"

type ComplianceConfig = {
  establishment_expiration_days: number | null
  hold_orders_until_established: boolean
  controlled_substance_requires_consultation: boolean
  consultation_product_ids: string[]
  send_requirement_notification: boolean
  notification_channels: string[]
  reminder_days: number[]
}

type RegionRule = {
  id: string
  region_code: string
  region_name: string
  country_code: string
  requires_establishment: boolean
  establishment_expiration_days: number | null
  active: boolean
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  color?: "blue" | "green" | "orange" | "purple"
}) => {
  const colorClasses = {
    blue: "bg-ui-tag-blue-bg text-ui-tag-blue-text",
    green: "bg-ui-tag-green-bg text-ui-tag-green-text",
    orange: "bg-ui-tag-orange-bg text-ui-tag-orange-text",
    purple: "bg-ui-tag-purple-bg text-ui-tag-purple-text",
  }

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-ui-fg-subtle text-sm">{title}</Text>
          <Heading level="h2" className="mt-1">{value}</Heading>
          {subtitle && (
            <Text className="text-ui-fg-muted text-xs mt-1">{subtitle}</Text>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

const ComplianceDashboard = () => {
  const [config, setConfig] = useState<ComplianceConfig | null>(null)
  const [regions, setRegions] = useState<RegionRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, regionsRes] = await Promise.all([
          fetch("/admin/compliance/configuration", { credentials: "include" }),
          fetch("/admin/compliance/regions", { credentials: "include" }),
        ])

        if (configRes.ok) {
          const data = await configRes.json()
          setConfig(data.config)
        }

        if (regionsRes.ok) {
          const data = await regionsRes.json()
          setRegions(data.regions || [])
        }
      } catch (error) {
        console.error("Failed to fetch compliance data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading compliance dashboard...</Text>
      </Container>
    )
  }

  const activeRegions = regions.filter(r => r.active && r.requires_establishment)
  const expirationText = config?.establishment_expiration_days
    ? `${config.establishment_expiration_days} days`
    : "Never"

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Telemedicine Compliance</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Manage patient establishment requirements and regional compliance rules
          </Text>
        </div>
        <div className="flex gap-2">
          <Link to="/compliance/regions">
            <Button variant="secondary">Manage Regions</Button>
          </Link>
          <Link to="/compliance/configuration">
            <Button>Configure</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Active Regions"
          value={activeRegions.length}
          subtitle="Requiring establishment"
          icon={MapPin}
          color="blue"
        />
        <StatCard
          title="Establishment Expiration"
          value={expirationText}
          subtitle={config?.establishment_expiration_days ? "Auto-expires" : "Indefinite"}
          icon={Clock}
          color="purple"
        />
        <StatCard
          title="Order Hold"
          value={config?.hold_orders_until_established ? "Enabled" : "Disabled"}
          subtitle="Until established"
          icon={ShieldCheck}
          color={config?.hold_orders_until_established ? "orange" : "green"}
        />
        <StatCard
          title="Consultation Products"
          value={config?.consultation_product_ids?.length || 0}
          subtitle="Can fulfill establishment"
          icon={Users}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Region Rules */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Heading level="h2">Region Rules</Heading>
            <Link to="/compliance/regions">
              <Button variant="secondary" size="small">View All</Button>
            </Link>
          </div>
          {regions.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Region</Table.HeaderCell>
                  <Table.HeaderCell>Requires Est.</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {regions.slice(0, 5).map((region) => (
                  <Table.Row key={region.id}>
                    <Table.Cell>
                      <div>
                        <Text className="font-medium">{region.region_name}</Text>
                        <Text className="text-ui-fg-subtle text-xs">{region.region_code}</Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={region.requires_establishment ? "orange" : "grey"}>
                        {region.requires_establishment ? "Yes" : "No"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={region.active ? "green" : "grey"}>
                        {region.active ? "Active" : "Inactive"}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Text className="text-ui-fg-subtle">No region rules configured</Text>
              <Link to="/compliance/regions">
                <Button className="mt-2" size="small">Add Region</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Settings */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Heading level="h2">Settings Overview</Heading>
            <Link to="/compliance/configuration">
              <Button variant="secondary" size="small">Edit</Button>
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-ui-border-base">
              <div>
                <Text className="font-medium">Controlled Substance Consultation</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Require consultation for controlled substances
                </Text>
              </div>
              <Badge color={config?.controlled_substance_requires_consultation ? "green" : "grey"}>
                {config?.controlled_substance_requires_consultation ? "Required" : "Optional"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-ui-border-base">
              <div>
                <Text className="font-medium">Notifications</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Send requirement notifications
                </Text>
              </div>
              <Badge color={config?.send_requirement_notification ? "green" : "grey"}>
                {config?.send_requirement_notification ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-ui-border-base">
              <div>
                <Text className="font-medium">Notification Channels</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  How customers are notified
                </Text>
              </div>
              <div className="flex gap-1">
                {config?.notification_channels?.map((channel) => (
                  <Badge key={channel} color="blue">{channel}</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <Text className="font-medium">Reminder Schedule</Text>
                <Text className="text-ui-fg-subtle text-xs">
                  Days after requirement created
                </Text>
              </div>
              <Text className="text-ui-fg-subtle">
                {config?.reminder_days?.join(", ")} days
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Compliance",
  icon: ShieldCheck,
})

export default ComplianceDashboard

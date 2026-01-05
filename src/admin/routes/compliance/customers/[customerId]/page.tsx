import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  Select,
  toast,
  IconButton,
  Drawer,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, ShieldCheck, Clock, CheckCircle, Plus } from "@medusajs/icons"

type Establishment = {
  id: string
  region_code: string
  established: boolean
  established_at: string | null
  expires_at: string | null
  fulfillment_source: string | null
  fulfillment_reference_type: string | null
}

type AuditLog = {
  id: string
  action: string
  entity_type: string
  changes: Record<string, unknown> | null
  reason: string | null
  action_by_type: string
  action_by_id: string | null
  created_at: string
}

type RegionRule = {
  id: string
  region_code: string
  region_name: string
}

type Customer = {
  id: string
  email: string
  first_name: string
  last_name: string
}

const CustomerCompliancePage = () => {
  const { customerId } = useParams<{ customerId: string }>()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [regions, setRegions] = useState<RegionRule[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState("")
  const [establishing, setEstablishing] = useState(false)

  const fetchData = async () => {
    try {
      const [statusRes, historyRes, regionsRes, customerRes] = await Promise.all([
        fetch(`/admin/compliance/customers/${customerId}/status`, { credentials: "include" }),
        fetch(`/admin/compliance/customers/${customerId}/history`, { credentials: "include" }),
        fetch("/admin/compliance/regions", { credentials: "include" }),
        fetch(`/admin/customers/${customerId}`, { credentials: "include" }),
      ])

      if (statusRes.ok) {
        const data = await statusRes.json()
        setEstablishments(data.establishments || [])
      }

      if (historyRes.ok) {
        const data = await historyRes.json()
        setAuditLogs(data.history || [])
      }

      if (regionsRes.ok) {
        const data = await regionsRes.json()
        setRegions(data.regions || [])
      }

      if (customerRes.ok) {
        const data = await customerRes.json()
        setCustomer(data.customer)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load customer compliance data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (customerId) {
      fetchData()
    }
  }, [customerId])

  const handleEstablish = async () => {
    if (!selectedRegion) {
      toast.error("Please select a region")
      return
    }

    setEstablishing(true)
    try {
      const res = await fetch(`/admin/compliance/customers/${customerId}/establish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region_code: selectedRegion,
          source: "manual",
          reason: "Manual establishment by admin",
        }),
      })

      if (res.ok) {
        toast.success("Customer established successfully")
        setDrawerOpen(false)
        setSelectedRegion("")
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.message || "Failed to establish customer")
      }
    } catch (error) {
      console.error("Failed to establish:", error)
      toast.error("Failed to establish customer")
    } finally {
      setEstablishing(false)
    }
  }

  const getRegionName = (regionCode: string) => {
    const region = regions.find((r) => r.region_code === regionCode)
    return region?.region_name || regionCode
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getSourceBadge = (source: string | null) => {
    const colors: Record<string, "green" | "blue" | "purple" | "orange" | "grey"> = {
      consultation: "green",
      emr_video_call: "blue",
      manual: "purple",
      webhook: "orange",
    }
    return (
      <Badge color={colors[source || ""] || "grey"}>
        {source?.replace(/_/g, " ") || "Unknown"}
      </Badge>
    )
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, "green" | "blue" | "orange" | "red" | "grey"> = {
      establishment_created: "green",
      establishment_updated: "blue",
      establishment_expired: "orange",
      manual_establishment: "purple",
      requirement_created: "orange",
      requirement_fulfilled: "green",
    }
    return (
      <Badge color={colors[action] || "grey"}>
        {action.replace(/_/g, " ")}
      </Badge>
    )
  }

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading customer compliance data...</Text>
      </Container>
    )
  }

  const establishedRegions = establishments.filter((e) => e.established)
  const availableRegions = regions.filter(
    (r) => !establishments.some((e) => e.region_code === r.region_code && e.established)
  )

  return (
    <Container className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/compliance">
          <IconButton variant="transparent">
            <ArrowLeft />
          </IconButton>
        </Link>
        <div className="flex-1">
          <Heading level="h1">Customer Compliance</Heading>
          {customer && (
            <Text className="text-ui-fg-subtle mt-1">
              {customer.first_name} {customer.last_name} ({customer.email})
            </Text>
          )}
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-2" />
          Establish in Region
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ui-tag-green-bg">
              <CheckCircle className="w-5 h-5 text-ui-tag-green-text" />
            </div>
            <div>
              <Text className="text-ui-fg-subtle text-sm">Established Regions</Text>
              <Heading level="h3">{establishedRegions.length}</Heading>
            </div>
          </div>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ui-tag-blue-bg">
              <ShieldCheck className="w-5 h-5 text-ui-tag-blue-text" />
            </div>
            <div>
              <Text className="text-ui-fg-subtle text-sm">Total Regions</Text>
              <Heading level="h3">{regions.length}</Heading>
            </div>
          </div>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ui-tag-purple-bg">
              <Clock className="w-5 h-5 text-ui-tag-purple-text" />
            </div>
            <div>
              <Text className="text-ui-fg-subtle text-sm">Audit Events</Text>
              <Heading level="h3">{auditLogs.length}</Heading>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Establishment Status */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Heading level="h2" className="mb-4">Establishment Status</Heading>
          {establishments.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Region</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Source</Table.HeaderCell>
                  <Table.HeaderCell>Expires</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {establishments.map((est) => (
                  <Table.Row key={est.id}>
                    <Table.Cell>
                      <div>
                        <Text className="font-medium">{getRegionName(est.region_code)}</Text>
                        <Text className="text-ui-fg-subtle text-xs">{est.region_code}</Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={est.established ? "green" : "grey"}>
                        {est.established ? "Established" : "Not Established"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {getSourceBadge(est.fulfillment_source)}
                    </Table.Cell>
                    <Table.Cell>
                      <Text className="text-ui-fg-subtle text-sm">
                        {est.expires_at ? formatDate(est.expires_at) : "Never"}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Text className="text-ui-fg-subtle">
                No establishment records for this customer
              </Text>
            </div>
          )}
        </div>

        {/* Audit History */}
        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Heading level="h2" className="mb-4">Audit History</Heading>
          {auditLogs.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="border-b border-ui-border-base pb-3 last:border-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    {getActionBadge(log.action)}
                    <Text className="text-ui-fg-subtle text-xs">
                      {formatDate(log.created_at)}
                    </Text>
                  </div>
                  <Text className="text-sm text-ui-fg-subtle capitalize">
                    {log.entity_type.replace(/_/g, " ")}
                  </Text>
                  {log.reason && (
                    <Text className="text-xs text-ui-fg-muted mt-1">
                      {log.reason}
                    </Text>
                  )}
                  <Text className="text-xs text-ui-fg-muted">
                    By: {log.action_by_type}
                    {log.action_by_id && ` (${log.action_by_id.slice(0, 8)}...)`}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Text className="text-ui-fg-subtle">
                No audit history for this customer
              </Text>
            </div>
          )}
        </div>
      </div>

      {/* Establish Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Establish Customer in Region</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="p-4 space-y-4">
            <Text className="text-ui-fg-subtle">
              Manually establish this customer in a region. This will allow them
              to purchase products requiring establishment in that region.
            </Text>

            <div>
              <label className="block text-sm font-medium mb-2">Select Region</label>
              <Select
                value={selectedRegion}
                onValueChange={setSelectedRegion}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a region..." />
                </Select.Trigger>
                <Select.Content>
                  {availableRegions.length > 0 ? (
                    availableRegions.map((region) => (
                      <Select.Item key={region.id} value={region.region_code}>
                        {region.region_name} ({region.region_code})
                      </Select.Item>
                    ))
                  ) : (
                    <Select.Item value="" disabled>
                      Customer is established in all regions
                    </Select.Item>
                  )}
                </Select.Content>
              </Select>
            </div>

            {customer && (
              <div className="bg-ui-bg-subtle rounded-lg p-3">
                <Text className="text-sm font-medium">Customer</Text>
                <Text className="text-ui-fg-subtle text-sm">
                  {customer.first_name} {customer.last_name}
                </Text>
                <Text className="text-ui-fg-muted text-xs">{customer.email}</Text>
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              variant="secondary"
              onClick={() => setDrawerOpen(false)}
              disabled={establishing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEstablish}
              disabled={establishing || !selectedRegion}
            >
              {establishing ? "Establishing..." : "Establish Customer"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Customer Compliance",
})

export default CustomerCompliancePage

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
import { CurrencyDollar, Users, ArrowUpMini, ArrowDownMini } from "@medusajs/icons"

type LoyaltyStats = {
  total_accounts: number
  total_points_issued: number
  total_points_redeemed: number
  total_points_balance: number
  tier_distribution: {
    tier_name: string
    count: number
    percentage: number
  }[]
  recent_transactions: {
    id: string
    customer_email: string
    type: string
    amount: number
    created_at: string
  }[]
}

type Config = {
  earn_rate: number
  redemption_rate: number
  signup_bonus_enabled: boolean
  birthday_bonus_enabled: boolean
  expiration_enabled: boolean
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: { value: number; positive: boolean }
}) => (
  <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div>
        <Text className="text-ui-fg-subtle text-sm">{title}</Text>
        <Heading level="h2" className="mt-1">{value}</Heading>
        {subtitle && (
          <Text className="text-ui-fg-muted text-xs mt-1">{subtitle}</Text>
        )}
      </div>
      <div className="p-2 bg-ui-bg-subtle rounded-lg">
        <Icon className="w-5 h-5 text-ui-fg-subtle" />
      </div>
    </div>
    {trend && (
      <div className="flex items-center mt-2 text-xs">
        {trend.positive ? (
          <ArrowUpMini className="w-4 h-4 text-ui-tag-green-text" />
        ) : (
          <ArrowDownMini className="w-4 h-4 text-ui-tag-red-text" />
        )}
        <span className={trend.positive ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}>
          {trend.value}%
        </span>
        <span className="text-ui-fg-muted ml-1">vs last month</span>
      </div>
    )}
  </div>
)

const LoyaltyDashboard = () => {
  const [stats, setStats] = useState<LoyaltyStats | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, configRes] = await Promise.all([
          fetch("/admin/loyalty/stats", { credentials: "include" }),
          fetch("/admin/loyalty/config", { credentials: "include" }),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData.stats)
        }

        if (configRes.ok) {
          const configData = await configRes.json()
          // Convert array to object
          const configObj: any = {}
          configData.config?.forEach((c: { key: string; value: any }) => {
            configObj[c.key] = c.value
          })
          setConfig(configObj)
        }
      } catch (error) {
        console.error("Failed to fetch loyalty data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <Container className="p-8">
        <Text>Loading loyalty dashboard...</Text>
      </Container>
    )
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <Container className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Heading level="h1">Loyalty Program</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Manage your customer rewards and loyalty program
          </Text>
        </div>
        <div className="flex gap-2">
          <Link to="/loyalty/tiers">
            <Button variant="secondary">Manage Tiers</Button>
          </Link>
          <Link to="/loyalty/config">
            <Button>Configure</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Accounts"
          value={formatNumber(stats?.total_accounts || 0)}
          subtitle="Active loyalty members"
          icon={Users}
        />
        <StatCard
          title="Points Issued"
          value={formatNumber(stats?.total_points_issued || 0)}
          subtitle="Lifetime points earned"
          icon={CurrencyDollar}
        />
        <StatCard
          title="Points Redeemed"
          value={formatNumber(stats?.total_points_redeemed || 0)}
          subtitle="Total points used"
          icon={CurrencyDollar}
        />
        <StatCard
          title="Points Balance"
          value={formatNumber(stats?.total_points_balance || 0)}
          subtitle="Outstanding points"
          icon={CurrencyDollar}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Distribution */}
        <div className="lg:col-span-1 bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <Heading level="h2" className="mb-4">Tier Distribution</Heading>
          {stats?.tier_distribution && stats.tier_distribution.length > 0 ? (
            <div className="space-y-3">
              {stats.tier_distribution.map((tier) => (
                <div key={tier.tier_name}>
                  <div className="flex justify-between text-sm mb-1">
                    <Text>{tier.tier_name}</Text>
                    <Text className="text-ui-fg-subtle">
                      {tier.count} ({tier.percentage.toFixed(1)}%)
                    </Text>
                  </div>
                  <div className="w-full bg-ui-bg-subtle rounded-full h-2">
                    <div
                      className="bg-ui-tag-purple-bg h-2 rounded-full"
                      style={{ width: `${tier.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-ui-fg-subtle">No tier data available</Text>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Heading level="h2">Recent Activity</Heading>
          </div>
          {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Points</Table.HeaderCell>
                  <Table.HeaderCell>Date</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {stats.recent_transactions.slice(0, 5).map((tx) => (
                  <Table.Row key={tx.id}>
                    <Table.Cell>
                      <Text className="text-sm">{tx.customer_email}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={tx.amount > 0 ? "green" : "orange"}
                        size="small"
                      >
                        {tx.type.replace(/_/g, " ")}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text className={tx.amount > 0 ? "text-ui-tag-green-text" : "text-ui-tag-orange-text"}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text className="text-ui-fg-subtle text-sm">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          ) : (
            <Text className="text-ui-fg-subtle">No recent transactions</Text>
          )}
        </div>
      </div>

      {/* Quick Config Overview */}
      <div className="mt-6 bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
        <Heading level="h2" className="mb-4">Program Settings</Heading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Text className="text-ui-fg-subtle text-sm">Earn Rate</Text>
            <Text className="font-medium">{config?.earn_rate || 1} point per $1</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-sm">Redemption Rate</Text>
            <Text className="font-medium">{config?.redemption_rate || 100} points = $1</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-sm">Signup Bonus</Text>
            <Badge color={config?.signup_bonus_enabled ? "green" : "grey"}>
              {config?.signup_bonus_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div>
            <Text className="text-ui-fg-subtle text-sm">Point Expiration</Text>
            <Badge color={config?.expiration_enabled ? "orange" : "grey"}>
              {config?.expiration_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Loyalty",
  icon: CurrencyDollar,
})

export default LoyaltyDashboard

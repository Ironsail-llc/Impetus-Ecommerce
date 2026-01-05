import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Heading,
    Text,
    Badge,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { CurrencyDollar, Users, ArrowUpMini, ArrowDownMini, ChartBar } from "@medusajs/icons"

type AnalyticsStats = {
    active_subscriptions: number
    churn_rate: number
    total_revenue: number
    patient_ltv_avg: number
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

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState<AnalyticsStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/admin/analytics", { credentials: "include" })
                if (response.ok) {
                    const data = await response.json()
                    setStats(data.stats)
                }
            } catch (error) {
                console.error("Failed to fetch analytics data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <Container className="p-8">
                <Text>Loading analytics dashboard...</Text>
            </Container>
        )
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount / 100) // Assuming amount is in cents
    }

    return (
        <Container className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Heading level="h1">Analytics</Heading>
                    <Text className="text-ui-fg-subtle mt-1">
                        Overview of store performance and subscription metrics
                    </Text>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats?.total_revenue || 0)}
                    subtitle="All time revenue"
                    icon={CurrencyDollar}
                />
                <StatCard
                    title="Active Subscriptions"
                    value={stats?.active_subscriptions || 0}
                    subtitle="Current active subscribers"
                    icon={Users}
                />
                <StatCard
                    title="Churn Rate"
                    value={`${(stats?.churn_rate || 0) * 100}%`}
                    subtitle="Monthly churn"
                    icon={ChartBar}
                    trend={{ value: 0.5, positive: true }} // Mock trend for now
                />
                <StatCard
                    title="Avg Patient LTV"
                    value={formatCurrency(stats?.patient_ltv_avg || 0)}
                    subtitle="Lifetime Value"
                    icon={CurrencyDollar}
                />
            </div>

            {!stats && (
                <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
                    <Text className="text-ui-fg-subtle">
                        No analytics data available yet.
                    </Text>
                </div>
            )}

            <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <Heading level="h3" className="mb-2">Data Source info</Heading>
                <Text className="text-ui-fg-subtle text-sm">
                    This dashboard pulls real-time data from the Order and Customer modules.
                    Subscription metrics are currently placeholders pending full Subscription Module integration.
                </Text>
            </div>

        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Analytics",
    icon: ChartBar,
})

export default AnalyticsDashboard

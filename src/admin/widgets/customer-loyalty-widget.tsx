import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Label,
  Textarea,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { CurrencyDollar, Plus, Minus } from "@medusajs/icons"

type LoyaltyData = {
  account: {
    id: string
    balance: number
    lifetime_earned: number
    lifetime_redeemed: number
    tier_id: string | null
    referral_code: string | null
  }
  tier: {
    id: string
    name: string
    discount_percent: number
  } | null
  recent_transactions: {
    id: string
    type: string
    amount: number
    description: string
    created_at: string
  }[]
}

const CustomerLoyaltyWidget = ({ data }: { data: { id: string } }) => {
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchLoyalty = async () => {
    try {
      const response = await fetch(`/admin/loyalty/customers/${data.id}`, {
        credentials: "include",
      })
      if (response.ok) {
        const result = await response.json()
        setLoyalty(result)
      }
    } catch (error) {
      console.error("Failed to fetch loyalty data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoyalty()
  }, [data.id])

  const handleAdjust = async (isPositive: boolean) => {
    if (!adjustAmount || isNaN(Number(adjustAmount))) return

    setSubmitting(true)
    try {
      const amount = isPositive ? Number(adjustAmount) : -Number(adjustAmount)
      const response = await fetch(`/admin/loyalty/customers/${data.id}/adjust`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          reason: adjustReason || `Manual ${isPositive ? "credit" : "debit"} adjustment`,
        }),
      })

      if (response.ok) {
        setAdjusting(false)
        setAdjustAmount("")
        setAdjustReason("")
        fetchLoyalty()
      }
    } catch (error) {
      console.error("Failed to adjust points:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Text className="text-ui-fg-subtle">Loading loyalty data...</Text>
      </Container>
    )
  }

  if (!loyalty?.account) {
    return (
      <Container className="p-4">
        <Heading level="h2" className="mb-2">
          <CurrencyDollar className="inline mr-2" />
          Loyalty Points
        </Heading>
        <Text className="text-ui-fg-subtle">
          No loyalty account for this customer yet.
        </Text>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Heading level="h2">
          <CurrencyDollar className="inline mr-2" />
          Loyalty Points
        </Heading>
        {loyalty.tier && (
          <Badge color="purple">{loyalty.tier.name}</Badge>
        )}
      </div>

      {/* Balance */}
      <div className="bg-ui-bg-subtle rounded-lg p-4 mb-4">
        <Text className="text-ui-fg-subtle text-sm">Current Balance</Text>
        <div className="flex items-baseline gap-2">
          <Heading level="h1" className="text-2xl">
            {loyalty.account.balance.toLocaleString()}
          </Heading>
          <Text className="text-ui-fg-subtle">points</Text>
        </div>
        <Text className="text-ui-fg-muted text-xs mt-1">
          Redeemable for rewards & coupons
        </Text>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-ui-bg-base border border-ui-border-base rounded p-3">
          <Text className="text-ui-fg-subtle text-xs">Lifetime Earned</Text>
          <Text className="font-medium text-ui-tag-green-text">
            +{loyalty.account.lifetime_earned.toLocaleString()}
          </Text>
        </div>
        <div className="bg-ui-bg-base border border-ui-border-base rounded p-3">
          <Text className="text-ui-fg-subtle text-xs">Lifetime Redeemed</Text>
          <Text className="font-medium text-ui-tag-orange-text">
            -{loyalty.account.lifetime_redeemed.toLocaleString()}
          </Text>
        </div>
      </div>

      {/* Tier Benefits - Discount Only */}
      {loyalty.tier && (
        <div className="mb-4 p-3 border border-ui-border-base rounded-lg">
          <Text className="text-sm font-medium mb-2">{loyalty.tier.name} Benefits</Text>
          {loyalty.tier.discount_percent > 0 ? (
            <div className="flex justify-between text-sm">
              <Text className="text-ui-fg-subtle">Auto Discount</Text>
              <Badge color="green">{loyalty.tier.discount_percent}% off all orders</Badge>
            </div>
          ) : (
            <Text className="text-ui-fg-muted text-sm">No automatic discount at this tier</Text>
          )}
        </div>
      )}

      {/* Referral Code */}
      {loyalty.account.referral_code && (
        <div className="mb-4 p-3 bg-ui-bg-subtle rounded-lg">
          <Text className="text-ui-fg-subtle text-xs">Referral Code</Text>
          <Text className="font-mono font-medium">{loyalty.account.referral_code}</Text>
        </div>
      )}

      {/* Adjustment Form */}
      {adjusting ? (
        <div className="border border-ui-border-base rounded-lg p-3 mb-4">
          <Label className="text-sm mb-2">Adjust Points</Label>
          <Input
            type="number"
            placeholder="Amount"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="mb-2"
          />
          <Textarea
            placeholder="Reason (optional)"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            className="mb-3"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="small"
              onClick={() => handleAdjust(true)}
              disabled={submitting || !adjustAmount}
            >
              <Plus className="mr-1" />
              Credit
            </Button>
            <Button
              size="small"
              variant="secondary"
              onClick={() => handleAdjust(false)}
              disabled={submitting || !adjustAmount}
            >
              <Minus className="mr-1" />
              Debit
            </Button>
            <Button
              size="small"
              variant="transparent"
              onClick={() => setAdjusting(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="small"
          className="w-full mb-4"
          onClick={() => setAdjusting(true)}
        >
          Adjust Points
        </Button>
      )}

      {/* Recent Transactions */}
      {loyalty.recent_transactions && loyalty.recent_transactions.length > 0 && (
        <div>
          <Text className="text-sm font-medium mb-2">Recent Activity</Text>
          <div className="space-y-2">
            {loyalty.recent_transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center text-sm p-2 bg-ui-bg-subtle rounded"
              >
                <div>
                  <Text className="text-xs text-ui-fg-subtle">
                    {tx.type.replace(/_/g, " ")}
                  </Text>
                  {tx.description && (
                    <Text className="text-xs text-ui-fg-muted truncate max-w-[150px]">
                      {tx.description}
                    </Text>
                  )}
                </div>
                <Text
                  className={
                    tx.amount > 0
                      ? "text-ui-tag-green-text font-medium"
                      : "text-ui-tag-orange-text font-medium"
                  }
                >
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.after",
})

export default CustomerLoyaltyWidget

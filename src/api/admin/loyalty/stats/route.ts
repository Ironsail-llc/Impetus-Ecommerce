import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../modules/loyalty/service"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/loyalty/stats
 * Get loyalty program statistics for the dashboard
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)

  try {
    // Get all accounts
    const accounts = await loyaltyService.listLoyaltyAccounts({})

    // Calculate totals
    const totalAccounts = accounts.length
    const totalPointsBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
    const totalPointsIssued = accounts.reduce((sum, acc) => sum + acc.lifetime_earned, 0)
    const totalPointsRedeemed = accounts.reduce((sum, acc) => sum + acc.lifetime_redeemed, 0)

    // Get tier distribution
    const tiers = await loyaltyService.getAllTiers()
    const tierCounts: Record<string, number> = {}

    // Initialize counts for all tiers
    for (const tier of tiers) {
      tierCounts[tier.id] = 0
    }

    // Count no-tier accounts
    let noTierCount = 0

    for (const account of accounts) {
      if (account.tier_id && tierCounts[account.tier_id] !== undefined) {
        tierCounts[account.tier_id]++
      } else {
        noTierCount++
      }
    }

    const tierDistribution = tiers.map((tier) => ({
      tier_id: tier.id,
      tier_name: tier.name,
      count: tierCounts[tier.id] || 0,
      percentage: totalAccounts > 0 ? ((tierCounts[tier.id] || 0) / totalAccounts) * 100 : 0,
    }))

    // Add no-tier category if any
    if (noTierCount > 0) {
      tierDistribution.unshift({
        tier_id: "none",
        tier_name: "No Tier",
        count: noTierCount,
        percentage: (noTierCount / totalAccounts) * 100,
      })
    }

    // Get recent transactions with customer info
    const allTransactions: Array<{
      id: string
      type: string
      amount: number
      description: string | null
      created_at: Date
      customer_id: string
    }> = []

    for (const account of accounts.slice(0, 50)) {
      const transactions = await loyaltyService.listLoyaltyTransactions({
        account_id: account.id,
      })
      for (const tx of transactions) {
        allTransactions.push({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          created_at: tx.created_at,
          customer_id: account.customer_id,
        })
      }
    }

    // Sort by date and take last 20
    allTransactions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Get customer emails for recent transactions
    const recentTransactions: Array<{
      id: string
      customer_email: string
      type: string
      amount: number
      description: string | null
      created_at: Date
    }> = []
    const customerService = req.scope.resolve(Modules.CUSTOMER) as any

    for (const tx of allTransactions.slice(0, 20)) {
      try {
        const customer = await customerService.retrieveCustomer(tx.customer_id)
        recentTransactions.push({
          id: tx.id,
          customer_email: customer?.email || "Unknown",
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          created_at: tx.created_at,
        })
      } catch {
        recentTransactions.push({
          id: tx.id,
          customer_email: "Unknown",
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          created_at: tx.created_at,
        })
      }
    }

    res.json({
      stats: {
        total_accounts: totalAccounts,
        total_points_issued: totalPointsIssued,
        total_points_redeemed: totalPointsRedeemed,
        total_points_balance: totalPointsBalance,
        tier_distribution: tierDistribution,
        recent_transactions: recentTransactions,
      },
    })
  } catch (error) {
    console.error("Failed to get loyalty stats:", error)
    res.status(500).json({ message: "Failed to get loyalty stats" })
  }
}

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService, { TRANSACTION_TYPES } from "../../../../../../modules/loyalty/service"

type RouteParams = {
  id: string
}

/**
 * POST /admin/loyalty/customers/:id/adjust
 * Manually adjust points for a customer
 *
 * Body: {
 *   amount: number (positive to add, negative to deduct),
 *   reason: string (required - audit trail)
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id: customerId } = req.params
  const adminId = req.auth_context?.actor_id

  const { amount, reason } = req.body as unknown as {
    amount: number
    reason: string
  }

  if (amount === undefined || amount === 0) {
    return res.status(400).json({
      message: "Amount is required and must be non-zero",
    })
  }

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({
      message: "Reason is required for audit purposes",
    })
  }

  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Check if deduction would result in negative balance
  if (amount < 0 && account.balance + amount < 0) {
    return res.status(400).json({
      message: `Cannot deduct ${Math.abs(amount)} points. Customer only has ${account.balance} points.`,
    })
  }

  // Create the adjustment
  const description = `Admin adjustment: ${reason} (by ${adminId || "admin"})`

  let updatedAccount
  if (amount > 0) {
    updatedAccount = await loyaltyService.earnPoints(
      customerId,
      "default",
      amount,
      TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
      description,
      "admin_adjustment",
      adminId
    )
  } else {
    // For deductions, we need to handle it manually since earnPoints expects positive amounts
    const newBalance = account.balance + amount // amount is negative

    await loyaltyService.createLoyaltyTransactions({
      account_id: account.id,
      type: TRANSACTION_TYPES.ADMIN_ADJUSTMENT,
      amount: amount, // negative
      balance_after: newBalance,
      description,
      reference_type: "admin_adjustment",
      reference_id: adminId,
    })

    updatedAccount = await loyaltyService.updateLoyaltyAccounts({
      id: account.id,
      balance: newBalance,
      last_activity_at: new Date(),
    })
  }

  // Get updated tier
  const tier = await loyaltyService.getCustomerTier(customerId)

  res.json({
    account: updatedAccount,
    tier,
    adjustment: {
      amount,
      reason,
      adjusted_by: adminId,
    },
  })
}

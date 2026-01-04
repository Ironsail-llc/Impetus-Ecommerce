import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { LOYALTY_MODULE } from "../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../modules/loyalty/service"

type RouteParams = {
  id: string
}

/**
 * GET /admin/loyalty/customers/:id
 * Get loyalty information for a specific customer
 */
export async function GET(
  req: AuthenticatedMedusaRequest<RouteParams>,
  res: MedusaResponse
) {
  const loyaltyService: LoyaltyModuleService = req.scope.resolve(LOYALTY_MODULE)
  const { id: customerId } = req.params

  // Get or create account
  const account = await loyaltyService.getOrCreateAccount(customerId)

  // Get current tier
  const tier = await loyaltyService.getCustomerTier(customerId)

  // Get redemption rate for value calculation
  const redemptionRate = await loyaltyService.getConfig<number>("redemption_rate")
  const pointsValue = account.balance / redemptionRate

  // Get recent transactions
  const transactions = await loyaltyService.getTransactionHistory(customerId, "default", 20)

  res.json({
    account: {
      ...account,
      points_value: pointsValue,
    },
    tier,
    transactions,
  })
}

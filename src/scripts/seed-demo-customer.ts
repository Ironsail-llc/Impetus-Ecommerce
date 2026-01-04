import { MedusaContainer } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"

export default async function seedDemoCustomer({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const storeModuleService = container.resolve(Modules.STORE)
  const loyaltyService: LoyaltyModuleService = container.resolve(LOYALTY_MODULE)

  logger.info("Seeding demo customer with loyalty points...")

  // Get the store
  const [store] = await storeModuleService.listStores()
  const storeId = store?.id || "default"

  // Check if demo customer already exists
  const existingCustomers = await customerModuleService.listCustomers({
    email: "demo@impetus.com"
  })

  let customer
  if (existingCustomers.length > 0) {
    customer = existingCustomers[0]
    logger.info(`Demo customer already exists: ${customer.id}`)
  } else {
    // Create the demo customer
    customer = await customerModuleService.createCustomers({
      email: "demo@impetus.com",
      first_name: "Demo",
      last_name: "Customer",
      has_account: true,
      metadata: {
        demo_account: true
      }
    })
    logger.info(`Created demo customer: ${customer.id}`)
  }

  // Get or create loyalty account for the customer
  const loyaltyAccount = await loyaltyService.getOrCreateAccount(customer.id, storeId)
  logger.info(`Loyalty account: ${loyaltyAccount.id}`)

  // Check current balance
  const currentBalance = await loyaltyService.getAccountBalance(customer.id, storeId)
  logger.info(`Current loyalty balance: ${currentBalance}`)

  // Add bonus points if balance is low
  if (currentBalance < 5000) {
    const pointsToAdd = 5000 - currentBalance
    await loyaltyService.addPoints(customer.id, pointsToAdd)
    logger.info(`Added ${pointsToAdd} bonus points to demo customer`)
  }

  // Get the tier info
  const tiers = await loyaltyService.getAllTiers(storeId)
  const lifetimeEarned = loyaltyAccount.lifetime_earned || 0
  const currentTier = tiers.find(t =>
    lifetimeEarned >= t.threshold &&
    !tiers.some(higher => higher.threshold > t.threshold && lifetimeEarned >= higher.threshold)
  )

  logger.info(`
========================================
DEMO CUSTOMER CREATED SUCCESSFULLY
========================================
Email: demo@impetus.com
Password: demo1234 (set via Medusa admin)
Customer ID: ${customer.id}
Loyalty Balance: ${currentBalance < 5000 ? 5000 : currentBalance} points
Lifetime Earned: ${lifetimeEarned} points
Current Tier: ${currentTier?.name || 'Bronze'}
Store ID: ${storeId}
========================================
  `)

  return customer
}

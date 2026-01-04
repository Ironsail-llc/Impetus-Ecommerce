import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { LOYALTY_MODULE } from "../index"
import LoyaltyModuleService from "../service"

jest.setTimeout(120000)

import seedVIPProgram from "../../../scripts/seed-vip-program"

medusaIntegrationTestRunner({
    testSuite: ({ getContainer }) => {
        let loyaltyService: LoyaltyModuleService
        let container

        beforeEach(async () => {
            container = getContainer()
            loyaltyService = container.resolve(LOYALTY_MODULE)

            // key step: Seed the VIP program configuration into the test database
            await seedVIPProgram({ container }, "default")
        })

        describe("Valhalla Vitality VIP Program Rules", () => {
            // Test data
            const customerId = "cus_vip_test_01"

            beforeEach(async () => {
                // Ensure clean state if possible, or use unique IDs per test
                // Ideally we'd reset DB, but integration test runner usually handles transaction rollback
            })

            it("should implement Valhalla Vitality Tier Structure", async () => {
                // 1. Verify Tiers exist
                const tiers = await loyaltyService.getAllTiers()
                expect(tiers).toHaveLength(4)

                const tierNames = tiers.map(t => t.name).sort()
                expect(tierNames).toEqual(["Bronze", "Gold", "Platinum", "Silver"])

                // 2. Verify Thresholds
                const silver = tiers.find(t => t.name === "Silver")
                const gold = tiers.find(t => t.name === "Gold")
                const platinum = tiers.find(t => t.name === "Platinum")

                expect(silver?.threshold).toBe(500)
                expect(gold?.threshold).toBe(1000)
                expect(platinum?.threshold).toBe(5000)
            })

            it("should award 1 point per $1 spent (Standard Earn Rate)", async () => {
                // defined in seed-vip-program.ts: earn_rate = 1
                const amount = 150.00
                const points = await loyaltyService.calculatePointsFromAmount(amount)
                expect(points).toBe(150)
            })

            it("should auto-upgrade customer to Silver after earning 500 points", async () => {
                const testUser = "cus_upgrade_test_01"

                // Initial state: Should be default tier (Bronze) or null
                const initialTier = await loyaltyService.getCustomerTier(testUser)
                // Depending on implementation, might return null or default tier. 
                // Based on service.ts logic: "If !account.tier_id return await this.getDefaultTier()"
                // Bronze is set as is_default: true in seed.
                expect(initialTier?.name).toBe("Bronze")

                // Earn 500 points
                await loyaltyService.earnPoints(
                    testUser,
                    "default",
                    500,
                    "purchase",
                    "Order #123"
                )

                // Verify Upgrade
                const newTier = await loyaltyService.getCustomerTier(testUser)
                expect(newTier?.name).toBe("Silver")
            })

            it("should calculate discount with 50:1 redemption rate", async () => {
                // 50 points = $1 discount. 
                // So 500 points should be $10
                const points = 500
                const discount = await loyaltyService.calculateDiscountFromPoints(points)
                expect(discount).toBe(10)
            })

            it("should require minimum 500 points for redemption", async () => {
                const testUser = "cus_redemption_test_01"

                // Give 200 points
                await loyaltyService.earnPoints(testUser, "default", 200, "bonus", "Small bonus")

                // Try to redeem 200 (should fail, min is 500)
                await expect(
                    loyaltyService.redeemPoints(testUser, "default", 200, "Try redeem")
                ).rejects.toThrow(/Minimum redemption/)
            })
        })
    },
})

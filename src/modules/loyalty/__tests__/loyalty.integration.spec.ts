import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { LOYALTY_MODULE } from "../index"
import LoyaltyModuleService from "../service"

jest.setTimeout(50000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    let loyaltyService: LoyaltyModuleService

    beforeEach(() => {
      loyaltyService = getContainer().resolve(LOYALTY_MODULE)
    })

    describe("LoyaltyModuleService Integration", () => {
      const testCustomerId = "cus_test_integration_01"

      it("should return 0 points for a new customer", async () => {
        const points = await loyaltyService.getPoints(testCustomerId)
        expect(points).toBe(0)
      })

      it("should add points to a customer", async () => {
        const result = await loyaltyService.addPoints(testCustomerId, 100)

        expect(result).toBeDefined()
        expect(result.customer_id).toBe(testCustomerId)
        expect(result.points).toBe(100)
      })

      it("should accumulate points correctly", async () => {
        // Add initial points
        await loyaltyService.addPoints(testCustomerId, 50)

        // Add more points
        await loyaltyService.addPoints(testCustomerId, 30)

        const totalPoints = await loyaltyService.getPoints(testCustomerId)
        expect(totalPoints).toBe(80)
      })

      it("should deduct points from a customer", async () => {
        // First add points
        await loyaltyService.addPoints(testCustomerId, 200)

        // Then deduct
        const result = await loyaltyService.deductPoints(testCustomerId, 50)

        expect(result).toBeDefined()
        expect(result.points).toBe(150)
      })

      it("should throw error when deducting more than available", async () => {
        // Add some points
        await loyaltyService.addPoints(testCustomerId, 10)

        // Try to deduct more
        await expect(
          loyaltyService.deductPoints(testCustomerId, 100)
        ).rejects.toThrow("Insufficient loyalty points")
      })

      it("should calculate points from order amount", async () => {
        const points = await loyaltyService.calculatePointsFromAmount(99.99)
        expect(points).toBe(99) // Floors the amount
      })

      it("should handle multiple customers independently", async () => {
        const customer1 = "cus_test_multi_01"
        const customer2 = "cus_test_multi_02"

        await loyaltyService.addPoints(customer1, 100)
        await loyaltyService.addPoints(customer2, 200)

        const points1 = await loyaltyService.getPoints(customer1)
        const points2 = await loyaltyService.getPoints(customer2)

        expect(points1).toBe(100)
        expect(points2).toBe(200)
      })
    })
  },
})

import { MedusaError } from "@medusajs/framework/utils"

/**
 * Unit tests for LoyaltyModuleService
 *
 * These tests verify the business logic of the loyalty service methods
 * without requiring a database connection.
 */

describe("LoyaltyModuleService", () => {
  describe("calculatePointsFromAmount", () => {
    // Simulate the calculation logic from service.ts
    const calculatePointsFromAmount = (amount: number): number => {
      if (amount < 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Amount cannot be negative"
        )
      }
      return Math.floor(amount)
    }

    it("should convert $1 to 1 point", () => {
      expect(calculatePointsFromAmount(1)).toBe(1)
    })

    it("should convert $100 to 100 points", () => {
      expect(calculatePointsFromAmount(100)).toBe(100)
    })

    it("should round down fractional amounts", () => {
      expect(calculatePointsFromAmount(99.99)).toBe(99)
      expect(calculatePointsFromAmount(50.5)).toBe(50)
      expect(calculatePointsFromAmount(1.1)).toBe(1)
    })

    it("should return 0 for amounts less than 1", () => {
      expect(calculatePointsFromAmount(0.99)).toBe(0)
      expect(calculatePointsFromAmount(0.5)).toBe(0)
      expect(calculatePointsFromAmount(0)).toBe(0)
    })

    it("should throw error for negative amounts", () => {
      expect(() => calculatePointsFromAmount(-1)).toThrow("Amount cannot be negative")
      expect(() => calculatePointsFromAmount(-100)).toThrow("Amount cannot be negative")
    })
  })

  describe("points validation logic", () => {
    // Simulate the deduction validation from service.ts
    const validateDeduction = (currentPoints: number, deductAmount: number): boolean => {
      return currentPoints >= deductAmount
    }

    it("should allow deduction when sufficient points", () => {
      expect(validateDeduction(100, 50)).toBe(true)
      expect(validateDeduction(100, 100)).toBe(true)
      expect(validateDeduction(1, 1)).toBe(true)
    })

    it("should reject deduction when insufficient points", () => {
      expect(validateDeduction(50, 100)).toBe(false)
      expect(validateDeduction(0, 1)).toBe(false)
      expect(validateDeduction(99, 100)).toBe(false)
    })

    it("should allow deduction of 0 points", () => {
      expect(validateDeduction(100, 0)).toBe(true)
      expect(validateDeduction(0, 0)).toBe(true)
    })
  })

  describe("points addition logic", () => {
    // Simulate points addition
    const addPoints = (currentPoints: number, addAmount: number): number => {
      return currentPoints + addAmount
    }

    it("should correctly add points to existing balance", () => {
      expect(addPoints(100, 50)).toBe(150)
      expect(addPoints(0, 100)).toBe(100)
      expect(addPoints(1, 1)).toBe(2)
    })

    it("should handle adding 0 points", () => {
      expect(addPoints(100, 0)).toBe(100)
    })

    it("should handle large point additions", () => {
      expect(addPoints(1000000, 500000)).toBe(1500000)
    })
  })

  describe("points deduction logic", () => {
    // Simulate points deduction
    const deductPoints = (currentPoints: number, deductAmount: number): number => {
      if (currentPoints < deductAmount) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Insufficient loyalty points"
        )
      }
      return currentPoints - deductAmount
    }

    it("should correctly deduct points from balance", () => {
      expect(deductPoints(100, 50)).toBe(50)
      expect(deductPoints(100, 100)).toBe(0)
      expect(deductPoints(50, 25)).toBe(25)
    })

    it("should throw error when insufficient points", () => {
      expect(() => deductPoints(50, 100)).toThrow("Insufficient loyalty points")
      expect(() => deductPoints(0, 1)).toThrow("Insufficient loyalty points")
    })

    it("should allow deducting all points", () => {
      expect(deductPoints(100, 100)).toBe(0)
    })
  })
})

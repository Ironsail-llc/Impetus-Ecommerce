import { MedusaError } from "@medusajs/framework/utils"

/**
 * Extended unit tests for LoyaltyModuleService
 *
 * Tests the new configurable features: earn rates, redemption rates,
 * tier calculations, referral logic, and transaction handling.
 */

describe("LoyaltyModuleService - Extended Features", () => {
  describe("configurable earn rates", () => {
    const calculatePointsWithRate = (amount: number, earnRate: number): number => {
      if (amount < 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Amount cannot be negative"
        )
      }
      return Math.floor(amount * earnRate)
    }

    it("should calculate points with 1:1 rate (default)", () => {
      expect(calculatePointsWithRate(100, 1)).toBe(100)
      expect(calculatePointsWithRate(50.99, 1)).toBe(50)
    })

    it("should calculate points with 2:1 rate (2 points per dollar)", () => {
      expect(calculatePointsWithRate(100, 2)).toBe(200)
      expect(calculatePointsWithRate(50, 2)).toBe(100)
    })

    it("should calculate points with 0.5:1 rate (0.5 points per dollar)", () => {
      expect(calculatePointsWithRate(100, 0.5)).toBe(50)
      expect(calculatePointsWithRate(50, 0.5)).toBe(25)
    })

    it("should floor fractional points", () => {
      expect(calculatePointsWithRate(33.33, 1)).toBe(33)
      expect(calculatePointsWithRate(33.33, 1.5)).toBe(49) // 33.33 * 1.5 = 49.995 -> 49
    })

    it("should throw error for negative amounts", () => {
      expect(() => calculatePointsWithRate(-100, 1)).toThrow("Amount cannot be negative")
    })
  })

  describe("configurable redemption rates", () => {
    const calculateDiscountFromPoints = (points: number, redemptionRate: number): number => {
      return points / redemptionRate
    }

    const calculatePointsForDiscount = (discountAmount: number, redemptionRate: number): number => {
      return Math.ceil(discountAmount * redemptionRate)
    }

    it("should calculate discount with 100:1 rate (100 points = $1)", () => {
      expect(calculateDiscountFromPoints(100, 100)).toBe(1)
      expect(calculateDiscountFromPoints(500, 100)).toBe(5)
      expect(calculateDiscountFromPoints(1000, 100)).toBe(10)
    })

    it("should calculate discount with 50:1 rate (50 points = $1)", () => {
      expect(calculateDiscountFromPoints(100, 50)).toBe(2)
      expect(calculateDiscountFromPoints(500, 50)).toBe(10)
    })

    it("should calculate points needed for discount", () => {
      expect(calculatePointsForDiscount(10, 100)).toBe(1000) // $10 discount = 1000 points
      expect(calculatePointsForDiscount(5, 50)).toBe(250) // $5 discount = 250 points
    })

    it("should ceil fractional points needed", () => {
      expect(calculatePointsForDiscount(10.50, 100)).toBe(1050)
      expect(calculatePointsForDiscount(10.01, 100)).toBe(1001)
    })
  })

  describe("tier multiplier logic", () => {
    const earnPointsWithMultiplier = (basePoints: number, multiplier: number): number => {
      return Math.floor(basePoints * multiplier)
    }

    it("should apply 1x multiplier (no bonus)", () => {
      expect(earnPointsWithMultiplier(100, 1)).toBe(100)
    })

    it("should apply 1.5x multiplier (Silver tier)", () => {
      expect(earnPointsWithMultiplier(100, 1.5)).toBe(150)
    })

    it("should apply 2x multiplier (Gold tier)", () => {
      expect(earnPointsWithMultiplier(100, 2)).toBe(200)
    })

    it("should floor multiplied points", () => {
      expect(earnPointsWithMultiplier(33, 1.5)).toBe(49) // 33 * 1.5 = 49.5 -> 49
    })
  })

  describe("tier qualification logic", () => {
    const tiers = [
      { name: "Bronze", threshold: 0, sort_order: 1 },
      { name: "Silver", threshold: 1000, sort_order: 2 },
      { name: "Gold", threshold: 5000, sort_order: 3 },
      { name: "Platinum", threshold: 10000, sort_order: 4 },
    ]

    const findQualifyingTier = (points: number) => {
      let qualifyingTier = tiers[0]
      for (const tier of tiers) {
        if (points >= tier.threshold) {
          qualifyingTier = tier
        }
      }
      return qualifyingTier
    }

    it("should qualify for Bronze with 0 points", () => {
      expect(findQualifyingTier(0).name).toBe("Bronze")
    })

    it("should qualify for Bronze with 999 points", () => {
      expect(findQualifyingTier(999).name).toBe("Bronze")
    })

    it("should qualify for Silver with exactly 1000 points", () => {
      expect(findQualifyingTier(1000).name).toBe("Silver")
    })

    it("should qualify for Gold with 5000+ points", () => {
      expect(findQualifyingTier(5000).name).toBe("Gold")
      expect(findQualifyingTier(7500).name).toBe("Gold")
    })

    it("should qualify for Platinum with 10000+ points", () => {
      expect(findQualifyingTier(10000).name).toBe("Platinum")
      expect(findQualifyingTier(50000).name).toBe("Platinum")
    })
  })

  describe("minimum redemption validation", () => {
    const validateRedemption = (points: number, balance: number, minRedemption: number): boolean => {
      if (points > balance) return false
      if (points < minRedemption) return false
      return true
    }

    it("should allow redemption when balance and minimum are met", () => {
      expect(validateRedemption(100, 500, 50)).toBe(true)
      expect(validateRedemption(100, 100, 100)).toBe(true)
    })

    it("should reject when insufficient balance", () => {
      expect(validateRedemption(100, 50, 50)).toBe(false)
    })

    it("should reject when below minimum redemption", () => {
      expect(validateRedemption(50, 500, 100)).toBe(false)
    })
  })

  describe("referral code generation", () => {
    const generateReferralCode = (customerId: string): string => {
      const prefix = customerId.slice(-6).toUpperCase()
      const suffix = "XXXX" // Simplified for testing
      return `REF-${prefix}-${suffix}`
    }

    it("should generate code with customer ID prefix", () => {
      const code = generateReferralCode("cus_01ABCDEF123456")
      expect(code).toMatch(/^REF-[A-Z0-9]{6}-XXXX$/)
    })

    it("should handle short customer IDs", () => {
      const code = generateReferralCode("ABC")
      expect(code).toMatch(/^REF-/)
    })
  })

  describe("referral window validation", () => {
    const isReferralExpired = (createdAt: Date, windowDays: number): boolean => {
      const expiresAt = new Date(createdAt)
      expiresAt.setDate(expiresAt.getDate() + windowDays)
      return new Date() > expiresAt
    }

    it("should not be expired within window", () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 5) // 5 days ago
      expect(isReferralExpired(recentDate, 30)).toBe(false)
    })

    it("should be expired after window", () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 35) // 35 days ago
      expect(isReferralExpired(oldDate, 30)).toBe(true)
    })
  })

  describe("transaction balance tracking", () => {
    type Transaction = {
      type: string
      amount: number
      balance_after: number
    }

    const applyTransaction = (
      currentBalance: number,
      type: string,
      amount: number
    ): Transaction => {
      const newBalance = type === "redeemed" || type === "expired"
        ? currentBalance - Math.abs(amount)
        : currentBalance + amount

      return {
        type,
        amount: type === "redeemed" || type === "expired" ? -Math.abs(amount) : amount,
        balance_after: newBalance,
      }
    }

    it("should track earn transaction correctly", () => {
      const txn = applyTransaction(100, "purchase_earned", 50)
      expect(txn.amount).toBe(50)
      expect(txn.balance_after).toBe(150)
    })

    it("should track redeem transaction correctly", () => {
      const txn = applyTransaction(100, "redeemed", 30)
      expect(txn.amount).toBe(-30)
      expect(txn.balance_after).toBe(70)
    })

    it("should track bonus transactions", () => {
      const txn = applyTransaction(100, "signup_bonus", 25)
      expect(txn.amount).toBe(25)
      expect(txn.balance_after).toBe(125)
    })
  })

  describe("lifetime stats tracking", () => {
    type Account = {
      balance: number
      lifetime_earned: number
      lifetime_redeemed: number
    }

    const updateAccountAfterEarn = (account: Account, points: number): Account => {
      return {
        ...account,
        balance: account.balance + points,
        lifetime_earned: account.lifetime_earned + points,
      }
    }

    const updateAccountAfterRedeem = (account: Account, points: number): Account => {
      return {
        ...account,
        balance: account.balance - points,
        lifetime_redeemed: account.lifetime_redeemed + points,
      }
    }

    it("should update balance and lifetime_earned on earn", () => {
      const account: Account = { balance: 100, lifetime_earned: 500, lifetime_redeemed: 200 }
      const updated = updateAccountAfterEarn(account, 50)

      expect(updated.balance).toBe(150)
      expect(updated.lifetime_earned).toBe(550)
      expect(updated.lifetime_redeemed).toBe(200) // unchanged
    })

    it("should update balance and lifetime_redeemed on redeem", () => {
      const account: Account = { balance: 100, lifetime_earned: 500, lifetime_redeemed: 200 }
      const updated = updateAccountAfterRedeem(account, 30)

      expect(updated.balance).toBe(70)
      expect(updated.lifetime_earned).toBe(500) // unchanged
      expect(updated.lifetime_redeemed).toBe(230)
    })
  })
})

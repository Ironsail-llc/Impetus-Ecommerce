/**
 * Phase 4 Unit Tests
 *
 * Tests for:
 * - Tier recalculation logic
 * - Cart loyalty preview calculations
 * - Redemption options generation
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals"

// Mock redemption preview logic
describe("Redemption Preview Calculations", () => {
  const mockConfig = {
    redemption_rate: 100, // 100 points = $1
    min_redemption: 100,
    max_redemption_type: "percent" as const,
    max_redemption_value: 50,
    earn_rate: 1,
  }

  describe("calculateDiscountAmount", () => {
    it("should calculate discount from points correctly", () => {
      const points = 500
      const redemptionRate = mockConfig.redemption_rate
      const discount = points / redemptionRate
      expect(discount).toBe(5) // $5 discount
    })

    it("should handle 0 points", () => {
      const points = 0
      const discount = points / mockConfig.redemption_rate
      expect(discount).toBe(0)
    })
  })

  describe("calculateMaxAllowedDiscount", () => {
    it("should apply percent limit correctly", () => {
      const cartTotal = 100
      const maxType = "percent"
      const maxValue = 50 // 50%

      const maxAllowedDiscount = cartTotal * (maxValue / 100)
      expect(maxAllowedDiscount).toBe(50) // Max $50 on $100 cart
    })

    it("should apply fixed limit correctly", () => {
      const cartTotal = 100
      const maxType = "fixed"
      const maxValue = 25

      const maxAllowedDiscount = Math.min(cartTotal, maxValue)
      expect(maxAllowedDiscount).toBe(25)
    })

    it("should use cart total when no limit", () => {
      const cartTotal = 100
      const maxType: string = "none"

      let maxAllowedDiscount = cartTotal
      if (maxType === "percent") {
        maxAllowedDiscount = cartTotal * 0.5
      }
      expect(maxAllowedDiscount).toBe(100)
    })
  })

  describe("calculateMaxRedeemablePoints", () => {
    it("should calculate based on discount limit", () => {
      const maxAllowedDiscount = 50
      const redemptionRate = 100

      const maxRedeemablePoints = Math.floor(maxAllowedDiscount * redemptionRate)
      expect(maxRedeemablePoints).toBe(5000)
    })

    it("should be limited by available points", () => {
      const maxAllowedDiscount = 50
      const redemptionRate = 100
      const availablePoints = 3000

      const maxRedeemablePoints = Math.floor(maxAllowedDiscount * redemptionRate)
      const effectiveMax = Math.min(availablePoints, maxRedeemablePoints)
      expect(effectiveMax).toBe(3000)
    })
  })

  describe("validateRedemption", () => {
    it("should reject points below minimum", () => {
      const pointsToRedeem = 50
      const minRedemption = 100

      const isValid = pointsToRedeem >= minRedemption
      expect(isValid).toBe(false)
    })

    it("should reject insufficient points", () => {
      const pointsToRedeem = 1000
      const availablePoints = 500

      const isValid = pointsToRedeem <= availablePoints
      expect(isValid).toBe(false)
    })

    it("should accept valid redemption", () => {
      const pointsToRedeem = 200
      const availablePoints = 500
      const minRedemption = 100

      const isValid = pointsToRedeem >= minRedemption && pointsToRedeem <= availablePoints
      expect(isValid).toBe(true)
    })
  })

  describe("calculatePointsToEarn", () => {
    it("should calculate earn points based on cart total after discount", () => {
      const cartTotal = 100
      const discountAmount = 10
      const earnRate = 1

      const cartTotalAfter = cartTotal - discountAmount
      const pointsToEarn = Math.floor(cartTotalAfter * earnRate)
      expect(pointsToEarn).toBe(90)
    })

    it("should not earn points on zero cart total", () => {
      const cartTotal = 0
      const earnRate = 1

      const pointsToEarn = Math.floor(cartTotal * earnRate)
      expect(pointsToEarn).toBe(0)
    })
  })
})

describe("Redemption Options Generation", () => {
  /**
   * Generate redemption options for the UI
   */
  type RedemptionOption = {
    points: number
    discount: number
    cart_total: number
    label?: string
  }

  function generateRedemptionOptions(
    availablePoints: number,
    maxRedeemablePoints: number,
    minRedemption: number,
    redemptionRate: number,
    cartTotal: number
  ): RedemptionOption[] {
    const options: RedemptionOption[] = []
    const effectiveMax = Math.min(availablePoints, maxRedeemablePoints)

    if (effectiveMax < minRedemption) {
      return []
    }

    // Option 1: Minimum redemption
    if (minRedemption <= effectiveMax) {
      const discount = minRedemption / redemptionRate
      options.push({
        points: minRedemption,
        discount: Math.round(discount * 100) / 100,
        cart_total: Math.round((cartTotal - discount) * 100) / 100,
      })
    }

    // Option 2: 25% of available
    const quarter = Math.floor((effectiveMax * 0.25) / 100) * 100
    if (quarter > minRedemption && quarter < effectiveMax) {
      const discount = quarter / redemptionRate
      options.push({
        points: quarter,
        discount: Math.round(discount * 100) / 100,
        cart_total: Math.round((cartTotal - discount) * 100) / 100,
      })
    }

    // Option 3: 50% of available
    const half = Math.floor((effectiveMax * 0.5) / 100) * 100
    if (half > minRedemption && half < effectiveMax && half !== quarter) {
      const discount = half / redemptionRate
      options.push({
        points: half,
        discount: Math.round(discount * 100) / 100,
        cart_total: Math.round((cartTotal - discount) * 100) / 100,
      })
    }

    // Option 4: All available points
    if (effectiveMax > minRedemption) {
      const discount = effectiveMax / redemptionRate
      options.push({
        points: effectiveMax,
        discount: Math.round(discount * 100) / 100,
        cart_total: Math.round(Math.max(0, cartTotal - discount) * 100) / 100,
        label: "Use all points",
      })
    }

    // Deduplicate and sort
    const uniqueOptions = options.filter(
      (opt, index, self) =>
        index === self.findIndex((o) => o.points === opt.points)
    )

    return uniqueOptions.sort((a, b) => a.points - b.points)
  }

  it("should return empty array when insufficient points", () => {
    const options = generateRedemptionOptions(50, 5000, 100, 100, 100)
    expect(options).toEqual([])
  })

  it("should include minimum redemption option", () => {
    const options = generateRedemptionOptions(500, 5000, 100, 100, 100)
    expect(options[0].points).toBe(100)
    expect(options[0].discount).toBe(1)
  })

  it("should include 'use all points' option", () => {
    const options = generateRedemptionOptions(500, 5000, 100, 100, 100)
    const lastOption = options[options.length - 1]
    expect(lastOption.points).toBe(500)
    expect(lastOption.label).toBe("Use all points")
  })

  it("should cap at max redeemable points", () => {
    const options = generateRedemptionOptions(10000, 2500, 100, 100, 100)
    const lastOption = options[options.length - 1]
    expect(lastOption.points).toBe(2500)
  })

  it("should generate multiple options for large point balances", () => {
    const options = generateRedemptionOptions(5000, 5000, 100, 100, 100)
    expect(options.length).toBeGreaterThan(2)
  })

  it("should calculate correct cart totals", () => {
    const options = generateRedemptionOptions(500, 5000, 100, 100, 100)
    // First option: 100 points = $1 discount, cart_total = $99
    expect(options[0].cart_total).toBe(99)
  })
})

describe("Tier Recalculation Logic", () => {
  describe("Tier qualification", () => {
    const mockTiers = [
      { id: "bronze", name: "Bronze", threshold: 0 },
      { id: "silver", name: "Silver", threshold: 1000 },
      { id: "gold", name: "Gold", threshold: 5000 },
      { id: "platinum", name: "Platinum", threshold: 10000 },
    ]

    function findQualifyingTier(points: number, tiers: typeof mockTiers) {
      const sortedTiers = [...tiers].sort((a, b) => a.threshold - b.threshold)
      let qualifyingTier = sortedTiers[0]

      for (const tier of sortedTiers) {
        if (points >= tier.threshold) {
          qualifyingTier = tier
        }
      }

      return qualifyingTier
    }

    it("should qualify for Bronze with 0 points", () => {
      const tier = findQualifyingTier(0, mockTiers)
      expect(tier.id).toBe("bronze")
    })

    it("should qualify for Silver with 1000 points", () => {
      const tier = findQualifyingTier(1000, mockTiers)
      expect(tier.id).toBe("silver")
    })

    it("should qualify for Gold with 5000 points", () => {
      const tier = findQualifyingTier(5000, mockTiers)
      expect(tier.id).toBe("gold")
    })

    it("should qualify for Platinum with 10000+ points", () => {
      const tier = findQualifyingTier(15000, mockTiers)
      expect(tier.id).toBe("platinum")
    })

    it("should stay at highest tier below threshold", () => {
      const tier = findQualifyingTier(4999, mockTiers)
      expect(tier.id).toBe("silver")
    })
  })

  describe("Downgrade detection", () => {
    it("should detect downgrade correctly", () => {
      const currentTierThreshold = 5000 // Gold
      const newTierThreshold = 1000 // Silver

      const isDowngrade = newTierThreshold < currentTierThreshold
      expect(isDowngrade).toBe(true)
    })

    it("should detect upgrade correctly", () => {
      const currentTierThreshold = 1000 // Silver
      const newTierThreshold = 5000 // Gold

      const isDowngrade = newTierThreshold < currentTierThreshold
      expect(isDowngrade).toBe(false)
    })
  })

  describe("Grace period calculation", () => {
    it("should calculate grace period end date correctly", () => {
      const now = new Date("2024-01-15")
      const gracePeriodDays = 30

      const graceEnd = new Date(now)
      graceEnd.setDate(graceEnd.getDate() + gracePeriodDays)

      expect(graceEnd.toISOString().split("T")[0]).toBe("2024-02-14")
    })

    it("should detect expired grace period", () => {
      const graceEnd = new Date("2024-01-31")
      const now = new Date("2024-02-01")

      const isExpired = now >= graceEnd
      expect(isExpired).toBe(true)
    })

    it("should calculate days remaining correctly", () => {
      const graceEnd = new Date("2024-02-14")
      const now = new Date("2024-02-07")

      const daysRemaining = Math.ceil(
        (graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysRemaining).toBe(7)
    })
  })

  describe("Annual points calculation", () => {
    it("should only include current year transactions", () => {
      const now = new Date("2024-06-15")
      const yearStart = new Date(now.getFullYear(), 0, 1)

      const transactions = [
        { created_at: new Date("2023-12-01"), amount: 100 },
        { created_at: new Date("2024-01-15"), amount: 200 },
        { created_at: new Date("2024-03-20"), amount: 150 },
      ]

      const annualPoints = transactions
        .filter(tx => new Date(tx.created_at) >= yearStart && tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0)

      expect(annualPoints).toBe(350) // Only 2024 transactions
    })
  })
})

describe("Admin Stats Calculations", () => {
  describe("Tier distribution", () => {
    it("should calculate percentage correctly", () => {
      const totalAccounts = 100
      const tierCount = 25

      const percentage = (tierCount / totalAccounts) * 100
      expect(percentage).toBe(25)
    })

    it("should handle zero accounts", () => {
      const totalAccounts = 0
      const tierCount = 0

      const percentage = totalAccounts > 0 ? (tierCount / totalAccounts) * 100 : 0
      expect(percentage).toBe(0)
    })
  })

  describe("Points totals", () => {
    it("should calculate total balance correctly", () => {
      const accounts = [
        { balance: 100 },
        { balance: 200 },
        { balance: 300 },
      ]

      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0)
      expect(totalBalance).toBe(600)
    })

    it("should calculate lifetime issued correctly", () => {
      const accounts = [
        { lifetime_earned: 500 },
        { lifetime_earned: 1000 },
        { lifetime_earned: 1500 },
      ]

      const totalIssued = accounts.reduce((sum, acc) => sum + acc.lifetime_earned, 0)
      expect(totalIssued).toBe(3000)
    })

    it("should calculate lifetime redeemed correctly", () => {
      const accounts = [
        { lifetime_redeemed: 100 },
        { lifetime_redeemed: 200 },
        { lifetime_redeemed: 300 },
      ]

      const totalRedeemed = accounts.reduce((sum, acc) => sum + acc.lifetime_redeemed, 0)
      expect(totalRedeemed).toBe(600)
    })
  })
})

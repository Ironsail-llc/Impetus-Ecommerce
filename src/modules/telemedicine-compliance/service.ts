import { MedusaError, MedusaService } from "@medusajs/framework/utils"

// Models
import CustomerRegionEstablishment from "./models/customer-region-establishment"
import RegionComplianceRule from "./models/region-compliance-rule"
import ComplianceConfiguration from "./models/compliance-configuration"
import ComplianceAuditLog from "./models/compliance-audit-log"
import ComplianceRequirement from "./models/compliance-requirement"

// Types
import {
  CustomerRegionEstablishmentType,
  RegionComplianceRuleType,
  ComplianceConfigurationType,
  ComplianceRequirementType,
  ComplianceEvaluationResult,
  EstablishCustomerInput,
  FulfillmentSource,
  DEFAULT_COMPLIANCE_CONFIG,
} from "./types"

class TelemedicineComplianceService extends MedusaService({
  CustomerRegionEstablishment,
  RegionComplianceRule,
  ComplianceConfiguration,
  ComplianceAuditLog,
  ComplianceRequirement,
}) {
  // Configuration cache
  private configCache: Map<string, any> = new Map()
  private configCacheTime: number = 0
  private readonly CACHE_TTL = 60000 // 1 minute

  constructor() {
    // @ts-ignore
    super(...arguments)
    console.log("TELEMEDICINE_COMPLIANCE_SERVICE: initializing...")
  }

  // ==================== CONFIGURATION METHODS ====================

  /**
   * Get a configuration value by key for a specific store
   */
  async getConfig<T = any>(key: string, storeId: string = "default"): Promise<T> {
    await this.ensureConfigCache(storeId)

    const cacheKey = `${storeId}:${key}`
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey) as T
    }

    return (DEFAULT_COMPLIANCE_CONFIG as any)[key] as T
  }

  /**
   * Set a configuration value for a specific store
   */
  async setConfig(
    key: string,
    value: any,
    category: string,
    storeId: string,
    adminId?: string,
    description?: string
  ): Promise<ComplianceConfigurationType> {
    const existing = await this.listComplianceConfigurations({
      key,
      store_id: storeId,
    })

    let config: ComplianceConfigurationType
    if (existing.length > 0) {
      config = await this.updateComplianceConfigurations({
        id: existing[0].id,
        value,
        updated_by: adminId,
      })
    } else {
      config = await this.createComplianceConfigurations({
        key,
        value,
        category,
        store_id: storeId,
        value_type: typeof value,
        updated_by: adminId,
        description,
      })
    }

    // Invalidate cache
    this.configCache.set(`${storeId}:${key}`, value)

    // Audit log
    await this.createAuditLog(
      storeId,
      "configuration",
      config.id,
      existing.length > 0 ? "updated" : "created",
      "admin",
      adminId,
      { key, value }
    )

    return config
  }

  /**
   * Get all configuration values for a specific store
   */
  async getAllConfig(storeId: string = "default"): Promise<Record<string, any>> {
    await this.ensureConfigCache(storeId)

    const storeConfig: Record<string, any> = {}
    for (const [k, v] of this.configCache.entries()) {
      if (k.startsWith(`${storeId}:`)) {
        const cleanKey = k.split(":")[1]
        storeConfig[cleanKey] = v
      }
    }

    return { ...DEFAULT_COMPLIANCE_CONFIG, ...storeConfig }
  }

  private async ensureConfigCache(storeId: string = "default"): Promise<void> {
    const now = Date.now()
    if (this.configCache.size > 0 && now - this.configCacheTime < this.CACHE_TTL) {
      return
    }

    const configs = await this.listComplianceConfigurations({
      store_id: storeId,
    })

    for (const config of configs) {
      this.configCache.set(`${storeId}:${config.key}`, config.value)
    }

    this.configCacheTime = now
  }

  invalidateConfigCache(): void {
    this.configCacheTime = 0
  }

  // ==================== REGION RULE METHODS ====================

  /**
   * Get region compliance rule
   */
  async getRegionRule(
    regionCode: string,
    storeId: string = "default"
  ): Promise<RegionComplianceRuleType | null> {
    const rules = await this.listRegionComplianceRules({
      region_code: regionCode,
      store_id: storeId,
      active: true,
    })

    return rules[0] || null
  }

  /**
   * Check if region requires establishment
   */
  async regionRequiresEstablishment(
    regionCode: string,
    storeId: string = "default"
  ): Promise<boolean> {
    const rule = await this.getRegionRule(regionCode, storeId)
    return rule?.requires_establishment || false
  }

  /**
   * Get all active region rules for a store
   */
  async getAllRegionRules(storeId: string = "default"): Promise<RegionComplianceRuleType[]> {
    return await this.listRegionComplianceRules({
      store_id: storeId,
      active: true,
    })
  }

  // ==================== ESTABLISHMENT METHODS ====================

  /**
   * Check if customer is established in a region
   */
  async isCustomerEstablished(
    customerId: string,
    regionCode: string,
    storeId: string = "default"
  ): Promise<boolean> {
    const establishment = await this.getCustomerEstablishment(customerId, regionCode, storeId)

    if (!establishment || !establishment.established) {
      return false
    }

    // Check expiration
    if (establishment.expires_at && new Date(establishment.expires_at) < new Date()) {
      // Mark as expired
      await this.updateCustomerRegionEstablishments({
        id: establishment.id,
        established: false,
      })

      await this.createAuditLog(
        storeId,
        "establishment",
        establishment.id,
        "expired",
        "system",
        null,
        { expires_at: establishment.expires_at }
      )

      return false
    }

    return true
  }

  /**
   * Get customer establishment record
   */
  async getCustomerEstablishment(
    customerId: string,
    regionCode: string,
    storeId: string = "default"
  ): Promise<CustomerRegionEstablishmentType | null> {
    const establishments = await this.listCustomerRegionEstablishments({
      customer_id: customerId,
      region_code: regionCode,
      store_id: storeId,
    })

    return establishments[0] || null
  }

  /**
   * Get all establishments for a customer
   */
  async getCustomerEstablishments(
    customerId: string,
    storeId: string = "default"
  ): Promise<CustomerRegionEstablishmentType[]> {
    return await this.listCustomerRegionEstablishments({
      customer_id: customerId,
      store_id: storeId,
      established: true,
    })
  }

  /**
   * Establish a customer in a region
   */
  async establishCustomer(input: EstablishCustomerInput): Promise<CustomerRegionEstablishmentType> {
    const {
      customer_id,
      region_code,
      source,
      reference_id,
      reference_type,
      expires_at,
      admin_id,
      reason,
    } = input

    const storeId = "default" // TODO: Get from context

    // Check if already established
    const existing = await this.getCustomerEstablishment(customer_id, region_code, storeId)

    let establishment: CustomerRegionEstablishmentType

    // Calculate expiration if not provided
    let finalExpiresAt = expires_at
    if (finalExpiresAt === undefined) {
      const expirationDays = await this.getConfig<number | null>(
        "establishment_expiration_days",
        storeId
      )
      if (expirationDays) {
        finalExpiresAt = new Date()
        finalExpiresAt.setDate(finalExpiresAt.getDate() + expirationDays)
      } else {
        finalExpiresAt = null // indefinite
      }
    }

    if (existing) {
      // Update existing record
      establishment = await this.updateCustomerRegionEstablishments({
        id: existing.id,
        established: true,
        established_at: new Date(),
        expires_at: finalExpiresAt,
        fulfillment_source: source,
        fulfillment_reference_id: reference_id,
        fulfillment_reference_type: reference_type,
      })
    } else {
      // Create new record
      establishment = await this.createCustomerRegionEstablishments({
        store_id: storeId,
        customer_id,
        region_code,
        established: true,
        established_at: new Date(),
        expires_at: finalExpiresAt,
        fulfillment_source: source,
        fulfillment_reference_id: reference_id,
        fulfillment_reference_type: reference_type,
      })
    }

    // Audit log
    await this.createAuditLog(
      storeId,
      "establishment",
      establishment.id,
      existing ? "updated" : "created",
      source === "manual" ? "admin" : "system",
      admin_id,
      {
        customer_id,
        region_code,
        source,
        reference_id,
        expires_at: finalExpiresAt,
      },
      reason
    )

    // Fulfill any pending requirements for this customer/region
    await this.fulfillPendingRequirements(customer_id, region_code, storeId, source, reference_id)

    return establishment
  }

  /**
   * Revoke customer establishment (admin action)
   */
  async revokeEstablishment(
    customerId: string,
    regionCode: string,
    storeId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const establishment = await this.getCustomerEstablishment(customerId, regionCode, storeId)

    if (!establishment) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Establishment record not found"
      )
    }

    await this.updateCustomerRegionEstablishments({
      id: establishment.id,
      established: false,
    })

    await this.createAuditLog(
      storeId,
      "establishment",
      establishment.id,
      "revoked",
      "admin",
      adminId,
      { customer_id: customerId, region_code: regionCode },
      reason
    )
  }

  // ==================== COMPLIANCE EVALUATION ====================

  /**
   * Evaluate compliance requirements for an order
   * This is the main method called after checkout
   */
  async evaluateOrderCompliance(
    customerId: string,
    regionCode: string,
    productIds: string[],
    orderId: string,
    storeId: string = "default"
  ): Promise<ComplianceEvaluationResult> {
    // Check if region requires establishment
    const regionRequires = await this.regionRequiresEstablishment(regionCode, storeId)

    // Check if any products are controlled substances
    const controlledSubstanceConfig = await this.getConfig<boolean>(
      "controlled_substance_requires_consultation",
      storeId
    )

    // TODO: Check product compliance metadata for controlled substances
    // For now, we'll just check region requirements
    const hasControlledSubstance = false // Placeholder - will integrate with product-compliance module

    const requiresEstablishment = regionRequires || (controlledSubstanceConfig && hasControlledSubstance)

    if (!requiresEstablishment) {
      return {
        requires_establishment: false,
        reason: null,
        region_code: regionCode,
        is_established: true,
        establishment_expires_at: null,
        triggering_products: [],
      }
    }

    // Check if customer is established
    const isEstablished = await this.isCustomerEstablished(customerId, regionCode, storeId)
    const establishment = await this.getCustomerEstablishment(customerId, regionCode, storeId)

    const result: ComplianceEvaluationResult = {
      requires_establishment: true,
      reason: regionRequires ? "region_establishment" : "controlled_substance",
      region_code: regionCode,
      is_established: isEstablished,
      establishment_expires_at: establishment?.expires_at || null,
      triggering_products: hasControlledSubstance ? productIds : [],
    }

    // If not established, create a compliance requirement
    if (!isEstablished) {
      await this.createComplianceRequirements({
        store_id: storeId,
        customer_id: customerId,
        order_id: orderId,
        region_code: regionCode,
        requirement_type: result.reason!,
        status: "pending",
        triggering_product_ids: result.triggering_products as unknown as Record<string, unknown>,
      })
    }

    return result
  }

  // ==================== REQUIREMENT METHODS ====================

  /**
   * Get pending requirements for a customer
   */
  async getPendingRequirements(
    customerId: string,
    storeId: string = "default"
  ): Promise<ComplianceRequirementType[]> {
    return await this.listComplianceRequirements({
      customer_id: customerId,
      store_id: storeId,
      status: "pending",
    })
  }

  /**
   * Fulfill pending requirements when customer becomes established
   */
  private async fulfillPendingRequirements(
    customerId: string,
    regionCode: string,
    storeId: string,
    source: FulfillmentSource,
    referenceId?: string
  ): Promise<void> {
    const pendingRequirements = await this.listComplianceRequirements({
      customer_id: customerId,
      region_code: regionCode,
      store_id: storeId,
      status: "pending",
    })

    for (const requirement of pendingRequirements) {
      await this.updateComplianceRequirements({
        id: requirement.id,
        status: "fulfilled",
        fulfilled_at: new Date(),
        fulfilled_by: source,
        fulfillment_reference_id: referenceId,
      })

      await this.createAuditLog(
        storeId,
        "requirement",
        requirement.id,
        "fulfilled",
        "system",
        null,
        { source, reference_id: referenceId }
      )
    }
  }

  /**
   * Waive a compliance requirement (admin action)
   */
  async waiveRequirement(
    requirementId: string,
    storeId: string,
    adminId: string,
    reason?: string
  ): Promise<ComplianceRequirementType> {
    const requirement = await this.retrieveComplianceRequirement(requirementId)

    if (!requirement) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Requirement not found"
      )
    }

    const updated = await this.updateComplianceRequirements({
      id: requirementId,
      status: "waived",
      fulfilled_at: new Date(),
      fulfilled_by: "manual",
    })

    await this.createAuditLog(
      storeId,
      "requirement",
      requirementId,
      "waived",
      "admin",
      adminId,
      { customer_id: requirement.customer_id, order_id: requirement.order_id },
      reason
    )

    return updated
  }

  // ==================== AUDIT LOG METHODS ====================

  /**
   * Create an audit log entry
   */
  private async createAuditLog(
    storeId: string,
    entityType: string,
    entityId: string,
    action: string,
    actionByType: string,
    actionById: string | null | undefined,
    changes?: Record<string, any>,
    reason?: string
  ): Promise<void> {
    await this.createComplianceAuditLogs({
      store_id: storeId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      action_by_type: actionByType,
      action_by_id: actionById || null,
      changes,
      reason,
    })
  }

  /**
   * Get audit history for a customer
   */
  async getCustomerAuditHistory(
    customerId: string,
    storeId: string = "default",
    limit: number = 50
  ): Promise<any[]> {
    // Get all establishments for this customer
    const establishments = await this.listCustomerRegionEstablishments({
      customer_id: customerId,
      store_id: storeId,
    })

    const establishmentIds = establishments.map((e) => e.id)

    // Get all requirements for this customer
    const requirements = await this.listComplianceRequirements({
      customer_id: customerId,
      store_id: storeId,
    })

    const requirementIds = requirements.map((r) => r.id)

    // Get all audit logs for these entities
    const allLogs = await this.listComplianceAuditLogs({
      store_id: storeId,
    })

    // Filter to relevant entities
    const relevantLogs = allLogs.filter(
      (log) =>
        (log.entity_type === "establishment" && establishmentIds.includes(log.entity_id)) ||
        (log.entity_type === "requirement" && requirementIds.includes(log.entity_id))
    )

    // Sort by created_at descending and limit
    return relevantLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  }
}

export default TelemedicineComplianceService

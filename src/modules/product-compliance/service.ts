import { MedusaService } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import ProductControlledSubstance from "./models/product-controlled-substance"

export type ProductControlledSubstanceType = InferTypeOf<typeof ProductControlledSubstance>

export type ControlledSubstanceSchedule =
  | "none"
  | "schedule_ii"
  | "schedule_iii"
  | "schedule_iv"
  | "schedule_v"

class ProductComplianceService extends MedusaService({
  ProductControlledSubstance,
}) {
  constructor() {
    // @ts-ignore
    super(...arguments)
    console.log("PRODUCT_COMPLIANCE_SERVICE: initializing...")
  }

  /**
   * Get or create compliance metadata for a product
   */
  async getOrCreateProductCompliance(
    productId: string,
    storeId: string = "default"
  ): Promise<ProductControlledSubstanceType> {
    // We need the product link to work, but for now we'll use a simple pattern
    // The actual linking happens via module links
    const existing = await this.listProductControlledSubstances({
      store_id: storeId,
    })

    // Filter by ID if there's a link field (will be added via module link)
    const found = existing.find((p: any) => p.id === productId)
    if (found) {
      return found
    }

    // Create new record - the ID will be linked via module link
    return await this.createProductControlledSubstances({
      store_id: storeId,
      controlled_substance: "none",
      requires_synchronous_consultation: false,
      is_consultation_product: false,
    })
  }

  /**
   * Check if a product is a controlled substance
   */
  async isControlledSubstance(productId: string): Promise<boolean> {
    try {
      const compliance = await this.retrieveProductControlledSubstance(productId)
      if (!compliance) return false
      return compliance.controlled_substance !== "none"
    } catch {
      return false
    }
  }

  /**
   * Check if a product requires synchronous consultation
   */
  async requiresConsultation(productId: string): Promise<boolean> {
    try {
      const compliance = await this.retrieveProductControlledSubstance(productId)
      if (!compliance) return false

      // Explicit override
      if (compliance.requires_synchronous_consultation) {
        return true
      }

      // Controlled substances may require consultation (based on global config)
      // This check would typically be done in conjunction with the compliance module
      return false
    } catch {
      return false
    }
  }

  /**
   * Check if a product can fulfill establishment requirements
   */
  async isConsultationProduct(productId: string): Promise<boolean> {
    try {
      const compliance = await this.retrieveProductControlledSubstance(productId)
      if (!compliance) return false
      return compliance.is_consultation_product
    } catch {
      return false
    }
  }

  /**
   * Get product compliance settings by product ID
   * Uses metadata to find linked product (module link will be added later)
   */
  async getProductCompliance(productId: string): Promise<ProductControlledSubstanceType | null> {
    try {
      // Try to retrieve directly by ID (if this IS the compliance record ID)
      const direct = await this.retrieveProductControlledSubstance(productId)
      if (direct) return direct
    } catch {
      // Not found by direct ID
    }

    // Search in metadata for product_id
    const all = await this.listProductControlledSubstances({})
    const found = all.find((p) => {
      const meta = p.metadata as Record<string, unknown> | null
      return meta?.product_id === productId
    })

    return found || null
  }

  /**
   * Get all consultation products for a store
   */
  async getConsultationProducts(storeId: string = "default"): Promise<ProductControlledSubstanceType[]> {
    return await this.listProductControlledSubstances({
      store_id: storeId,
      is_consultation_product: true,
    })
  }

  /**
   * Get all controlled substance products for a store
   */
  async getControlledSubstanceProducts(storeId: string = "default"): Promise<ProductControlledSubstanceType[]> {
    const all = await this.listProductControlledSubstances({
      store_id: storeId,
    })

    return all.filter((p) => p.controlled_substance !== "none")
  }

  /**
   * Update product compliance settings
   */
  async updateProductCompliance(
    productId: string,
    data: {
      controlled_substance?: ControlledSubstanceSchedule
      requires_synchronous_consultation?: boolean
      is_consultation_product?: boolean
      consultation_product_id?: string | null
      metadata?: Record<string, any>
    }
  ): Promise<ProductControlledSubstanceType> {
    return await this.updateProductControlledSubstances({
      id: productId,
      ...data,
    })
  }
}

export default ProductComplianceService

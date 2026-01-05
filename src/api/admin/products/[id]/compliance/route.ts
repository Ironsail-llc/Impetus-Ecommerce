import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_COMPLIANCE_MODULE } from "../../../../../modules/product-compliance"
import ProductComplianceService from "../../../../../modules/product-compliance/service"

type ControlledSubstanceLevel =
  | "none"
  | "schedule_ii"
  | "schedule_iii"
  | "schedule_iv"
  | "schedule_v"

interface UpdateProductComplianceBody {
  controlled_substance?: ControlledSubstanceLevel
  requires_synchronous_consultation?: boolean
  is_consultation_product?: boolean
  consultation_product_id?: string | null
  metadata?: Record<string, unknown>
}

/**
 * GET /admin/products/:id/compliance
 * Get product compliance settings
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productComplianceService: ProductComplianceService = req.scope.resolve(
    PRODUCT_COMPLIANCE_MODULE
  )

  const productId = req.params.id

  const compliance = await productComplianceService.getProductCompliance(productId)

  res.json({
    product_id: productId,
    compliance: compliance || {
      controlled_substance: "none",
      requires_synchronous_consultation: false,
      is_consultation_product: false,
      consultation_product_id: null,
    },
  })
}

/**
 * PUT /admin/products/:id/compliance
 * Update product compliance settings
 */
export async function PUT(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const productComplianceService: ProductComplianceService = req.scope.resolve(
    PRODUCT_COMPLIANCE_MODULE
  )

  const productId = req.params.id
  const body = req.body as UpdateProductComplianceBody

  // Check if compliance record exists
  let compliance = await productComplianceService.getProductCompliance(productId)

  if (compliance) {
    // Update existing
    const updated = await productComplianceService.updateProductControlledSubstances(
      { id: compliance.id },
      {
        controlled_substance: body.controlled_substance,
        requires_synchronous_consultation: body.requires_synchronous_consultation,
        is_consultation_product: body.is_consultation_product,
        consultation_product_id: body.consultation_product_id,
        metadata: body.metadata as Record<string, unknown>,
      }
    )
    compliance = updated[0]
  } else {
    // Create new
    compliance = await productComplianceService.createProductControlledSubstances({
      store_id: "default",
      controlled_substance: body.controlled_substance || "none",
      requires_synchronous_consultation: body.requires_synchronous_consultation || false,
      is_consultation_product: body.is_consultation_product || false,
      consultation_product_id: body.consultation_product_id || null,
      metadata: body.metadata as Record<string, unknown>,
    })

    // Link to product - this needs to be done via the module link
    // For now, we store the product_id in metadata
    await productComplianceService.updateProductControlledSubstances(
      { id: compliance.id },
      {
        metadata: {
          ...(body.metadata || {}),
          product_id: productId,
        } as Record<string, unknown>,
      }
    )
  }

  res.json({
    product_id: productId,
    compliance,
    message: "Product compliance settings updated",
  })
}

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { TELEMEDICINE_COMPLIANCE_MODULE } from "../../../../modules/telemedicine-compliance"
import TelemedicineComplianceService from "../../../../modules/telemedicine-compliance/service"

/**
 * GET /admin/compliance/regions
 * Get all region compliance rules
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const regions = await complianceService.getAllRegionRules()

  res.json({ regions })
}

/**
 * POST /admin/compliance/regions
 * Create a new region compliance rule
 *
 * Body: {
 *   region_code: string,
 *   region_name: string,
 *   country_code: string,
 *   requires_establishment: boolean,
 *   establishment_expiration_days?: number | null,
 *   active?: boolean,
 *   metadata?: object
 * }
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const complianceService: TelemedicineComplianceService = req.scope.resolve(
    TELEMEDICINE_COMPLIANCE_MODULE
  )

  const {
    region_code,
    region_name,
    country_code,
    requires_establishment,
    establishment_expiration_days,
    active = true,
    metadata,
  } = req.body as {
    region_code: string
    region_name: string
    country_code: string
    requires_establishment: boolean
    establishment_expiration_days?: number | null
    active?: boolean
    metadata?: Record<string, any>
  }

  if (!region_code || !region_name || !country_code) {
    return res.status(400).json({
      message: "region_code, region_name, and country_code are required",
    })
  }

  // Check if region already exists
  const existing = await complianceService.getRegionRule(region_code)
  if (existing) {
    return res.status(409).json({
      message: `Region rule for ${region_code} already exists`,
    })
  }

  const region = await complianceService.createRegionComplianceRules({
    store_id: "default",
    region_code,
    region_name,
    country_code,
    requires_establishment: requires_establishment || false,
    establishment_expiration_days,
    active,
    metadata,
  })

  res.status(201).json({ region })
}

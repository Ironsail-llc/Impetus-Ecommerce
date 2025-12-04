import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import DigitalProductModuleService from "../../../../modules/digital-product/service"
import { DIGITAL_PRODUCT_MODULE } from "../../../../modules/digital-product"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [digitalProduct],
  } = await query.graph({
    entity: "digital_product",
    fields: ["*", "medias.*", "product_variant.*", "product_variant.product.*"],
    filters: {
      id: req.params.id,
    },
  })

  if (!digitalProduct) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Digital product with id ${req.params.id} not found`
    )
  }

  res.json({
    digital_product: digitalProduct,
  })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const digitalProductModuleService: DigitalProductModuleService =
    req.scope.resolve(DIGITAL_PRODUCT_MODULE)

  await digitalProductModuleService.deleteDigitalProducts(req.params.id)

  res.json({
    id: req.params.id,
    object: "digital_product",
    deleted: true,
  })
}

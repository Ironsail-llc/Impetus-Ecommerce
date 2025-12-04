import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/bundles/:id - Get a single bundle for storefront
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: bundles } = await query.graph({
    entity: "bundle",
    fields: [
      "*",
      "items.*",
      "product.*",
      "product.variants.*",
      "product.variants.prices.*",
      "product.images.*",
      "items.product.*",
      "items.product.variants.*",
      "items.product.variants.prices.*",
      "items.product.images.*",
    ],
    filters: {
      id,
    },
  })

  if (!bundles.length) {
    return res.status(404).json({ message: "Bundle not found" })
  }

  res.json({ bundle: bundles[0] })
}

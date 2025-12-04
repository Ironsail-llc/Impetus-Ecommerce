import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/bundles - List all bundles for storefront
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: bundles, metadata } = await query.graph({
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
    pagination: {
      skip: Number(req.query.offset) || 0,
      take: Number(req.query.limit) || 20,
    },
  })

  res.json({
    bundles,
    count: metadata?.count || bundles.length,
    offset: Number(req.query.offset) || 0,
    limit: Number(req.query.limit) || 20,
  })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BUNDLED_PRODUCT_MODULE } from "../../../modules/bundled-product"
import BundledProductModuleService from "../../../modules/bundled-product/service"
import { createBundledProductWorkflow } from "../../../workflows/bundled-product"

// GET /admin/bundles - List all bundles
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: bundles, metadata } = await query.graph({
    entity: "bundle",
    fields: [
      "*",
      "items.*",
      "product.*",
      "items.product.*",
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

// POST /admin/bundles - Create a new bundle
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { title, description, product, items } = req.body as {
    title: string
    description?: string
    product: any
    items: { product_id: string; quantity: number }[]
  }

  const { result } = await createBundledProductWorkflow(req.scope).run({
    input: {
      bundle: {
        title,
        description,
        product,
        items,
      },
    },
  })

  res.status(201).json({ bundle: result })
}

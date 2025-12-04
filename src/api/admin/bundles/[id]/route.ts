import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BUNDLED_PRODUCT_MODULE } from "../../../../modules/bundled-product"
import BundledProductModuleService from "../../../../modules/bundled-product/service"

// GET /admin/bundles/:id - Get a single bundle
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: bundles } = await query.graph({
    entity: "bundle",
    fields: [
      "*",
      "items.*",
      "product.*",
      "items.product.*",
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

// PUT /admin/bundles/:id - Update a bundle
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { title, description } = req.body as {
    title?: string
    description?: string
  }

  const bundledProductModuleService: BundledProductModuleService =
    req.scope.resolve(BUNDLED_PRODUCT_MODULE)

  const bundle = await bundledProductModuleService.updateBundles({
    id,
    title,
    description,
  })

  res.json({ bundle })
}

// DELETE /admin/bundles/:id - Delete a bundle
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const bundledProductModuleService: BundledProductModuleService =
    req.scope.resolve(BUNDLED_PRODUCT_MODULE)

  await bundledProductModuleService.deleteBundles(id)

  res.status(200).json({ id, deleted: true })
}

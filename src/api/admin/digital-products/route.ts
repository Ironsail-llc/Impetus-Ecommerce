import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import createDigitalProductWorkflow from "../../../workflows/digital-product/create-digital-product"
import { CreateDigitalProductMediaInput } from "../../../workflows/digital-product/steps/create-digital-product-medias"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { fields, limit = 20, offset = 0 } = (req as any).validatedQuery || {}
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: digitalProducts,
    metadata: { count, take, skip } = {},
  } = await query.graph({
    entity: "digital_product",
    fields: ["*", "medias.*", "product_variant.*", ...(fields || [])],
    pagination: {
      skip: offset as number,
      take: limit as number,
    },
  })

  res.json({
    digital_products: digitalProducts,
    count,
    limit: take,
    offset: skip,
  })
}

type CreateRequestBody = {
  name: string
  medias: {
    type: string
    file_id: string
    mime_type: string
  }[]
  product: any
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateRequestBody>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [shippingProfile],
  } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  const body = req.body as CreateRequestBody

  const { result } = await createDigitalProductWorkflow(req.scope).run({
    input: {
      digital_product: {
        name: body.name,
        medias: body.medias.map((media) => ({
          fileId: media.file_id,
          mimeType: media.mime_type,
          type: media.type,
        })) as Omit<CreateDigitalProductMediaInput, "digital_product_id">[],
      },
      product: {
        ...body.product,
        shipping_profile_id: shippingProfile?.id,
      },
    },
  })

  res.json({
    digital_product: result.digital_product,
  })
}

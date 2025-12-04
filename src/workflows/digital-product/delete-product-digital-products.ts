import {
  createWorkflow,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import DigitalProductModuleService from "../../modules/digital-product/service"
import { DIGITAL_PRODUCT_MODULE } from "../../modules/digital-product"

type DeleteProductDigitalProductsWorkflowInput = {
  id: string
}

const getProductDigitalProductsStep = createStep(
  "get-product-digital-products",
  async ({ productId }: { productId: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["digital_product.*"],
      filters: {
        product_id: productId,
      },
    })

    const digitalProductIds = variants
      .filter((v: any) => v.digital_product)
      .map((v: any) => v.digital_product.id)

    return new StepResponse({ digitalProductIds })
  }
)

const deleteDigitalProductsStep = createStep(
  "delete-digital-products",
  async (
    { digitalProductIds }: { digitalProductIds: string[] },
    { container }
  ) => {
    if (!digitalProductIds.length) {
      return new StepResponse(null)
    }

    const digitalProductModuleService: DigitalProductModuleService =
      container.resolve(DIGITAL_PRODUCT_MODULE)

    await digitalProductModuleService.deleteDigitalProducts(digitalProductIds)

    return new StepResponse(null)
  }
)

export const deleteProductDigitalProductsWorkflow = createWorkflow(
  "delete-product-digital-products",
  ({ id }: DeleteProductDigitalProductsWorkflowInput) => {
    const { digitalProductIds } = getProductDigitalProductsStep({
      productId: id,
    })

    when({ digitalProductIds }, (data) => data.digitalProductIds.length > 0).then(
      () => {
        deleteDigitalProductsStep({ digitalProductIds })
      }
    )

    return new WorkflowResponse(null)
  }
)

export default deleteProductDigitalProductsWorkflow

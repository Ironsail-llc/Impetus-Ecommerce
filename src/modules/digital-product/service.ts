import { MedusaService } from "@medusajs/framework/utils"
import DigitalProduct from "./models/digital-product"
import DigitalProductMedia from "./models/digital-product-media"
import DigitalProductOrder from "./models/digital-product-order"

class DigitalProductModuleService extends MedusaService({
  DigitalProduct,
  DigitalProductMedia,
  DigitalProductOrder,
}) {}

export default DigitalProductModuleService

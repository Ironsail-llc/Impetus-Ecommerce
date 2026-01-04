import { MedusaService } from "@medusajs/framework/utils"
import Subscription from "./models/subscription"

class SubscriptionModuleService extends MedusaService({
    Subscription,
}) {
    // Custom methods will go here
}

export default SubscriptionModuleService

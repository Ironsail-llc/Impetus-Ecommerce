import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import AnalyticsModuleService from "../../../modules/analytics/service"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
    const analyticsService = req.scope.resolve<AnalyticsModuleService>(ANALYTICS_MODULE)

    // In a real multi-tenant setup, we would extract store_id from auth context
    const storeId = (req.auth_context?.actor_id as string) || "default"

    try {
        const stats = await analyticsService.getDashboardStats(storeId)
        res.json({ stats })
    } catch (error: any) {
        res.status(500).json({ message: error.message })
    }
}

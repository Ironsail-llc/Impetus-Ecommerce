import { ExecArgs } from "@medusajs/framework/types"
import { ANALYTICS_MODULE } from "../modules/analytics"
import AnalyticsModuleService from "../modules/analytics/service"

export default async function ({ container }: ExecArgs) {
    const logger = container.resolve("logger")
    const analyticsService = container.resolve<AnalyticsModuleService>(ANALYTICS_MODULE)

    try {
        const stats = await analyticsService.getDashboardStats("test-store")

        if (stats.active_subscriptions === 142 && stats.churn_rate === 0.05) {
            logger.info("Analytics Service Verification: PASSED")
            logger.info(JSON.stringify(stats, null, 2))
        } else {
            logger.error("Analytics Service Verification: FAILED - Incorrect stats returned")
        }

    } catch (error) {
        logger.error(`Analytics Service Verification: FAILED - ${error.message}`)
    }
}

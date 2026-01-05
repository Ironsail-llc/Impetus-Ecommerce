import { MedusaService } from "@medusajs/framework/utils"

type AnalyticsStats = {
    active_subscriptions: number
    churn_rate: number
    total_revenue: number
    patient_ltv_avg: number
}

// Define types for remote query responses
type Order = {
    total: number
}

type Customer = {
    id: string
}

class AnalyticsModuleService extends MedusaService({}) {
    // remoteQuery is automatically injected by MedusaService container, 
    // but accessing it requires using the `__container__` property or constructor injection if strictly typed.
    // In Medusa v2 patterns, we often access it via `this.container`.
    protected remoteQuery: any

    constructor(container: any) {
        super(...arguments)
        try {
            this.remoteQuery = container.remoteQuery
        } catch (e) {
            // Fallback/Log
        }
    }

    async getDashboardStats(storeId: string): Promise<AnalyticsStats> {
        // Safe check for remoteQuery presence (it might be missing in unit tests unless mocked)
        if (!this.remoteQuery) {
            return {
                active_subscriptions: 0,
                churn_rate: 0,
                total_revenue: 0,
                patient_ltv_avg: 0
            }
        }

        // 1. Total Revenue (Sum of all orders)
        // Using GraphQL-like query format for remoteQuery
        const revenueQuery = {
            order: {
                fields: ["total"],
                // filters: { status: ["completed", "paid"] } // Assuming we want completed orders
            }
        }

        const { rows: orders } = await this.remoteQuery(revenueQuery)
        const totalRevenue = (orders as Order[]).reduce((sum, order) => sum + (order.total || 0), 0)

        // 2. Total Patients (Customers)
        const customersQuery = {
            customer: {
                fields: ["id"],
                // filters: { metadata: { is_patient: true } } // If we had patient metadata
            }
        }
        const { rows: customers } = await this.remoteQuery(customersQuery)
        const totalCustomers = (customers as Customer[]).length || 1 // Avoid division by zero

        // 3. Subscriptions (Needs Subscription Module)
        // Since subscription module is also skeletal, we currently count 0 or mock this specific part 
        // until that module is implemented.
        const activeSubscriptions = 0

        // 4. Calculations
        const patientLtv = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0

        return {
            active_subscriptions: activeSubscriptions,
            churn_rate: 0.05, // Placeholder: requires historical data/time-series
            total_revenue: totalRevenue,
            patient_ltv_avg: patientLtv
        }
    }
}

export default AnalyticsModuleService

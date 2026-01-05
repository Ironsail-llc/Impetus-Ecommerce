import AnalyticsModuleService from "../service"

describe("AnalyticsModuleService", () => {
    let service: AnalyticsModuleService
    let container: any

    beforeEach(() => {
        container = {
            remoteQuery: jest.fn(),
        }
        service = new AnalyticsModuleService(container)
    })

    it("should calculate zero stats when no data exists", async () => {
        // Mock empty orders
        container.remoteQuery.mockResolvedValueOnce({ rows: [] })
        // Mock empty customers
        container.remoteQuery.mockResolvedValueOnce({ rows: [] })

        const stats = await service.getDashboardStats("default")

        expect(stats).toEqual({
            active_subscriptions: 0,
            churn_rate: 0.05,
            total_revenue: 0,
            patient_ltv_avg: 0,
        })
    })

    it("should calculate revenue and LTV correctly", async () => {
        // Mock 2 orders totaling 300
        container.remoteQuery.mockResolvedValueOnce({
            rows: [
                { total: 100 },
                { total: 200 }
            ]
        })

        // Mock 2 customers
        container.remoteQuery.mockResolvedValueOnce({
            rows: [
                { id: "c1" },
                { id: "c2" }
            ]
        })

        const stats = await service.getDashboardStats("default")

        // Revenue = 100 + 200 = 300
        // Customers = 2
        // LTV = 300 / 2 = 150
        expect(stats.total_revenue).toBe(300)
        expect(stats.patient_ltv_avg).toBe(150)
    })

    it("should handle missing remoteQuery gracefully", async () => {
        service = new AnalyticsModuleService({})
        const stats = await service.getDashboardStats("default")

        expect(stats.total_revenue).toBe(0)
    })
})

import { MedusaModule } from "@medusajs/framework/modules-sdk"
import LoyaltyModuleDefinition, { LOYALTY_MODULE } from "../index"
import LoyaltyModuleService from "../service"
import { Client } from "pg"

jest.setTimeout(120000)

describe("Loyalty Module Manual Boot", () => {
    let service: LoyaltyModuleService
    let client: Client

    beforeAll(async () => {
        // 1. Setup DB
        console.log("Setting up manual test database...")
        client = new Client({
            connectionString: "postgres://philip:postgres@127.0.0.1:5432/postgres" // Connect to default
        })
        await client.connect()
        // Re-create test db
        await client.query("DROP DATABASE IF EXISTS medusa_manual_test")
        await client.query("CREATE DATABASE medusa_manual_test")
        await client.end()

        // 2. Boot Module
        console.log("Booting Loyalty Module...")
        process.env.DATABASE_URL = "postgres://philip:postgres@127.0.0.1:5432/medusa_manual_test"

        service = await MedusaModule.bootstrap({
            definition: LoyaltyModuleDefinition,
            path: require("path").resolve(__dirname, ".."),
        } as any) as unknown as LoyaltyModuleService
        console.log("Loyalty Module Booted!")
    })

    afterAll(async () => {
        // Optional: Cleanup
        // await client.connect()
        // await client.query("DROP DATABASE IF EXISTS medusa_manual_test")
        // await client.end()
    })

    it("should serve the loyalty module", async () => {
        expect(service).toBeDefined()
        const tiers = await service.listLoyaltyTiers()
        console.log("Tiers:", tiers)
        expect(Array.isArray(tiers)).toBe(true)
    })
})

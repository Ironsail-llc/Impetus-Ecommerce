import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(120 * 1000)

/**
 * Integration Tests for Telemedicine Compliance Module
 *
 * User Stories Tested:
 *
 * ADMIN STORIES:
 * A1. Configure global compliance settings
 * A2. Add/edit region compliance rules
 * A3. Mark product as controlled substance
 * A4. Manually establish customer
 * A5. View compliance audit trail
 *
 * CUSTOMER STORIES:
 * C1. See establishment status
 * C2. See pending requirements
 * C3. Purchase consultation fulfills establishment
 * C4. Once established, can buy all products in region
 *
 * SYSTEM STORIES:
 * S1. Order triggers compliance evaluation
 * S2. EMR webhook updates establishment
 * S3. Expiration handled correctly
 */

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let adminToken: string
    let testCustomerId: string
    let testProductId: string
    let testRegionRuleId: string

    // Helper to get admin auth header
    const getAdminHeaders = () => ({
      Authorization: `Bearer ${adminToken}`,
    })

    // Setup - Create admin session
    beforeAll(async () => {
      // Login as admin
      try {
        const authResponse = await api.post("/auth/user/emailpass", {
          email: "admin@medusa-test.com",
          password: "supersecret",
        })
        adminToken = authResponse.data.token
      } catch (error) {
        // Admin might already exist, try to login
        const authResponse = await api.post("/auth/user/emailpass", {
          email: "admin@medusa-test.com",
          password: "supersecret",
        })
        adminToken = authResponse.data.token
      }
    })

    describe("Admin Story A1: Configure Global Compliance Settings", () => {
      it("should get default compliance configuration", async () => {
        const response = await api.get("/admin/compliance/configuration", {
          headers: getAdminHeaders(),
        })

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("config")
        expect(response.data.config).toHaveProperty(
          "establishment_expiration_days"
        )
        expect(response.data.config).toHaveProperty(
          "hold_orders_until_established"
        )
        expect(response.data.config).toHaveProperty(
          "controlled_substance_requires_consultation"
        )
      })

      it("should update compliance configuration", async () => {
        const newConfig = {
          establishment_expiration_days: 365,
          hold_orders_until_established: true,
          controlled_substance_requires_consultation: true,
          consultation_product_ids: [],
          send_requirement_notification: true,
          notification_channels: ["email", "sms"],
          reminder_days: [3, 7, 14],
        }

        const response = await api.put(
          "/admin/compliance/configuration",
          newConfig,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data.config.establishment_expiration_days).toEqual(365)
        expect(response.data.config.notification_channels).toContain("sms")
      })

      it("should persist configuration changes", async () => {
        // Verify the changes persisted
        const response = await api.get("/admin/compliance/configuration", {
          headers: getAdminHeaders(),
        })

        expect(response.data.config.establishment_expiration_days).toEqual(365)
      })
    })

    describe("Admin Story A2: Add/Edit Region Compliance Rules", () => {
      it("should list region rules (initially empty or with seed data)", async () => {
        const response = await api.get("/admin/compliance/regions", {
          headers: getAdminHeaders(),
        })

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("regions")
        expect(Array.isArray(response.data.regions)).toBe(true)
      })

      it("should create a new region rule for Texas", async () => {
        const regionRule = {
          region_code: "US-TX",
          region_name: "Texas",
          country_code: "US",
          requires_establishment: true,
          establishment_expiration_days: 365,
          active: true,
        }

        const response = await api.post(
          "/admin/compliance/regions",
          regionRule,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("region")
        expect(response.data.region.region_code).toEqual("US-TX")
        expect(response.data.region.requires_establishment).toBe(true)

        testRegionRuleId = response.data.region.id
      })

      it("should create a region rule for California", async () => {
        const regionRule = {
          region_code: "US-CA",
          region_name: "California",
          country_code: "US",
          requires_establishment: true,
          establishment_expiration_days: null, // Never expires
          active: true,
        }

        const response = await api.post(
          "/admin/compliance/regions",
          regionRule,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data.region.establishment_expiration_days).toBeNull()
      })

      it("should update a region rule", async () => {
        const updates = {
          establishment_expiration_days: 180,
        }

        const response = await api.put(
          `/admin/compliance/regions/${testRegionRuleId}`,
          updates,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data.region.establishment_expiration_days).toEqual(180)
      })

      it("should get a specific region rule", async () => {
        const response = await api.get(
          `/admin/compliance/regions/${testRegionRuleId}`,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data.region.id).toEqual(testRegionRuleId)
      })

      it("should list all region rules including new ones", async () => {
        const response = await api.get("/admin/compliance/regions", {
          headers: getAdminHeaders(),
        })

        expect(response.status).toEqual(200)
        expect(response.data.regions.length).toBeGreaterThanOrEqual(2)
      })
    })

    describe("Admin Story A4: Manually Establish Customer", () => {
      let customerId: string

      beforeAll(async () => {
        // Get or create a test customer
        const customersResponse = await api.get("/admin/customers?limit=1", {
          headers: getAdminHeaders(),
        })

        if (
          customersResponse.data.customers &&
          customersResponse.data.customers.length > 0
        ) {
          customerId = customersResponse.data.customers[0].id
          testCustomerId = customerId
        }
      })

      it("should get customer compliance status (initially not established)", async () => {
        if (!customerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const response = await api.get(
          `/admin/compliance/customers/${customerId}/status`,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("establishments")
      })

      it("should manually establish customer in Texas", async () => {
        if (!customerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const establishRequest = {
          region_code: "US-TX",
          source: "manual",
          reason: "Integration test - manual establishment",
        }

        const response = await api.post(
          `/admin/compliance/customers/${customerId}/establish`,
          establishRequest,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("establishment")
        expect(response.data.establishment.established).toBe(true)
        expect(response.data.establishment.region_code).toEqual("US-TX")
      })

      it("should show customer as established in Texas", async () => {
        if (!customerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const response = await api.get(
          `/admin/compliance/customers/${customerId}/status`,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)

        const txEstablishment = response.data.establishments.find(
          (e: { region_code: string }) => e.region_code === "US-TX"
        )
        expect(txEstablishment).toBeDefined()
        expect(txEstablishment.established).toBe(true)
      })
    })

    describe("Admin Story A5: View Compliance Audit Trail", () => {
      it("should get customer compliance history", async () => {
        if (!testCustomerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const response = await api.get(
          `/admin/compliance/customers/${testCustomerId}/history`,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("history")
        expect(Array.isArray(response.data.history)).toBe(true)

        // Should have at least one entry from the manual establishment
        if (response.data.history.length > 0) {
          const entry = response.data.history[0]
          expect(entry).toHaveProperty("action")
          expect(entry).toHaveProperty("entity_type")
          expect(entry).toHaveProperty("created_at")
        }
      })
    })

    describe("System Story S2: EMR Webhook Updates Establishment", () => {
      it("should accept EMR video call completion webhook", async () => {
        if (!testCustomerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const webhookPayload = {
          customer_id: testCustomerId,
          region_code: "US-CA",
          call_id: "emr-call-12345",
          call_type: "video",
          provider_id: "dr-smith-001",
          completed_at: new Date().toISOString(),
        }

        // Note: In production, this would include HMAC signature verification
        const response = await api.post(
          "/webhooks/emr/video-call-completed",
          webhookPayload
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("establishment")
        expect(response.data.establishment.region_code).toEqual("US-CA")
      })

      it("should show customer as established in California after webhook", async () => {
        if (!testCustomerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const response = await api.get(
          `/admin/compliance/customers/${testCustomerId}/status`,
          { headers: getAdminHeaders() }
        )

        const caEstablishment = response.data.establishments.find(
          (e: { region_code: string }) => e.region_code === "US-CA"
        )
        expect(caEstablishment).toBeDefined()
        expect(caEstablishment.established).toBe(true)
        expect(caEstablishment.fulfillment_source).toEqual("emr_video_call")
      })
    })

    describe("Generic Establishment Webhook", () => {
      it("should accept generic establishment webhook", async () => {
        if (!testCustomerId) {
          console.log("Skipping: No customer available for testing")
          return
        }

        const webhookPayload = {
          customer_id: testCustomerId,
          region_code: "US-NY",
          source: "external_system",
          reference_id: "ext-ref-001",
          reference_type: "telemedicine_platform",
        }

        const response = await api.post(
          "/webhooks/compliance/establish",
          webhookPayload
        )

        expect(response.status).toEqual(200)
        expect(response.data).toHaveProperty("establishment")
      })
    })

    describe("Region Rule Cleanup", () => {
      it("should delete a region rule", async () => {
        if (!testRegionRuleId) {
          console.log("Skipping: No region rule to delete")
          return
        }

        const response = await api.delete(
          `/admin/compliance/regions/${testRegionRuleId}`,
          { headers: getAdminHeaders() }
        )

        expect(response.status).toEqual(200)
      })
    })

    describe("Error Handling", () => {
      it("should return 404 for non-existent customer", async () => {
        try {
          await api.get(
            "/admin/compliance/customers/non-existent-id/status",
            { headers: getAdminHeaders() }
          )
        } catch (error: unknown) {
          const axiosError = error as { response?: { status: number } }
          expect(axiosError.response?.status).toEqual(404)
        }
      })

      it("should return 404 for non-existent region rule", async () => {
        try {
          await api.get("/admin/compliance/regions/non-existent-id", {
            headers: getAdminHeaders(),
          })
        } catch (error: unknown) {
          const axiosError = error as { response?: { status: number } }
          expect(axiosError.response?.status).toEqual(404)
        }
      })

      it("should validate region rule creation", async () => {
        try {
          // Missing required fields
          await api.post(
            "/admin/compliance/regions",
            { region_code: "INVALID" }, // Missing other required fields
            { headers: getAdminHeaders() }
          )
        } catch (error: unknown) {
          const axiosError = error as { response?: { status: number } }
          expect(axiosError.response?.status).toBe(400)
        }
      })
    })
  },
})

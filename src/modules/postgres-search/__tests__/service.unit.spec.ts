import PostgresSearchService from "../service"

describe("PostgresSearchService", () => {
    let service: PostgresSearchService
    let container: any

    beforeEach(() => {
        container = {
            __pg_connection__: {
                raw: jest.fn(),
            },
        }
        service = new PostgresSearchService(container, {})
    })

    describe("search", () => {
        it("should format query and execute raw SQL", async () => {
            const rawMock = container.__pg_connection__.raw
            rawMock.mockResolvedValue({
                rows: [{ id: "prod_1" }, { id: "prod_2" }],
            })

            const result = await service.search("products", "Red Shirt")

            // Verify SQL generation logic
            const expectedFormattedQuery = "Red:* & Shirt:*"
            expect(rawMock).toHaveBeenCalledWith(
                expect.stringContaining("SELECT id"),
                [expectedFormattedQuery]
            )
            expect(rawMock).toHaveBeenCalledWith(
                expect.stringContaining("to_tsvector"),
                [expectedFormattedQuery]
            )

            // Verify output structure
            expect(result).toEqual({
                hits: [{ id: "prod_1" }, { id: "prod_2" }],
                nbHits: 2,
                offset: 0,
                limit: 20,
            })
        })

        it("should handle empty results", async () => {
            const rawMock = container.__pg_connection__.raw
            rawMock.mockResolvedValue({
                rows: [],
            })

            const result = await service.search("products", "Nonexistent")

            expect(result.hits).toHaveLength(0)
            expect(result.nbHits).toBe(0)
        })
    })

    describe("No-op methods", () => {
        it("createIndex should do nothing", async () => {
            await expect(service.createIndex("test", {})).resolves.toBeUndefined()
        })

        it("addDocuments should do nothing", async () => {
            await expect(service.addDocuments("test", [], "product")).resolves.toBeUndefined()
        })

        it("deleteDocument should do nothing", async () => {
            await expect(service.deleteDocument("test", "id")).resolves.toBeUndefined()
        })
    })
})

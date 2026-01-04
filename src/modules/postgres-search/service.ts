import { SearchTypes } from "@medusajs/types"
import { MedusaService } from "@medusajs/framework/utils"
// @ts-ignore
import { AbstractSearchService } from "@medusajs/utils"
import { EntityManager } from "@mikro-orm/postgresql"

type InjectedDependencies = {
    manager: EntityManager
}

export default class PostgresSearchService extends AbstractSearchService {
    get isDefault(): boolean {
        return false
    }

    protected readonly pgConnection_: any

    constructor(container: InjectedDependencies & { __pg_connection__: any }, options: Record<string, unknown>) {
        super(container, options)
        this.pgConnection_ = container.__pg_connection__
        console.log("PG Connection Type:", this.pgConnection_ ? this.pgConnection_.constructor.name : "NULL")
    }

    async createIndex(indexName: string, options: Record<string, unknown> = {}): Promise<void> {
        // No-op for Postgres (schema controlled by migrations)
        return
    }

    async getIndex(indexName: string): Promise<void> {
        // No-op
        return
    }

    async addDocuments(indexName: string, documents: any[], type: string): Promise<void> {
        // No-op: Data is already in Postgres. 
        // In a full implementation, we might update a dedicated tsvector column here if we aren't using generated columns.
        return
    }

    async replaceDocuments(indexName: string, documents: any[], type: string): Promise<void> {
        return this.addDocuments(indexName, documents, type)
    }

    async deleteDocument(indexName: string, documentId: string): Promise<void> {
        // No-op
        return
    }

    async deleteAllDocuments(indexName: string): Promise<void> {
        // No-op
        return
    }

    async search(indexName: string, query: string, options: Record<string, unknown> = {}): Promise<any> {
        const q = query.trim()

        // Basic sanitization to prevent SQL injection is handled by parameterized queries, 
        // but we need to format the query for tsquery.
        // 'Red Shirt' -> 'Red & Shirt:*' for prefix matching
        const formattedQuery = q.split(/\s+/).map(w => `${w}:*`).join(" & ")

        // We assume 'products' index maps to the 'product' table
        // Adjust fields based on what you want searchable (title, description, etc.)
        const sql = `
      SELECT id 
      FROM product 
      WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')) @@ to_tsquery('english', ?)
      LIMIT 20
    `
        // Note: MikroORM EntityManager.execute might behave differently depending on version.
        // Ensure we are accessing the raw knex or pg driver if needed, or use execute with params.

        // Using raw SQL via Knex
        const result = await this.pgConnection_.raw(sql, [formattedQuery])
        const rows = result.rows || []

        return {
            hits: rows.map((r: any) => ({ id: r.id })), // Minimal return, Medusa hydrates the rest
            nbHits: rows.length,
            offset: 0,
            limit: 20
        }
    }

    async updateSettings(indexName: string, settings: Record<string, unknown>): Promise<void> {
        return
    }
}

import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

export async function storeScopeMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
) {
    // @ts-ignore - user is attached by auth middleware
    const user = req.user

    if (user && user.metadata && user.metadata.store_id) {
        const storeId = user.metadata.store_id as string

        // Attach store_id to the request context for services to use
        // In Medusa v2, we often attach to the scope or filtered fields
        // For now, we attach to a custom property or query

        // Example: Force filtering
        if (req.method === "GET") {
            req.query.store_id = storeId
        }

        if (req.method === "POST" && req.body && typeof req.body === "object") {
            // @ts-ignore
            req.body.store_id = storeId
        }

        console.log(`[RBAC] Scoping request to Store: ${storeId}`)
    }

    next()
}

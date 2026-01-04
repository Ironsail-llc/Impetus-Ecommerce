import {
    MedusaRequest,
    MedusaResponse,
    MedusaNextFunction,
} from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../modules/admin-roles"
import AdminRolesModuleService from "../../modules/admin-roles/service"

/**
 * Middleware factory to require specific module permissions
 *
 * @param module - The module name (e.g., "products", "orders", "loyalty")
 * @param action - The required action (read, write, delete, manage)
 * @returns Express middleware function
 */
export function requirePermission(module: string, action: string = "read") {
    return async (
        req: MedusaRequest,
        res: MedusaResponse,
        next: MedusaNextFunction
    ) => {
        // Cast to access auth_context (available after Medusa auth middleware)
        const authReq = req as MedusaRequest & { auth_context?: { actor_id?: string; actor_type?: string } }
        const userId = authReq.auth_context?.actor_id
        const actorType = authReq.auth_context?.actor_type

        // Only apply to admin (user) routes, not customer routes
        if (actorType !== "user") {
            return res.status(401).json({
                message: "Unauthorized: Admin access required",
            })
        }

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized: No user ID found",
            })
        }

        try {
            const rolesService: AdminRolesModuleService = req.scope.resolve(
                ADMIN_ROLES_MODULE
            )

            // Ensure user has at least a default role
            await rolesService.ensureUserHasRole(userId)

            const hasPermission = await rolesService.hasPermission(
                userId,
                module,
                action
            )

            if (!hasPermission) {
                return res.status(403).json({
                    message: `Access denied. Required permission: ${module}:${action}`,
                    required: { module, action },
                })
            }

            next()
        } catch (error) {
            console.error("Permission check error:", error)
            return res.status(500).json({
                message: "Error checking permissions",
            })
        }
    }
}

// Convenience exports for common action levels
export const requireRead = (module: string) => requirePermission(module, "read")
export const requireWrite = (module: string) => requirePermission(module, "write")
export const requireDelete = (module: string) => requirePermission(module, "delete")
export const requireManage = (module: string) => requirePermission(module, "manage")

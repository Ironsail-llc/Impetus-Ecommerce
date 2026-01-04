import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../../modules/admin-roles"
import AdminRolesModuleService from "../../../../modules/admin-roles/service"

/**
 * GET /admin/me/permissions
 * Get current user's permissions (for UI to show/hide features)
 */
export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const userId = req.auth_context?.actor_id
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)

    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    try {
        // Ensure user has a role
        await rolesService.ensureUserHasRole(userId)

        const { roles, permissions } = await rolesService.getUserPermissions(userId)

        res.json({
            user_id: userId,
            roles,
            permissions,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to get permissions",
            error: error.message,
        })
    }
}

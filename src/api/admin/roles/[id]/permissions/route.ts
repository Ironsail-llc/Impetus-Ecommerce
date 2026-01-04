import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../../../modules/admin-roles"
import AdminRolesModuleService from "../../../../../modules/admin-roles/service"

/**
 * GET /admin/roles/:id/permissions
 * Get permissions for a role
 */
export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)

    try {
        const [role] = await rolesService.listAdminRoles({ id })

        if (!role) {
            return res.status(404).json({ message: "Role not found" })
        }

        const permissions = await rolesService.getRolePermissions(id)

        res.json({
            role_id: id,
            role_name: role.name,
            permissions,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to get permissions",
            error: error.message,
        })
    }
}

/**
 * PUT /admin/roles/:id/permissions
 * Set permissions for a role (replaces all existing)
 */
export async function PUT(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)
    const { permissions } = req.body as {
        permissions: Array<{ module: string; action: string }>
    }

    if (!permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
            message: "permissions array is required",
        })
    }

    // Validate actions
    const validActions = ["read", "write", "delete", "manage"]
    for (const perm of permissions) {
        if (!perm.module || !perm.action) {
            return res.status(400).json({
                message: "Each permission must have module and action",
            })
        }
        if (!validActions.includes(perm.action)) {
            return res.status(400).json({
                message: `Invalid action '${perm.action}'. Valid actions: ${validActions.join(", ")}`,
            })
        }
    }

    try {
        const [role] = await rolesService.listAdminRoles({ id })

        if (!role) {
            return res.status(404).json({ message: "Role not found" })
        }

        await rolesService.setRolePermissions(id, permissions)

        const updatedPermissions = await rolesService.getRolePermissions(id)

        res.json({
            role_id: id,
            role_name: role.name,
            permissions: updatedPermissions,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to update permissions",
            error: error.message,
        })
    }
}

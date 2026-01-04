import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../../../../modules/admin-roles"
import AdminRolesModuleService from "../../../../../../modules/admin-roles/service"

/**
 * DELETE /admin/users/:id/roles/:roleId
 * Remove a role from a user
 */
export async function DELETE(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id: userId, roleId } = req.params
    const currentUserId = req.auth_context?.actor_id
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)

    try {
        // Prevent removing own manage permission on admin_users
        if (userId === currentUserId) {
            const [role] = await rolesService.listAdminRoles({ id: roleId })
            if (role) {
                const permissions = await rolesService.getRolePermissions(roleId)
                const hasAdminManage = permissions.some(
                    (p) => p.module === "admin_users" && p.action === "manage"
                )

                if (hasAdminManage) {
                    // Check if this is the user's only role with admin_users:manage
                    const userRoles = await rolesService.getUserRoles(userId)
                    let hasOtherAdminManageRole = false

                    for (const ur of userRoles) {
                        if (ur.id === roleId) continue
                        const urPerms = await rolesService.getRolePermissions(ur.id)
                        if (urPerms.some((p) => p.module === "admin_users" && p.action === "manage")) {
                            hasOtherAdminManageRole = true
                            break
                        }
                    }

                    if (!hasOtherAdminManageRole) {
                        return res.status(400).json({
                            message: "Cannot remove your only role with admin_users:manage permission",
                        })
                    }
                }
            }
        }

        // Remove role
        await rolesService.removeRole(userId, roleId)

        res.json({
            success: true,
            user_id: userId,
            removed_role_id: roleId,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to remove role",
            error: error.message,
        })
    }
}

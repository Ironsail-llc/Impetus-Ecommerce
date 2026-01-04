import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../../../modules/admin-roles"
import AdminRolesModuleService from "../../../../../modules/admin-roles/service"

/**
 * GET /admin/users/:id/roles
 * Get roles assigned to a user
 */
export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id: userId } = req.params
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)

    try {
        const roles = await rolesService.getUserRoles(userId)

        // Get assignments for additional metadata
        const assignments = await rolesService.listAdminRoleAssignments({
            user_id: userId,
        })

        const rolesWithMeta = roles.map((role) => {
            const assignment = assignments.find((a) => a.role_id === role.id)
            return {
                ...role,
                assigned_at: assignment?.created_at,
                assigned_by: assignment?.assigned_by,
            }
        })

        res.json({
            user_id: userId,
            roles: rolesWithMeta,
            count: roles.length,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to get user roles",
            error: error.message,
        })
    }
}

/**
 * POST /admin/users/:id/roles
 * Assign a role to a user
 */
export async function POST(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id: userId } = req.params
    const assignedBy = req.auth_context?.actor_id
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)
    const { role_id } = req.body as { role_id: string }

    if (!role_id) {
        return res.status(400).json({
            message: "role_id is required",
        })
    }

    try {
        // Verify role exists
        const [role] = await rolesService.listAdminRoles({ id: role_id })
        if (!role) {
            return res.status(404).json({
                message: "Role not found",
            })
        }

        // Assign role
        const assignment = await rolesService.assignRole(
            userId,
            role_id,
            assignedBy || "system"
        )

        res.status(201).json({
            user_id: userId,
            role: {
                ...role,
                assigned_at: assignment.created_at,
                assigned_by: assignment.assigned_by,
            },
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to assign role",
            error: error.message,
        })
    }
}

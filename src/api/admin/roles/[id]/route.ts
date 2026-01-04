import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../../modules/admin-roles"
import AdminRolesModuleService from "../../../../modules/admin-roles/service"

/**
 * GET /admin/roles/:id
 * Get a specific role with its permissions
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

        const permissions = await rolesService.getRolePermissions(role.id)

        res.json({
            role: {
                ...role,
                permissions,
            },
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to get role",
            error: error.message,
        })
    }
}

/**
 * PUT /admin/roles/:id
 * Update a role
 */
export async function PUT(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)
    const { display_name, description } = req.body as {
        display_name?: string
        description?: string
    }

    try {
        const [role] = await rolesService.listAdminRoles({ id })

        if (!role) {
            return res.status(404).json({ message: "Role not found" })
        }

        // Cannot update system role name
        const updateData: Record<string, any> = {}
        if (display_name) updateData.display_name = display_name
        if (description !== undefined) updateData.description = description

        const [updatedRole] = await rolesService.updateAdminRoles([
            { id, ...updateData },
        ])

        const permissions = await rolesService.getRolePermissions(id)

        res.json({
            role: {
                ...updatedRole,
                permissions,
            },
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to update role",
            error: error.message,
        })
    }
}

/**
 * DELETE /admin/roles/:id
 * Delete a role (non-system only)
 */
export async function DELETE(
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

        if (role.is_system) {
            return res.status(400).json({
                message: "Cannot delete system roles",
            })
        }

        // Check if any users have this role
        const assignments = await rolesService.listAdminRoleAssignments({
            role_id: id,
        })

        if (assignments.length > 0) {
            return res.status(400).json({
                message: `Cannot delete role: ${assignments.length} user(s) still have this role assigned`,
            })
        }

        // Delete permissions first
        const permissions = await rolesService.listAdminPermissions({ role_id: id })
        if (permissions.length > 0) {
            await rolesService.deleteAdminPermissions(permissions.map((p) => p.id))
        }

        // Delete role
        await rolesService.deleteAdminRoles([id])

        res.json({ success: true, deleted: id })
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete role",
            error: error.message,
        })
    }
}

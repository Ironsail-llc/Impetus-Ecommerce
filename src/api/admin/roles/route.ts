import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADMIN_ROLES_MODULE } from "../../../modules/admin-roles"
import AdminRolesModuleService from "../../../modules/admin-roles/service"

/**
 * GET /admin/roles
 * List all admin roles with their permissions
 */
export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)

    try {
        const roles = await rolesService.listAdminRoles({})

        // Enrich with permissions
        const rolesWithPermissions = await Promise.all(
            roles.map(async (role) => {
                const permissions = await rolesService.getRolePermissions(role.id)
                return {
                    ...role,
                    permissions,
                }
            })
        )

        res.json({
            roles: rolesWithPermissions,
            count: roles.length,
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to list roles",
            error: error.message,
        })
    }
}

/**
 * POST /admin/roles
 * Create a new admin role
 */
export async function POST(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const rolesService: AdminRolesModuleService = req.scope.resolve(ADMIN_ROLES_MODULE)
    const { name, display_name, description, permissions } = req.body as {
        name: string
        display_name: string
        description?: string
        permissions?: Array<{ module: string; action: string }>
    }

    if (!name || !display_name) {
        return res.status(400).json({
            message: "name and display_name are required",
        })
    }

    try {
        // Check if role name already exists
        const existing = await rolesService.listAdminRoles({ name })
        if (existing.length > 0) {
            return res.status(400).json({
                message: `Role with name '${name}' already exists`,
            })
        }

        // Create role
        const [role] = await rolesService.createAdminRoles([
            {
                name,
                display_name,
                description: description || null,
                is_system: false,
                is_default: false,
            },
        ])

        // Set permissions if provided
        if (permissions && permissions.length > 0) {
            await rolesService.setRolePermissions(role.id, permissions)
        }

        const rolePermissions = await rolesService.getRolePermissions(role.id)

        res.status(201).json({
            role: {
                ...role,
                permissions: rolePermissions,
            },
        })
    } catch (error) {
        res.status(500).json({
            message: "Failed to create role",
            error: error.message,
        })
    }
}

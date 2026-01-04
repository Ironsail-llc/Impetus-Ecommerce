import { MedusaService } from "@medusajs/framework/utils"
import { AdminRole, AdminPermission, AdminRoleAssignment } from "./models"

// Type definitions for model records
export interface AdminRoleRecord {
    id: string
    name: string
    display_name: string
    description: string | null
    is_system: boolean
    is_default: boolean
    created_at: Date
    updated_at: Date
}

export interface AdminRoleAssignmentRecord {
    id: string
    user_id: string
    role_id: string
    assigned_by: string | null
    created_at: Date
    updated_at: Date
}

// Permission action hierarchy (higher includes lower)
const ACTION_HIERARCHY: Record<string, number> = {
    read: 1,
    write: 2,
    delete: 3,
    manage: 4,
}

// Default roles with their permissions
const DEFAULT_ROLES = [
    {
        name: "super_admin",
        display_name: "Super Admin",
        description: "Full access to all modules",
        is_system: true,
        is_default: false,
        permissions: [
            { module: "products", action: "manage" },
            { module: "orders", action: "manage" },
            { module: "customers", action: "manage" },
            { module: "loyalty", action: "manage" },
            { module: "settings", action: "manage" },
            { module: "blog", action: "manage" },
            { module: "digital_products", action: "manage" },
            { module: "bundles", action: "manage" },
            { module: "webhooks", action: "manage" },
            { module: "admin_users", action: "manage" },
        ],
    },
    {
        name: "store_manager",
        display_name: "Store Manager",
        description: "Manage products, orders, customers, and loyalty",
        is_system: true,
        is_default: true, // Default for new admins
        permissions: [
            { module: "products", action: "manage" },
            { module: "orders", action: "manage" },
            { module: "customers", action: "manage" },
            { module: "loyalty", action: "manage" },
            { module: "blog", action: "manage" },
            { module: "digital_products", action: "manage" },
            { module: "bundles", action: "manage" },
            { module: "admin_users", action: "read" },
        ],
    },
    {
        name: "support_agent",
        display_name: "Support Agent",
        description: "Handle orders and customer inquiries",
        is_system: true,
        is_default: false,
        permissions: [
            { module: "products", action: "read" },
            { module: "orders", action: "write" },
            { module: "customers", action: "write" },
            { module: "loyalty", action: "read" },
            { module: "blog", action: "read" },
            { module: "digital_products", action: "read" },
            { module: "bundles", action: "read" },
        ],
    },
    {
        name: "content_editor",
        display_name: "Content Editor",
        description: "Manage products, blog, and digital content",
        is_system: true,
        is_default: false,
        permissions: [
            { module: "products", action: "manage" },
            { module: "orders", action: "read" },
            { module: "blog", action: "manage" },
            { module: "digital_products", action: "manage" },
            { module: "bundles", action: "manage" },
        ],
    },
]

type PermissionCache = {
    permissions: Map<string, Set<string>>
    timestamp: number
}

class AdminRolesModuleService extends MedusaService({
    AdminRole,
    AdminPermission,
    AdminRoleAssignment,
}) {
    // Permission cache: userId -> { module -> Set<actions> }
    private permissionCache: Map<string, PermissionCache> = new Map()
    private cacheTTL = 60000 // 1 minute

    // ==========================================
    // Permission Checking
    // ==========================================

    /**
     * Check if a user has permission for a module/action
     * Action hierarchy: manage > delete > write > read
     */
    async hasPermission(
        userId: string,
        module: string,
        requiredAction: string
    ): Promise<boolean> {
        const permissions = await this.getUserPermissionMap(userId)
        const moduleActions = permissions.get(module)

        if (!moduleActions || moduleActions.size === 0) {
            return false
        }

        const requiredLevel = ACTION_HIERARCHY[requiredAction] || 0

        // Check if user has the required action or higher
        for (const action of moduleActions) {
            const userLevel = ACTION_HIERARCHY[action] || 0
            if (userLevel >= requiredLevel) {
                return true
            }
        }

        return false
    }

    /**
     * Get all permissions for a user (for UI display)
     */
    async getUserPermissions(userId: string): Promise<{
        roles: Array<{ id: string; name: string; display_name: string }>
        permissions: Record<string, string[]>
    }> {
        const roles = await this.getUserRoles(userId)
        const permissionMap = await this.getUserPermissionMap(userId)

        const permissions: Record<string, string[]> = {}
        for (const [module, actions] of permissionMap) {
            permissions[module] = Array.from(actions)
        }

        return {
            roles: roles.map((r) => ({
                id: r.id,
                name: r.name,
                display_name: r.display_name,
            })),
            permissions,
        }
    }

    /**
     * Get user's permission map (with caching)
     */
    private async getUserPermissionMap(
        userId: string
    ): Promise<Map<string, Set<string>>> {
        // Check cache
        const cached = this.permissionCache.get(userId)
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.permissions
        }

        // Build permission map from user's roles
        const permissions = new Map<string, Set<string>>()

        const assignments = await this.listAdminRoleAssignments({
            user_id: userId,
        })

        for (const assignment of assignments) {
            const rolePermissions = await this.listAdminPermissions({
                role_id: assignment.role_id,
            })

            for (const perm of rolePermissions) {
                if (!permissions.has(perm.module)) {
                    permissions.set(perm.module, new Set())
                }
                permissions.get(perm.module)!.add(perm.action)
            }
        }

        // Cache result
        this.permissionCache.set(userId, {
            permissions,
            timestamp: Date.now(),
        })

        return permissions
    }

    // ==========================================
    // Role Management
    // ==========================================

    /**
     * Get user's assigned roles
     */
    async getUserRoles(userId: string): Promise<AdminRoleRecord[]> {
        const assignments = await this.listAdminRoleAssignments({
            user_id: userId,
        })

        const roles: AdminRoleRecord[] = []
        for (const assignment of assignments) {
            const [role] = await this.listAdminRoles({ id: assignment.role_id })
            if (role) {
                roles.push(role)
            }
        }

        return roles
    }

    /**
     * Assign role to user
     */
    async assignRole(
        userId: string,
        roleId: string,
        assignedBy: string
    ): Promise<AdminRoleAssignmentRecord> {
        // Check if already assigned
        const existing = await this.listAdminRoleAssignments({
            user_id: userId,
            role_id: roleId,
        })

        if (existing.length > 0) {
            return existing[0]
        }

        // Create assignment
        const [assignment] = await this.createAdminRoleAssignments([
            {
                user_id: userId,
                role_id: roleId,
                assigned_by: assignedBy,
            },
        ])

        // Invalidate cache
        this.invalidateCache(userId)

        return assignment
    }

    /**
     * Remove role from user
     */
    async removeRole(userId: string, roleId: string): Promise<void> {
        const assignments = await this.listAdminRoleAssignments({
            user_id: userId,
            role_id: roleId,
        })

        if (assignments.length > 0) {
            await this.deleteAdminRoleAssignments(assignments.map((a) => a.id))
            this.invalidateCache(userId)
        }
    }

    /**
     * Get default role for new admins
     */
    async getDefaultRole(): Promise<AdminRoleRecord | null> {
        const [role] = await this.listAdminRoles({ is_default: true })
        return role || null
    }

    /**
     * Ensure user has at least the default role
     */
    async ensureUserHasRole(userId: string): Promise<void> {
        const assignments = await this.listAdminRoleAssignments({
            user_id: userId,
        })

        if (assignments.length === 0) {
            const defaultRole = await this.getDefaultRole()
            if (defaultRole) {
                await this.assignRole(userId, defaultRole.id, "system_auto")
            }
        }
    }

    // ==========================================
    // Permission Management
    // ==========================================

    /**
     * Set permissions for a role (replaces existing)
     */
    async setRolePermissions(
        roleId: string,
        permissions: Array<{ module: string; action: string }>
    ): Promise<void> {
        // Delete existing permissions
        const existing = await this.listAdminPermissions({ role_id: roleId })
        if (existing.length > 0) {
            await this.deleteAdminPermissions(existing.map((p) => p.id))
        }

        // Create new permissions
        if (permissions.length > 0) {
            await this.createAdminPermissions(
                permissions.map((p) => ({
                    role_id: roleId,
                    module: p.module,
                    action: p.action,
                }))
            )
        }

        // Invalidate all caches (permissions changed)
        this.invalidateCache()
    }

    /**
     * Get permissions for a role
     */
    async getRolePermissions(roleId: string): Promise<
        Array<{ module: string; action: string }>
    > {
        const permissions = await this.listAdminPermissions({ role_id: roleId })
        return permissions.map((p) => ({
            module: p.module,
            action: p.action,
        }))
    }

    // ==========================================
    // Seeding
    // ==========================================

    /**
     * Seed default roles and permissions
     */
    async seedDefaultRoles(): Promise<void> {
        for (const roleData of DEFAULT_ROLES) {
            // Check if role exists
            const existing = await this.listAdminRoles({ name: roleData.name })
            if (existing.length > 0) {
                continue
            }

            // Create role
            const [role] = await this.createAdminRoles([
                {
                    name: roleData.name,
                    display_name: roleData.display_name,
                    description: roleData.description,
                    is_system: roleData.is_system,
                    is_default: roleData.is_default,
                },
            ])

            // Create permissions
            await this.createAdminPermissions(
                roleData.permissions.map((p) => ({
                    role_id: role.id,
                    module: p.module,
                    action: p.action,
                }))
            )
        }
    }

    // ==========================================
    // Cache Management
    // ==========================================

    /**
     * Invalidate permission cache
     */
    invalidateCache(userId?: string): void {
        if (userId) {
            this.permissionCache.delete(userId)
        } else {
            this.permissionCache.clear()
        }
    }
}

export default AdminRolesModuleService

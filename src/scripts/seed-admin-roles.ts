import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ADMIN_ROLES_MODULE } from "../modules/admin-roles"
import AdminRolesModuleService from "../modules/admin-roles/service"

/**
 * Seed default admin roles and assign super_admin to existing admins
 *
 * Run via: npx medusa exec ./src/scripts/seed-admin-roles.ts
 */
export default async function seedAdminRoles({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const rolesService: AdminRolesModuleService = container.resolve(ADMIN_ROLES_MODULE)

    logger.info("Starting Admin Roles Seeding...")

    // 1. Seed default roles
    logger.info("Creating default roles...")
    await rolesService.seedDefaultRoles()
    logger.info("Default roles created successfully")

    // 2. List created roles
    const roles = await rolesService.listAdminRoles({})
    logger.info(`Created ${roles.length} roles:`)
    for (const role of roles) {
        const perms = await rolesService.getRolePermissions(role.id)
        logger.info(`  - ${role.display_name} (${role.name}): ${perms.length} permissions`)
    }

    // 3. Get super_admin role
    const [superAdminRole] = await rolesService.listAdminRoles({ name: "super_admin" })
    if (!superAdminRole) {
        logger.error("super_admin role not found!")
        return
    }

    // 4. Assign super_admin to all existing admin users
    // Note: We need to query admin users from the user module
    // In Medusa V2, admin users are in the 'user' entity
    try {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: users } = await query.graph({
            entity: "user",
            fields: ["id", "email"],
        })

        if (users && users.length > 0) {
            logger.info(`Found ${users.length} existing admin user(s). Assigning super_admin role...`)

            for (const user of users) {
                try {
                    await rolesService.assignRole(user.id, superAdminRole.id, "seed_migration")
                    logger.info(`  - Assigned super_admin to ${user.email}`)
                } catch (e) {
                    // May already be assigned
                    logger.info(`  - ${user.email} may already have super_admin role`)
                }
            }
        } else {
            logger.info("No existing admin users found. Roles will be assigned on first admin creation.")
        }
    } catch (e) {
        logger.warn(`Could not query existing users: ${e.message}`)
        logger.info("Roles will be assigned automatically when admins are detected.")
    }

    logger.info("Admin Roles Seeding Completed!")
}

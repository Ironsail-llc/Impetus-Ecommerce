import { model } from "@medusajs/framework/utils"

const AdminRole = model.define("admin_role", {
    id: model.id().primaryKey(),
    name: model.text(),              // Unique slug: super_admin, store_manager
    display_name: model.text(),      // Human readable: Super Admin
    description: model.text().nullable(),
    is_system: model.boolean().default(false),  // System roles cannot be deleted
    is_default: model.boolean().default(false), // Role assigned to new admins
})

export default AdminRole

import { model } from "@medusajs/framework/utils"

const AdminRoleAssignment = model.define("admin_role_assignment", {
    id: model.id().primaryKey(),
    user_id: model.text(),      // Admin user ID from auth_context.actor_id
    role_id: model.text(),
    assigned_by: model.text().nullable(),  // Admin who assigned the role
})

export default AdminRoleAssignment

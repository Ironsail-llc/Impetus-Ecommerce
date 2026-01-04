import { model } from "@medusajs/framework/utils"

const AdminPermission = model.define("admin_permission", {
    id: model.id().primaryKey(),
    role_id: model.text(),
    module: model.text(),    // products, orders, loyalty, settings, etc.
    action: model.text(),    // read, write, delete, manage
})

export default AdminPermission

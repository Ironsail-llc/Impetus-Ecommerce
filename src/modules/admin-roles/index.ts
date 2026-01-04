import AdminRolesModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ADMIN_ROLES_MODULE = "adminRoles"

export default Module(ADMIN_ROLES_MODULE, {
    service: AdminRolesModuleService,
})

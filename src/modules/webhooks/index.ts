import { Module } from "@medusajs/framework/utils"
import WebhooksModuleService from "./service"

export const WEBHOOKS_MODULE = "webhooks"

export default Module(WEBHOOKS_MODULE, {
  service: WebhooksModuleService,
})

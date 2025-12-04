import { model } from "@medusajs/framework/utils"
import { BundleItem } from "./bundle-item"

export const Bundle = model.define("bundle", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  items: model.hasMany(() => BundleItem, {
    mappedBy: "bundle",
  }),
})

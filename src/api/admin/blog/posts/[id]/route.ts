import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateEntry, deleteEntry } from "@medusajs/framework/utils"
import { BLOG_MODULE } from "../../../../../modules/blog"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const result = await updateEntry(
        req,
        {
            container: req.scope,
            api: {
                resource: "blog_post",
            },
            modules: {
                [BLOG_MODULE]: req.scope.resolve(BLOG_MODULE),
            },
        }
    )

    res.json(result)
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    const result = await deleteEntry(
        req,
        {
            container: req.scope,
            api: {
                resource: "blog_post",
            },
            modules: {
                [BLOG_MODULE]: req.scope.resolve(BLOG_MODULE),
            },
        }
    )

    res.json(result)
}

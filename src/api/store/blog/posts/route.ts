import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listEntries } from "@medusajs/framework/utils"
import { BLOG_MODULE } from "../../../../modules/blog"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const result = await listEntries(
        req,
        {
            container: req.scope,
            api: {
                resource: "blog_post",
                fields: ["*", "id", "title", "slug", "content", "excerpt", "image", "published_at", "created_at", "updated_at"],
            },
            modules: {
                [BLOG_MODULE]: req.scope.resolve(BLOG_MODULE),
            },
        }
    )

    res.json(result)
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogService from "../../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    const post = await blogService.retrieveBlogPost(req.params.id)

    res.json({ blog_post: post })
}

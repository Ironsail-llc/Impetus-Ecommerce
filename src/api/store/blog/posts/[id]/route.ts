import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogService from "../../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    const post = await blogService.retrieveBlog_post(id)

    // Only return if published
    if (!post.published_at) {
        return res.status(404).json({ message: "Post not found" })
    }

    res.json({ blog_post: post })
}

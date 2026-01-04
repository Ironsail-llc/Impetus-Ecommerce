import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../../modules/blog"
import BlogService from "../../../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    const [posts] = await blogService.listBlogPosts({
        slug: req.params.slug,
    })

    // We need to return first item since slug should be unique, but list returns array
    if (!posts || posts.length === 0) {
        res.status(404).json({ message: "Post not found" })
        return
    }

    res.json({ blog_post: posts[0] })
}

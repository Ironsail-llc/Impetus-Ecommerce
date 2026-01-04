import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../modules/blog"
import BlogService from "../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    // Only return published posts for storefront
    const [posts, count] = await blogService.listAndCountBlog_posts({})

    // Filter to only published posts
    const publishedPosts = posts.filter((p) => p.published_at !== null)

    res.json({
        blog_posts: publishedPosts,
        count: publishedPosts.length,
    })
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../modules/blog"
import BlogService from "../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    const [posts, count] = await blogService.listAndCountBlog_posts({})

    res.json({
        blog_posts: posts,
        count,
    })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)
    const body = req.body as {
        title: string
        slug: string
        content: string
        excerpt?: string
        image?: string
        published_at?: string
    }

    // Convert published_at string to Date if provided
    const data = {
        ...body,
        published_at: body.published_at ? new Date(body.published_at) : null,
    }

    const post = await blogService.createBlog_posts(data)

    res.status(201).json({ blog_post: post })
}

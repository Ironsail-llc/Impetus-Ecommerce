import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogService from "../../../../../modules/blog/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    const post = await blogService.retrieveBlog_post(id)

    res.json({ blog_post: post })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)
    const body = req.body as {
        title?: string
        slug?: string
        content?: string
        excerpt?: string
        image?: string
        published_at?: string
    }

    // Convert published_at string to Date if provided
    const data: Record<string, unknown> = { ...body }
    if (body.published_at !== undefined) {
        data.published_at = body.published_at ? new Date(body.published_at) : null
    }

    const post = await blogService.updateBlog_posts({ id }, data)

    res.json({ blog_post: post })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
    const { id } = req.params
    const blogService: BlogService = req.scope.resolve(BLOG_MODULE)

    await blogService.deleteBlog_posts([id])

    res.json({ id, deleted: true })
}

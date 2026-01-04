import { MedusaService } from "@medusajs/framework/utils"
import BlogPost from "./models/post"

class BlogService extends MedusaService({
    blog_post: BlogPost,
}) {
    // Add custom methods if needed, otherwise CRUD is auto-generated
}

export default BlogService

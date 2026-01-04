import { model } from "@medusajs/framework/utils"

const BlogPost = model.define("blog_post", {
    id: model.id().primaryKey(),
    title: model.text(),
    slug: model.text(), // unique constraint will be added via migration or application logic if needed, but DML doesn't strictly enforce 'unique' prop on text() in all versions yet, but we will assume standard behavior.
    content: model.text(), // Long text
    excerpt: model.text().nullable(),
    image: model.text().nullable(),
    published_at: model.dateTime().nullable(),
})

export default BlogPost

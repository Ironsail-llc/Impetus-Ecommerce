import {
  defineMiddlewares,
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import multer from "multer"
import { requirePermission, requireManage } from "./middlewares/require-permission"

const upload = multer({ storage: multer.memoryStorage() })

/**
 * Middleware to capture referral codes from URL query parameters
 *
 * When a user visits with ?ref=CODE, this middleware:
 * 1. Validates the referral code format
 * 2. Sets a 30-day httpOnly cookie for tracking
 * 3. Stores the code in request context for downstream handlers
 *
 * Cookie persists across sessions, allowing referral attribution
 * even if user doesn't sign up immediately.
 */
async function captureReferralCode(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const { ref } = req.query as { ref?: string }

    if (ref && ref.trim()) {
      const code = ref.trim().toUpperCase()

      // Validate referral code format (alphanumeric with hyphens, reasonable length)
      // Format: REF-XXXXXX-YYYY or similar
      if (/^[A-Z0-9-]{4,30}$/.test(code)) {
        // Set secure httpOnly cookie for 30 days
        res.cookie("referral_code", code, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        })

        // Store in request context for API handlers to access
        req.context = req.context || {}
          ; (req.context as Record<string, unknown>).referral_code = code
      }
    }
  } catch (error) {
    // Don't fail the request if referral tracking fails
    console.error("Referral tracking error:", error)
  }

  next()
}

import { storeScopeMiddleware } from "./middlewares/store-scope"

export default defineMiddlewares({
  routes: [
    // Global RBAC Scoping
    {
      matcher: "/admin/**",
      middlewares: [storeScopeMiddleware],
    },
    // Capture referral codes on all store routes
    {
      matcher: "/store/**",
      middlewares: [captureReferralCode],
    },
    // Also capture on root for landing pages
    {
      matcher: "/",
      middlewares: [captureReferralCode],
    },
    {
      matcher: "/admin/digital-products/upload/**",
      method: "POST",
      middlewares: [upload.array("files")],
    },

    // ==========================================
    // Admin Permission Routes
    // ==========================================

    // Products module
    {
      matcher: "/admin/products/**",
      method: ["GET"],
      middlewares: [requirePermission("products", "read")],
    },
    {
      matcher: "/admin/products/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("products", "write")],
    },
    {
      matcher: "/admin/products/**",
      method: ["DELETE"],
      middlewares: [requirePermission("products", "delete")],
    },

    // Orders module
    {
      matcher: "/admin/orders/**",
      method: ["GET"],
      middlewares: [requirePermission("orders", "read")],
    },
    {
      matcher: "/admin/orders/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("orders", "write")],
    },
    {
      matcher: "/admin/orders/**",
      method: ["DELETE"],
      middlewares: [requirePermission("orders", "delete")],
    },

    // Customers module
    {
      matcher: "/admin/customers/**",
      method: ["GET"],
      middlewares: [requirePermission("customers", "read")],
    },
    {
      matcher: "/admin/customers/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("customers", "write")],
    },
    {
      matcher: "/admin/customers/**",
      method: ["DELETE"],
      middlewares: [requirePermission("customers", "delete")],
    },

    // Loyalty module
    {
      matcher: "/admin/loyalty/**",
      method: ["GET"],
      middlewares: [requirePermission("loyalty", "read")],
    },
    {
      matcher: "/admin/loyalty/**",
      method: ["POST", "PUT", "PATCH", "DELETE"],
      middlewares: [requirePermission("loyalty", "write")],
    },

    // Blog module
    {
      matcher: "/admin/blog/**",
      method: ["GET"],
      middlewares: [requirePermission("blog", "read")],
    },
    {
      matcher: "/admin/blog/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("blog", "write")],
    },
    {
      matcher: "/admin/blog/**",
      method: ["DELETE"],
      middlewares: [requirePermission("blog", "delete")],
    },

    // Digital Products module
    {
      matcher: "/admin/digital-products/**",
      method: ["GET"],
      middlewares: [requirePermission("digital_products", "read")],
    },
    {
      matcher: "/admin/digital-products/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("digital_products", "write")],
    },
    {
      matcher: "/admin/digital-products/**",
      method: ["DELETE"],
      middlewares: [requirePermission("digital_products", "delete")],
    },

    // Bundles module
    {
      matcher: "/admin/bundles/**",
      method: ["GET"],
      middlewares: [requirePermission("bundles", "read")],
    },
    {
      matcher: "/admin/bundles/**",
      method: ["POST", "PUT", "PATCH"],
      middlewares: [requirePermission("bundles", "write")],
    },
    {
      matcher: "/admin/bundles/**",
      method: ["DELETE"],
      middlewares: [requirePermission("bundles", "delete")],
    },

    // Webhooks (Settings level - manage only)
    {
      matcher: "/admin/webhooks/**",
      middlewares: [requireManage("webhooks")],
    },

    // Admin roles management (super admin only)
    {
      matcher: "/admin/roles/**",
      middlewares: [requireManage("admin_users")],
    },

    // Admin user role assignments (super admin only)
    {
      matcher: "/admin/users/*/roles/**",
      middlewares: [requireManage("admin_users")],
    },
  ],
})

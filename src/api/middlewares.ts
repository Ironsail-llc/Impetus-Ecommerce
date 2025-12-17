import {
  defineMiddlewares,
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import multer from "multer"

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
        ;(req.context as Record<string, unknown>).referral_code = code
      }
    }
  } catch (error) {
    // Don't fail the request if referral tracking fails
    console.error("Referral tracking error:", error)
  }

  next()
}

export default defineMiddlewares({
  routes: [
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
  ],
})

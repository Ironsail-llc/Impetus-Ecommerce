import { MedusaContainer } from "@medusajs/framework/types"
import { LOYALTY_MODULE } from ".."
import LoyaltyModuleService from "../service"
import {
  ILoyaltyNotificationManager,
  ILoyaltyNotificationProvider,
  LoyaltyNotificationEvent,
  NotificationPayload,
} from "./types"

/**
 * Default Notification Manager
 *
 * Handles routing notifications to registered providers based on
 * channel configuration from the database.
 *
 * Usage:
 * 1. Register providers (email, SMS, etc.)
 * 2. Call notify() with payload
 * 3. Manager checks DB settings and routes to appropriate providers
 */
export class LoyaltyNotificationManager implements ILoyaltyNotificationManager {
  private providers: Map<string, ILoyaltyNotificationProvider> = new Map()
  private container: MedusaContainer

  constructor(container: MedusaContainer) {
    this.container = container
  }

  /**
   * Register a notification provider
   */
  registerProvider(provider: ILoyaltyNotificationProvider): void {
    this.providers.set(provider.id, provider)
  }

  /**
   * Get the loyalty service from container
   */
  private getLoyaltyService(): LoyaltyModuleService {
    return this.container.resolve(LOYALTY_MODULE)
  }

  /**
   * Check if notifications are enabled for an event type
   */
  async isEnabled(eventType: LoyaltyNotificationEvent): Promise<boolean> {
    const loyaltyService = this.getLoyaltyService()

    try {
      const settings = await loyaltyService.listNotificationSettings({
        event_type: eventType,
      })

      if (settings.length === 0) {
        return false
      }

      const setting = settings[0]
      return setting.email_enabled || setting.sms_enabled
    } catch {
      return false
    }
  }

  /**
   * Send a notification through configured channels
   */
  async notify(payload: NotificationPayload): Promise<void> {
    const loyaltyService = this.getLoyaltyService()

    // Get notification settings for this event type
    const settings = await loyaltyService.listNotificationSettings({
      event_type: payload.event_type,
    })

    if (settings.length === 0) {
      // No settings configured, notifications disabled for this event
      return
    }

    const setting = settings[0]
    const errors: Error[] = []

    // Send email if enabled
    if (setting.email_enabled) {
      const emailProvider = this.findProviderForChannel("email")
      if (emailProvider) {
        try {
          await emailProvider.send("email", payload, setting.email_template_id ?? undefined)
        } catch (error) {
          errors.push(error as Error)
        }
      }
    }

    // Send SMS if enabled
    if (setting.sms_enabled) {
      const smsProvider = this.findProviderForChannel("sms")
      if (smsProvider) {
        try {
          await smsProvider.send("sms", payload, setting.sms_template_id ?? undefined)
        } catch (error) {
          errors.push(error as Error)
        }
      }
    }

    // Log errors but don't throw - notifications shouldn't block core functionality
    if (errors.length > 0) {
      console.error(`[Loyalty Notifications] Errors sending ${payload.event_type}:`, errors)
    }
  }

  /**
   * Find a provider that can handle the specified channel
   */
  private findProviderForChannel(
    channel: "email" | "sms"
  ): ILoyaltyNotificationProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.canHandle(channel)) {
        return provider
      }
    }
    return undefined
  }
}

/**
 * Console Logger Provider (for development/testing)
 *
 * Logs notifications to console instead of sending them.
 */
export class ConsoleNotificationProvider implements ILoyaltyNotificationProvider {
  readonly id = "console"

  canHandle(channel: "email" | "sms"): boolean {
    return true // Can handle both for logging purposes
  }

  async send(
    channel: "email" | "sms",
    payload: NotificationPayload,
    templateId?: string
  ): Promise<boolean> {
    console.log(`[Loyalty ${channel.toUpperCase()}] Event: ${payload.event_type}`)
    console.log(`  To: ${payload.customer_email}`)
    console.log(`  Template: ${templateId || "default"}`)
    console.log(`  Payload:`, JSON.stringify(payload, null, 2))
    return true
  }
}

/**
 * Factory function to create notification manager
 */
export function createNotificationManager(
  container: MedusaContainer
): LoyaltyNotificationManager {
  const manager = new LoyaltyNotificationManager(container)

  // Register console provider for development (can be replaced in production)
  if (process.env.NODE_ENV !== "production") {
    manager.registerProvider(new ConsoleNotificationProvider())
  }

  return manager
}

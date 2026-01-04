import {
  AbstractPaymentProvider,
  BigNumber,
  PaymentSessionStatus,
  Modules
} from "@medusajs/framework/utils"
import {
  Logger,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult
} from "@medusajs/framework/types"

type Options = {
  security_key: string
  public_key: string
}

type NmiPaymentData = {
  id: string
  transaction_id?: string
  payment_token?: string
  amount?: number
  currency_code?: string
  store_id?: string
}

export default class NmiPaymentProvider extends AbstractPaymentProvider<Options> {
  static identifier = "nmi"
  protected logger_: Logger
  protected options_: Options
  protected container_: any

  constructor(container: { logger: Logger }, options: Options) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.container_ = container
  }

  private async getCredentials(storeId?: string): Promise<{ security_key: string }> {
    // Default to global options
    let securityKey = this.options_.security_key

    if (storeId) {
      try {
        // Try to resolve credentials from store metadata for multi-tenant support
        const storeService = this.container_.resolve(Modules.STORE)
        const store = await storeService.retrieveStore(storeId).catch(() => null)

        if (store?.metadata?.nmi_security_key) {
          securityKey = store.metadata.nmi_security_key as string
        }
      } catch (e: any) {
        this.logger_.warn(`[Store: ${storeId}] Failed to fetch store credentials: ${e.message}`)
      }
    }

    if (!securityKey) {
      throw new Error(`NMI Security Key not found for store ${storeId || 'default'}`)
    }

    return { security_key: securityKey }
  }

  private async sendRequest(data: Record<string, string>, storeId?: string): Promise<Record<string, string>> {
    const { security_key } = await this.getCredentials(storeId)

    const formData = new URLSearchParams()
    formData.append("security_key", security_key)
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    })

    try {
      const response = await fetch("https://secure.nmi.com/api/transact.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const text = await response.text()
      const params = new URLSearchParams(text)
      const result: Record<string, string> = {}
      for (const [key, value] of params.entries()) {
        result[key] = value
      }
      return result
    } catch (error: any) {
      this.logger_.error(`[Store: ${storeId || 'n/a'}] NMI request failed: ${error.message}`)
      throw error
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, context } = input

    // NMI doesn't require pre-initialization - the payment is created when authorized
    // We return a placeholder session that will be updated with a token from the frontend
    const sessionId = `nmi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      id: sessionId,
      data: {
        id: sessionId,
        amount: Number(amount),
        currency_code,
        store_id: (context as any)?.store_id,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const { data } = input
    const paymentData = data as NmiPaymentData
    const token = paymentData.payment_token
    const storeId = paymentData.store_id
    // Amount and currency from data stored during initiatePayment
    const amount = paymentData.amount || 0
    const currency_code = paymentData.currency_code || "USD"

    // If no token yet, return pending (waiting for frontend to provide token)
    if (!token) {
      return {
        status: PaymentSessionStatus.PENDING,
        data: paymentData,
      }
    }

    // NMI expects amount in major units (e.g. 10.50)
    const nmiAmount = (Number(amount) / 100).toFixed(2)

    try {
      const response = await this.sendRequest({
        type: "auth",
        payment_token: token,
        amount: nmiAmount,
        currency: currency_code || "USD",
      }, storeId)

      if (response.response === "1") {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {
            ...paymentData,
            transaction_id: response.transactionid,
            payment_token: token,
            amount: Number(amount),
          },
        }
      } else {
        return {
          status: PaymentSessionStatus.ERROR,
          data: {
            ...paymentData,
            error: response.responsetext,
            code: response.response_code,
          },
        }
      }
    } catch (e: any) {
      return {
        status: PaymentSessionStatus.ERROR,
        data: {
          ...paymentData,
          error: e.message,
        },
      }
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const { data } = input
    const paymentData = data as NmiPaymentData
    const transactionId = paymentData.transaction_id
    const storeId = paymentData.store_id
    // Amount from data stored during authorization
    const amount = paymentData.amount || 0
    const nmiAmount = (Number(amount) / 100).toFixed(2)

    if (!transactionId) {
      throw new Error("No transaction ID for capture")
    }

    try {
      const response = await this.sendRequest({
        type: "capture",
        transactionid: transactionId,
        amount: nmiAmount,
      }, storeId)

      if (response.response === "1") {
        return {
          data: {
            ...paymentData,
            transaction_id: response.transactionid,
            status: "captured",
          },
        }
      }

      throw new Error(`NMI Capture failed: ${response.responsetext}`)
    } catch (error: any) {
      throw new Error(`NMI Capture failed: ${error.message}`)
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const { data, amount } = input
    const paymentData = data as NmiPaymentData
    const transactionId = paymentData.transaction_id
    const storeId = paymentData.store_id
    const nmiAmount = (Number(amount) / 100).toFixed(2)

    if (!transactionId) {
      throw new Error("No transaction ID for refund")
    }

    try {
      const response = await this.sendRequest({
        type: "refund",
        transactionid: transactionId,
        amount: nmiAmount,
      }, storeId)

      if (response.response === "1") {
        return {
          data: {
            ...paymentData,
            refund_transaction_id: response.transactionid,
          },
        }
      }

      throw new Error(`NMI Refund failed: ${response.responsetext}`)
    } catch (error: any) {
      throw new Error(`NMI Refund failed: ${error.message}`)
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const { data } = input
    const paymentData = data as NmiPaymentData
    const transactionId = paymentData.transaction_id
    const storeId = paymentData.store_id

    if (!transactionId) {
      // No transaction to void
      return { data: paymentData }
    }

    try {
      const response = await this.sendRequest({
        type: "void",
        transactionid: transactionId,
      }, storeId)

      if (response.response === "1") {
        return {
          data: {
            ...paymentData,
            void_transaction_id: response.transactionid,
          },
        }
      }

      throw new Error(`NMI Void failed: ${response.responsetext}`)
    } catch (error: any) {
      throw new Error(`NMI Void failed: ${error.message}`)
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    // NMI doesn't have a specific "delete" for a session state
    return { data: input.data }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    // NMI doesn't provide a direct retrieve API
    // Return the stored data
    return { data: input.data }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { data, amount, currency_code } = input

    return {
      data: {
        ...data,
        amount: Number(amount),
        currency_code,
      },
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const paymentData = input.data as NmiPaymentData
    const transactionId = paymentData.transaction_id

    if (!transactionId) {
      return { status: PaymentSessionStatus.PENDING }
    }

    // If we have a transaction ID and no error, assume authorized
    return { status: PaymentSessionStatus.AUTHORIZED }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data } = payload

    // NMI webhook handling - customize based on your webhook setup
    try {
      const eventType = data.event_type as string

      switch (eventType) {
        case "transaction.authorized":
          return {
            action: "authorized",
            data: {
              session_id: (data.metadata as Record<string, any>)?.session_id || "",
              amount: new BigNumber(data.amount as number || 0),
            },
          }
        case "transaction.captured":
          return {
            action: "captured",
            data: {
              session_id: (data.metadata as Record<string, any>)?.session_id || "",
              amount: new BigNumber(data.amount as number || 0),
            },
          }
        default:
          return {
            action: "not_supported",
            data: {
              session_id: "",
              amount: new BigNumber(0),
            },
          }
      }
    } catch (e) {
      return {
        action: "failed",
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }
  }
}

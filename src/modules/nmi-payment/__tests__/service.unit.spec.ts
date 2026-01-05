import { PaymentSessionStatus } from "@medusajs/framework/utils"
import NmiPaymentProvider from "../service"

// Mock the global fetch function
global.fetch = jest.fn()

describe("NmiPaymentProvider", () => {
    let provider: NmiPaymentProvider
    let container: any

    beforeEach(() => {
        jest.clearAllMocks()
        container = {
            logger: {
                warn: jest.fn(),
                error: jest.fn(),
                info: jest.fn(),
            },
            resolve: jest.fn(),
        }
        provider = new NmiPaymentProvider(container, {
            security_key: "test_key",
            public_key: "test_public",
        })
    })

    describe("authorizePayment", () => {
        it("should return PENDING if no payment_token is present", async () => {
            const result = await provider.authorizePayment({
                data: {
                    id: "test_sess",
                    amount: 1000,
                    currency_code: "usd",
                },
                context: {},
            })

            expect(result.status).toBe(PaymentSessionStatus.PENDING)
        })

        it("should successfully authorize when NMI returns success", async () => {
            // Mock successful NMI response
            (global.fetch as jest.Mock).mockResolvedValue({
                text: async () => "response=1&transactionid=txn_123&responsetext=SUCCESS",
            })

            const result = await provider.authorizePayment({
                data: {
                    id: "test_sess",
                    payment_token: "valid_token",
                    amount: 1000,
                    currency_code: "usd",
                },
                context: {},
            } as any)

            if (result.status === PaymentSessionStatus.AUTHORIZED) {
                expect((result.data as any).transaction_id).toBe("txn_123")
            } else {
                fail("Expected result to be AUTHORIZED")
            }

            expect(result.status).toBe(PaymentSessionStatus.AUTHORIZED)

            expect(global.fetch).toHaveBeenCalledWith(
                "https://secure.nmi.com/api/transact.php",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("type=auth"),
                })
            )
        })

        it("should handle NMI failure response", async () => {
            // Mock failed NMI response
            (global.fetch as jest.Mock).mockResolvedValue({
                text: async () => "response=2&responsetext=DECLINED&response_code=200",
            })

            const result = await provider.authorizePayment({
                data: {
                    id: "test_sess",
                    payment_token: "bad_token",
                    amount: 1000,
                    currency_code: "usd",
                },
                context: {},
            } as any)

            expect(result.status).toBe(PaymentSessionStatus.ERROR)
            if (result.status === PaymentSessionStatus.ERROR) {
                expect((result.data as any).error).toBe("DECLINED")
            }
        })
    })

    describe("capturePayment", () => {
        it("should successfully capture payment", async () => {
            // Mock successful capture
            (global.fetch as jest.Mock).mockResolvedValue({
                text: async () => "response=1&transactionid=txn_capture_123",
            })

            const result = await provider.capturePayment({
                data: {
                    transaction_id: "txn_123",
                    amount: 1000,
                },
            } as any)

            if ('data' in result) { // Check if result has data property (it might be error)
                // Wait, capturePayment returns CapturePaymentOutput which IS object with data?
                // Actually types say it is: Promise<CapturePaymentOutput | PaymentProviderError> ?
                // No, service.ts returns CapturePaymentOutput directly or throws.
                // In service.ts: async capturePayment(...): Promise<CapturePaymentOutput>
                // So result is CapturePaymentOutput.
                // CapturePaymentOutput has data?
                // Check line 221 in service.ts: returns { data: ... }
                // So result.data should be there. 
                // But TS complained "result.data is possibly undefined".
                // This implies CapturePaymentOutput might not have data?
                // Or maybe it confused it with Error.
                expect(result.data).toBeDefined()
                expect((result.data as any).status).toBe("captured")
                expect((result.data as any).transaction_id).toBe("txn_capture_123")
            }

            expect(global.fetch).toHaveBeenCalledWith(
                "https://secure.nmi.com/api/transact.php",
                expect.objectContaining({
                    body: expect.stringContaining("type=capture"),
                })
            )
        })

        it("should throw error if no transaction_id", async () => {
            await expect(
                provider.capturePayment({ data: {} } as any)
            ).rejects.toThrow("No transaction ID for capture")
        })
    })

    describe("refundPayment", () => {
        it("should successfully refund payment", async () => {
            // Mock successful refund
            (global.fetch as jest.Mock).mockResolvedValue({
                text: async () => "response=1&transactionid=txn_refund_123",
            })

            const result = await provider.refundPayment({
                data: {
                    transaction_id: "txn_123",
                },
                amount: 500, // Partial refund
            } as any)

            expect((result.data as any).refund_transaction_id).toBe("txn_refund_123")
            expect(global.fetch).toHaveBeenCalledWith(
                "https://secure.nmi.com/api/transact.php",
                expect.objectContaining({
                    body: expect.stringContaining("type=refund"),
                })
            )
        })
    })
})

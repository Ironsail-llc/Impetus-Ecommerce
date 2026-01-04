import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addCustomerToGroupWorkflow } from "../../../workflows/add-customer-to-group"

export const POST = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const payload = req.body as {
        email?: string
        status?: string
        internal_id?: string
    }

    // Basic Validation
    if (!payload.email || payload.status !== 'verified') {
        res.status(400).json({
            message: "Invalid payload: 'email' and 'status: verified' required"
        })
        return
    }

    try {
        const { result } = await addCustomerToGroupWorkflow(req.scope).run({
            input: {
                email: payload.email,
                group_name: "Patients"
            }
        })

        res.status(200).json({
            success: true,
            message: "Patient status verified",
            data: result
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

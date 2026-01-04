import {
    createStep,
    createWorkflow,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type Input = {
    email: string
    group_name: string
}

const addCustomerToGroupStep = createStep(
    "add-customer-to-group-step",
    async (input: Input, { container }) => {
        const customerModuleService = container.resolve(Modules.CUSTOMER)

        // 1. Find Customer
        const [customer] = await customerModuleService.listCustomers({
            email: input.email,
        })

        if (!customer) {
            throw new Error(`Customer with email ${input.email} not found`)
        }

        // 2. Find Group
        const [group] = await customerModuleService.listCustomerGroups({
            name: input.group_name,
        })

        if (!group) {
            throw new Error(`Customer group ${input.group_name} not found`)
        }

        // 3. Link
        await customerModuleService.addCustomerToGroup({
            customer_id: customer.id,
            customer_group_id: group.id
        })

        return new WorkflowResponse({ success: true, customer_id: customer.id, group_id: group.id })
    }
)

export const addCustomerToGroupWorkflow = createWorkflow(
    "add-customer-to-group",
    (input: Input) => {
        return addCustomerToGroupStep(input)
    }
)

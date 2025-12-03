import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  res.json({
    message: "Impetus E-commerce API is running!",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
}

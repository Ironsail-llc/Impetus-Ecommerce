
import Medusa from "@medusajs/js-sdk";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY = "pk_454eed8c5e434aca0b290e3c047244e9d37f4548e77e6d415f7b33e1eb53ffd9";
// Try to get URL from env or default to localhost, but we really want the remote one if possible.
// If the user runs this locally, it might hit localhost, which is fine for verifying local DB state via API.
const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

console.log(`Testing connection to: ${BACKEND_URL}`);
console.log(`Using Key: ${API_KEY}`);

const sdk = new Medusa({
    baseUrl: BACKEND_URL,
    debug: true,
    publishableKey: API_KEY,
});

async function verify() {
    try {
        console.log("Fetching regions...");
        const { regions } = await sdk.store.region.list();
        console.log(`Found ${regions.length} regions.`);
        regions.forEach(r => console.log(`- ${r.name} (${r.countries?.map(c => c.iso_2).join(',')})`));

        console.log("\nFetching products...");
        const { products } = await sdk.store.product.list({
            region_id: regions[0]?.id,
            fields: "+title,+handle" // minimal fields
        });

        if (products.length === 0) {
            console.error("❌ No products found! Seeding might have failed or region mismatch.");
        } else {
            console.log(`✅ Success! Found ${products.length} products:`);
            products.forEach(p => console.log(`- ${p.title} (${p.handle})`));
        }

    } catch (error) {
        console.error("❌ Connection failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
        }
    }
}

verify();

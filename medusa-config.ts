import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    ...(process.env.REDIS_URL && { redisUrl: process.env.REDIS_URL }),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "./src/modules/loyalty",
    },
    {
      resolve: "./src/modules/webhooks",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/nmi-payment",
            id: "nmi",
            options: {
              security_key: process.env.NMI_SECURITY_KEY,
              public_key: process.env.NEXT_PUBLIC_NMI_PUBLIC_KEY,
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/bundled-product",
    },
    {
      resolve: "./src/modules/digital-product",
    },
    {
      resolve: "./src/modules/blog",
    },
    // {
    //   resolve: "@medusajs/medusa/fulfillment",
    //   options: {
    //     providers: [
    //       {
    //         resolve: "./src/modules/digital-product-fulfillment",
    //         id: "digital",
    //       },
    //     ],
    //   },
    // },
  ],
})

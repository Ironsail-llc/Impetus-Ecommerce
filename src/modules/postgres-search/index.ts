import { Module } from "@medusajs/framework/utils"
import PostgresSearchService from "./service"

export const POSTGRES_SEARCH_MODULE = "postgresSearch"

export default Module(POSTGRES_SEARCH_MODULE, {
    service: PostgresSearchService,
})

# Native Postgres Search Architecture

## Overview

The Search module (`src/modules/postgres-search`) implements a "Zero-Sync" architecture. Instead of syncing data to an external search engine (Algolia/Meilisearch), it queries the primary Postgres database directly using Full Text Search capabilities.

## Architecture

### Zero-Sync Pattern
- **Indexing**: `createIndex`, `addDocuments`, `deleteDocument` are **No-Ops**.
- **Data Source**: The `search` method queries the live `product` table.
- **Benefit**: Zero latency between product updates and search availability. No eventual consistency issues.

### Implementation Details

**Service**: `PostgresSearchService`
- Extends: `AbstractSearchService`
- Connection: Injects crude `__pg_connection__` (Knex/MikroORM raw driver) to execute SQL.

### Query Logic
1.  **Sanitization**: Input is split into tokens.
2.  **Formatting**: Tokens are joined with `&` and suffixed with `:*` for prefix matching (e.g., "Red Shirt" -> "Red:* & Shirt:*").
3.  **SQL**:
    ```sql
    SELECT id 
    FROM product 
    WHERE to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')) 
    @@ to_tsquery('english', ?)
    ```

## Limitations
- **Scale**: Performance depends on Postgres indexing (GIN index recommended for `to_tsvector`).
- **Features**: Lacks typo tolerance and complex relevance tuning found in dedicated search engines.

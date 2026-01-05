# Testing Strategy

## Overview

The testing infrastructure requires specific handling due to the complexity of database connections and module interactions.

## Integration Testing

### Connection Handling
Tests often fail with "poison pill" interactions where a database connection remains open or in a bad state.
- **Harness**: A custom test harness is used to wrap the Medusa integration test runner.
- **Database**: Ensure `test-db-connection.js` passes before running the suite.
- **Parameters**: `localhost` vs `127.0.0.1` matters for Docker/Local bridging.

### Running Tests
```bash
# Run HTTP integration tests
npm run test:integration:http

# Run Module integration tests
npm run test:integration:modules
```

## Setup & Teardown

1.  **Migrations**: Ensure `MetadataStorage.clear()` is called in `setup.js` to prevent MikroORM metadata pollution.
2.  **Seeding**: Use specific seed scripts (e.g. `seed-gating.ts`) to populate necessary fixtures (Customer Groups, Products).

## Best Practices
- **Isolation**: Each test file should theoretically be independent, but shared DB resources mean cleanup is critical.
- **Mocking**: For external services (NMI, Search), prefer service-level mocks over network interceptors unless testing the adapter itself.

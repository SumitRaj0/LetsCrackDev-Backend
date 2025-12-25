# Integration Tests

Comprehensive end-to-end integration tests for the LetsCrackDev backend API.

## Overview

These tests verify complete user flows and system integration across all modules:

- **Authentication Flow**: Signup → Login → Token Refresh → Password Reset
- **Resources Flow**: Browse → Filter → Bookmark → CRUD operations
- **Courses Flow**: Browse → Enroll → Track Progress
- **Payments Flow**: Checkout → Payment Verification → Purchase History
- **Chatbot Flow**: Send Message → Conversation History
- **Admin Flow**: Analytics → User Management → Resource Management
- **End-to-End Journey**: Complete user lifecycle from signup to premium purchase

## Test Files

### `auth.integration.test.ts`

Tests the complete authentication lifecycle:

- User signup and login
- Token generation and refresh
- Password reset flow
- Profile updates
- Account deletion
- Role-based access control

### `resources.integration.test.ts`

Tests resource management:

- Resource CRUD operations (admin only)
- Resource browsing with pagination
- Filtering by category, difficulty, search
- Bookmarking functionality
- Access control validation

### `courses.integration.test.ts`

Tests course management and enrollment:

- Course CRUD operations (admin only)
- Course enrollment
- Progress tracking
- Course browsing and filtering

### `payments.integration.test.ts`

Tests payment and purchase flows:

- Checkout session creation
- Payment verification
- Purchase history
- Access control (users can only see their purchases)

### `chatbot.integration.test.ts`

Tests AI chatbot functionality:

- Message sending and receiving
- Conversation history
- Rate limiting
- Error handling

### `admin.integration.test.ts`

Tests admin-only functionality:

- Analytics endpoints
- User management access
- Resource/course management permissions
- Admin middleware validation

### `e2e.integration.test.ts`

Complete end-to-end user journey:

- Full user lifecycle from signup to premium purchase
- Multiple modules interacting together
- Real-world usage scenarios

## Test Helpers

### `testHelpers.ts`

Utility functions for integration tests:

- `createTestUser()`: Create user and get auth tokens
- `authenticatedRequest()`: Make authenticated API requests
- `createTestResource()`: Create test resources
- `createTestCourse()`: Create test courses
- `createTestService()`: Create test services
- `cleanupTestData()`: Clean up test database
- `generateTestEmail()`: Generate unique test emails

## Running Tests

### Run all integration tests

```bash
npm run test:integration
```

### Run specific integration test file

```bash
npm test -- src/__tests__/integration/auth.integration.test.ts
```

### Run with coverage

```bash
npm run test:integration:coverage
```

### Run in watch mode

```bash
npm run test:integration:watch
```

## Test Environment

Tests require:

- MongoDB test database (configured in `.env.test`)
- Jest test framework
- Supertest for HTTP assertions

### Environment Variables for Tests

Create `.env.test` file:

```env
TEST_MONGODB_URI=mongodb://localhost:27017/letscrackdev_test
ACCESS_TOKEN_SECRET=test-access-token-secret-key-for-testing-only-min-32-chars-long
REFRESH_TOKEN_SECRET=test-refresh-token-secret-key-for-testing-only-min-32-chars-long
NODE_ENV=test
```

Note: Razorpay and Gemini API keys are optional for tests. Tests will handle missing keys gracefully.

## Test Coverage

Each test suite covers:

- ✅ Happy path scenarios
- ✅ Error handling
- ✅ Authentication/authorization
- ✅ Input validation
- ✅ Edge cases
- ✅ Access control

## Test Organization

Tests are organized by feature flow rather than by module, ensuring:

- Real-world usage scenarios
- Cross-module interactions
- Complete user journeys
- Integration between components

## Best Practices

1. **Clean Database**: Each test cleans up after itself
2. **Isolated Tests**: Tests don't depend on each other
3. **Realistic Data**: Tests use realistic data structures
4. **Error Scenarios**: Tests include error cases
5. **Authentication**: Tests verify proper auth requirements
6. **Unique Data**: Uses unique emails/timestamps to avoid collisions

## Debugging Tests

### Run single test

```bash
npm test -- -t "TC-AUTH-FLOW-001"
```

### Verbose output

```bash
npm test -- --verbose
```

### Debug mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand src/__tests__/integration/auth.integration.test.ts
```

## Adding New Tests

1. Use test helpers from `testHelpers.ts`
2. Follow naming convention: `TC-{MODULE}-FLOW-{NUMBER}: {Description}`
3. Clean up data in `afterEach`
4. Test both success and error cases
5. Verify authentication/authorization requirements

## Notes

- Tests use the full Express app (`app.ts`) for realistic testing
- Database is cleaned between tests
- Rate limiting is disabled in test environment
- Razorpay integration may use mock data if keys not configured
- Chatbot tests may skip if Gemini API key not available

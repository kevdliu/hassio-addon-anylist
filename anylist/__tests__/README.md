# Recipe API Test Suite

This test suite provides comprehensive testing for the Recipe API endpoints using modern testing practices and tools.

## 🛠️ Technologies Used

### Faker.js for Realistic Test Fixtures
- **@faker-js/faker** generates realistic test data instead of hardcoded mock values
- Recipe names, ingredients, cooking times, and other properties are dynamically generated
- Ensures tests work with varied data and catch edge cases

### Jest for Test Organization and Execution
- Tests are organized by endpoint in separate files for better maintainability
- Each endpoint has its own test file in the `__tests__/endpoints/` directory
- Jest configuration includes setup files and coverage collection

### Mock Service Worker (MSW) Patterns for Isolation
- Tests use MSW-inspired patterns to mock external dependencies
- Custom `MockAnyListService` class provides isolated test environment
- No coupling to external AnyList services during testing

## 📁 Test Structure

```
__tests__/
├── setup.js                    # Global test configuration
├── fixtures.js                 # Faker-based test data generators
├── mocks.js                    # MSW-inspired mock service
├── recipe-api.test.js          # Main test suite
└── endpoints/                  # Individual endpoint tests
    ├── recipes-get.test.js
    ├── recipes-get-by-id.test.js
    ├── recipes-post.test.js
    ├── recipes-put.test.js
    ├── recipes-delete.test.js
    ├── recipe-collections.test.js
    └── meal-plan.test.js
```

## 🧪 Test Features

### Fixture Generation
- `createRecipe()` - Generates complete recipe objects with ingredients and steps
- `createIngredient()` - Creates realistic ingredient data with units and quantities
- `createRecipeCollection()` - Generates recipe collection data
- `createMealPlanEvent()` - Creates meal planning event data

### Mock Service Patterns
- Complete isolation from external AnyList API
- Predictable test data with deterministic behavior
- Support for different error scenarios (login failures, API errors, empty data)

### Comprehensive Coverage
- **79 tests** covering all 7 Recipe API endpoints
- Success scenarios for all CRUD operations
- Error handling and validation testing
- Edge cases like missing data and invalid requests

## 🎯 Endpoint Coverage

### Recipe CRUD Operations
- **GET /recipes** - List all recipes with optional collection filtering
- **GET /recipes/:id** - Get specific recipe details
- **POST /recipes** - Create new recipes with validation
- **PUT /recipes/:id** - Update existing recipes
- **DELETE /recipes/:id** - Delete recipes

### Recipe Collections & Meal Planning
- **GET /recipe-collections** - Retrieve recipe collections
- **POST /meal-plan** - Add recipes to meal planning calendar

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Run specific endpoint tests
npm test -- recipes-get.test.js
```

## 📊 Test Output

```
Test Suites: 8 passed, 8 total
Tests:       79 passed, 79 total
Snapshots:   0 total
Time:        2.063 s
```

## 🔧 Configuration

### Jest Configuration
- **testEnvironment**: Node.js for server-side testing
- **setupFilesAfterEnv**: Global test setup and mocking
- **testMatch**: Automatically discovers test files
- **verbose**: Detailed test output
- **testTimeout**: 10 seconds for longer-running tests

### Mock Configuration
- **AnyList module mocking** - Prevents external API calls
- **Environment variables** - Test credentials and settings
- **Console output suppression** - Clean test output

## 🌟 Benefits

1. **Isolation**: Tests run completely independently of external services
2. **Realistic Data**: Faker generates varied, realistic test data
3. **Maintainability**: Modular structure makes tests easy to maintain
4. **Reliability**: Consistent, predictable test results
5. **Coverage**: Comprehensive testing of all API functionality
6. **Documentation**: Tests serve as living documentation of API behavior

## 🔄 Continuous Integration

The test suite is designed to work seamlessly in CI/CD environments:
- No external dependencies during test execution
- Fast execution (under 3 seconds)
- Deterministic results
- Clear failure reporting

This testing approach ensures the Recipe API is thoroughly tested while maintaining fast, reliable test execution that's completely isolated from external services.
# Recipe API Documentation

This document describes the recipe management endpoints added to the AnyList Home Assistant Add-on.

## Recipe Endpoints

### GET /recipes
Retrieve all recipes from your AnyList account.

**Query Parameters:**
- `collection` (optional): Filter recipes by collection name (case-insensitive). If the collection doesn't exist, returns an empty array.

**Validation:**
- Collection parameter must be a non-empty string if provided

**Response:**
```json
{
  "recipes": [
    {
      "id": "recipe-identifier",
      "name": "Recipe Name",
      "note": "Recipe notes",
      "sourceName": "Source name",
      "sourceUrl": "http://example.com/recipe",
      "ingredients": [
        {
          "name": "Ingredient name",
          "quantity": "1",
          "unit": "cup"
        }
      ],
      "preparationSteps": ["Step 1", "Step 2"],
      "photoUrls": ["http://example.com/photo.jpg"],
      "cookTime": 30,
      "prepTime": 15,
      "servings": "4",
      "rating": 5,
      "nutritionalInfo": "Nutrition details",
      "creationTimestamp": 1234567890
    }
  ]
}
```

**Examples:**
- `GET /recipes` - Get all recipes
- `GET /recipes?collection=Favorites` - Get only recipes in the "Favorites" collection

**Status Codes:**
- 200: Success
- 422: Invalid collection parameter (semantic validation error)
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### GET /recipes/{id}
Get details for a specific recipe by ID.

**Parameters:**
- `id`: Recipe identifier (required, non-empty string)

**Validation:**
- Recipe ID must be a non-empty string

**Response:** Single recipe object (same structure as above)

**Status Codes:**
- 200: Success
- 400: Invalid recipe ID (malformed request)
- 404: Recipe not found
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### POST /recipes
Create a new recipe.

**Request Body:**
```json
{
  "name": "New Recipe",
  "note": "Recipe description",
  "sourceName": "Source",
  "sourceUrl": "http://example.com",
  "ingredients": [
    {
      "name": "Ingredient",
      "quantity": "1",
      "unit": "cup"
    }
  ],
  "preparationSteps": ["Step 1", "Step 2"],
  "cookTime": 30,
  "prepTime": 15,
  "servings": "4",
  "rating": 5
}
```

**Validation Rules:**
- `name` (required): Non-empty string
- `note` (optional): String
- `sourceName` (optional): String
- `sourceUrl` (optional): Valid URL format or empty string
- `cookTime` (optional): Non-negative integer
- `prepTime` (optional): Non-negative integer
- `rating` (optional): Integer between 1 and 5
- `ingredients` (optional): Array of ingredient objects
  - Each ingredient requires `name` as non-empty string
  - `quantity` and `unit` must be strings if provided
- `preparationSteps` (optional): Array of non-empty strings
- `photoUrls` (optional): Array of valid URLs

**Response:**
```json
{
  "id": "new-recipe-identifier"
}
```

**Error Response:**
```json
{
  "errors": [
    "Recipe name is required and must be a non-empty string",
    "Rating must be an integer between 1 and 5"
  ]
}
```

**Status Codes:**
- 201: Recipe created
- 422: Invalid request data (validation errors with detailed error messages)
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### PUT /recipes/{id}
Update an existing recipe.

**Parameters:**
- `id`: Recipe identifier (required, non-empty string)

**Request Body:** Same structure as POST (all fields optional for partial updates)

**Validation Rules:** Same as POST, but all fields are optional for partial updates

**Response:**
```json
{
  "id": "recipe-identifier"
}
```

**Error Response:**
```json
{
  "errors": [
    "Recipe name must be a non-empty string",
    "Cook time must be a non-negative integer"
  ]
}
```

**Status Codes:**
- 200: Recipe updated
- 400: Invalid recipe ID (malformed request)
- 404: Recipe not found
- 422: Invalid request data (validation errors with detailed error messages)
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### DELETE /recipes/{id}
Delete a recipe.

**Parameters:**
- `id`: Recipe identifier (required, non-empty string)

**Validation:**
- Recipe ID must be a non-empty string

**Status Codes:**
- 200: Recipe deleted
- 400: Invalid recipe ID (malformed request)
- 404: Recipe not found
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### GET /recipe-collections
Get available recipe collections from your AnyList account.

**Response:**
```json
{
  "collections": [
    {
      "id": "collection-identifier",
      "name": "Collection Name",
      "recipeIds": ["recipe1-id", "recipe2-id"]
    }
  ]
}
```

**Status Codes:**
- 200: Collections retrieved successfully
- 429: Rate limit exceeded (too many requests)
- 500: Server error

### POST /meal-plan
Add a recipe to the meal planning calendar.

**Request Body:**
```json
{
  "recipeId": "recipe-identifier",
  "date": "2024-01-15",
  "mealType": "Dinner"
}
```

**Validation Rules:**
- `recipeId` (required): Non-empty string
- `date` (required): Valid date format (YYYY-MM-DD or ISO string)
- `mealType` (optional): One of "breakfast", "lunch", "dinner", "snack", "meal"

**Response:**
```json
{
  "eventId": "meal-plan-event-identifier"
}
```

**Error Response:**
```json
{
  "errors": [
    "Recipe ID is required and must be a non-empty string",
    "Date must be a valid date format (YYYY-MM-DD or ISO string)"
  ]
}
```

**Status Codes:**
- 201: Meal plan event created
- 422: Invalid request data (validation errors with detailed error messages)
- 429: Rate limit exceeded (too many requests)
- 500: Server error

## Performance Optimizations

### Collection Filtering Optimization
The recipe collection filtering has been optimized for large recipe sets:

- **Efficient Filtering**: When filtering by collection, the system first retrieves collection metadata to identify target recipe IDs, then filters the recipe list using a Set for O(1) lookups instead of O(n) searches.
- **Early Exit**: If a collection doesn't exist, the system returns an empty array without loading all recipes, saving API calls and processing time.
- **Set-based Lookups**: Collection recipe ID filtering uses Set data structure for faster membership testing.

### Input Validation Benefits
Comprehensive input validation provides:

- **Early Error Detection**: Invalid data is caught before API calls to AnyList
- **Detailed Error Messages**: Multiple validation errors are returned in a single response
- **Type Safety**: All data types are validated before processing
- **URL Validation**: Source URLs and photo URLs are validated for proper format

## Authentication and Security

All recipe endpoints use the same authentication and IP filtering as existing endpoints:
- EMAIL and PASSWORD environment variables required
- IP_FILTER environment variable respected if set
- All requests must come from allowed IP addresses

## Error Handling

All endpoints return appropriate HTTP status codes and JSON error messages where applicable:
- 400: Bad Request (malformed requests, missing path parameters)
- 403: Forbidden (IP filtering)
- 404: Not Found (recipe doesn't exist)
- 422: Unprocessable Entity (validation errors, semantic data issues)
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error (AnyList API errors, network issues)

### Error Response Formats

**Validation Errors (422):**
```json
{
  "errors": [
    "Recipe name is required and must be a non-empty string",
    "Cook time must be a non-negative integer"
  ]
}
```

**Single Error Messages (400, 404):**
```json
{
  "error": "Recipe ID is required and must be a non-empty string"
}
```

**Rate Limiting (429):**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

## Example Usage

```bash
# Get all recipes
curl http://localhost:8080/recipes

# Get specific recipe
curl http://localhost:8080/recipes/recipe-id

# Create new recipe
curl -X POST http://localhost:8080/recipes \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Recipe","ingredients":[{"name":"Test","quantity":"1","unit":"cup"}]}'

# Add recipe to meal plan
curl -X POST http://localhost:8080/meal-plan \
  -H "Content-Type: application/json" \
  -d '{"recipeId":"recipe-id","date":"2024-01-15","mealType":"Dinner"}'
```
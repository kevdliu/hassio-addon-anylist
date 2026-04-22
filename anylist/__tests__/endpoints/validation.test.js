const request = require('supertest');
const { faker } = require('@faker-js/faker');
const app = require('../../index');

// Mock the AnyList module
jest.mock('anylist', () => {
    return jest.fn().mockImplementation(() => ({
        login: jest.fn().mockResolvedValue(true),
        getLists: jest.fn().mockResolvedValue(true),
        getRecipes: jest.fn().mockResolvedValue(true),
        createRecipe: jest.fn().mockResolvedValue({
            identifier: 'recipe-1',
            save: jest.fn().mockResolvedValue(true)
        }),
        createEvent: jest.fn().mockResolvedValue({
            identifier: 'event-1',
            save: jest.fn().mockResolvedValue(true)
        }),
        recipes: [],
        _getUserData: jest.fn().mockResolvedValue({
            recipeDataResponse: {
                recipeCollections: [
                    { name: 'Favorites', recipeIds: ['recipe-1'] }
                ]
            }
        })
    }));
});

describe('Input Validation Tests', () => {
    
    describe('POST /recipes validation', () => {
        
        test('should reject invalid recipe data types', async () => {
            const invalidRecipe = {
                name: 123, // should be string
                cookTime: 'invalid', // should be integer
                rating: 6, // should be 1-5
                ingredients: 'not-an-array', // should be array
                preparationSteps: [''], // should not be empty string
                sourceUrl: 'not-a-url', // should be valid URL
                photoUrls: ['not-a-url'] // should be valid URLs
            };
            
            const response = await request(app)
                .post('/recipes')
                .send(invalidRecipe)
                .expect(422);
                
            expect(response.body).toHaveProperty('errors');
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Recipe name is required and must be a non-empty string',
                    'Cook time must be a non-negative integer',
                    'Rating must be an integer between 1 and 5',
                    'Ingredients must be an array',
                    'Preparation step 1: must be a non-empty string',
                    'Source URL must be a valid URL format',
                    'Photo URL 1: must be a valid URL format'
                ])
            );
        });
        
        test('should reject recipe with invalid ingredient structure', async () => {
            const invalidRecipe = {
                name: faker.food.dish(),
                ingredients: [
                    { name: '', quantity: 123, unit: true }, // invalid types
                    { quantity: '1 cup' } // missing name
                ]
            };
            
            const response = await request(app)
                .post('/recipes')
                .send(invalidRecipe)
                .expect(422);
                
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Ingredient 1: name is required and must be a non-empty string',
                    'Ingredient 1: quantity must be a string',
                    'Ingredient 1: unit must be a string',
                    'Ingredient 2: name is required and must be a non-empty string'
                ])
            );
        });
        
        test('should accept valid recipe with all fields', async () => {
            const validRecipe = {
                name: faker.food.dish(),
                note: faker.lorem.sentence(),
                sourceName: faker.company.name(),
                sourceUrl: faker.internet.url(),
                cookTime: faker.number.int({ min: 0, max: 120 }),
                prepTime: faker.number.int({ min: 0, max: 60 }),
                rating: faker.number.int({ min: 1, max: 5 }),
                ingredients: [
                    {
                        name: faker.food.ingredient(),
                        quantity: faker.number.int({ min: 1, max: 5 }).toString(),
                        unit: faker.helpers.arrayElement(['cups', 'tsp', 'tbsp'])
                    }
                ],
                preparationSteps: [faker.lorem.sentence()],
                photoUrls: [faker.image.urlLoremFlickr({ category: 'food' })],
                nutritionalInfo: faker.lorem.sentence()
            };
            
            const response = await request(app)
                .post('/recipes')
                .send(validRecipe)
                .expect(201);
                
            expect(response.body).toHaveProperty('id');
        });
    });
    
    describe('PUT /recipes/:id validation', () => {
        
        test('should reject invalid recipe ID', async () => {
            const response = await request(app)
                .put('/recipes/')
                .send({ name: faker.food.dish() })
                .expect(404); // Express handles empty param as 404
        });
        
        test('should reject empty recipe ID', async () => {
            // Test with URL-encoded space
            const response = await request(app)
                .put('/recipes/%20')  // URL-encoded space
                .send({ name: faker.food.dish() })
                .expect(400);
                
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Recipe ID is required');
        });
        
        test('should allow partial updates with valid data', async () => {
            const partialUpdate = {
                rating: faker.number.int({ min: 1, max: 5 }),
                cookTime: faker.number.int({ min: 0, max: 120 })
            };
            
            const response = await request(app)
                .put('/recipes/recipe-1')
                .send(partialUpdate)
                .expect(404); // Recipe not found in mock, but validation passed
        });
        
        test('should reject partial updates with invalid data', async () => {
            const invalidUpdate = {
                rating: 10, // invalid rating
                cookTime: -5, // invalid cook time
                name: '' // invalid name
            };
            
            const response = await request(app)
                .put('/recipes/recipe-1')
                .send(invalidUpdate)
                .expect(422);
                
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Rating must be an integer between 1 and 5',
                    'Cook time must be a non-negative integer',
                    'Recipe name must be a non-empty string'
                ])
            );
        });
    });
    
    describe('POST /meal-plan validation', () => {
        
        test('should reject missing required fields', async () => {
            const response = await request(app)
                .post('/meal-plan')
                .send({})
                .expect(422);
                
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Recipe ID is required and must be a non-empty string',
                    'Date is required and must be a string'
                ])
            );
        });
        
        test('should reject invalid date format', async () => {
            const invalidMealPlan = {
                recipeId: 'recipe-1',
                date: 'not-a-date',
                mealType: 'invalid-meal-type'
            };
            
            const response = await request(app)
                .post('/meal-plan')
                .send(invalidMealPlan)
                .expect(422);
                
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Date must be a valid date format (YYYY-MM-DD or ISO string)',
                    'Meal type must be one of: breakfast, lunch, dinner, snack, meal'
                ])
            );
        });
        
        test('should accept valid meal plan data', async () => {
            const validMealPlan = {
                recipeId: 'recipe-1',
                date: faker.date.future().toLocaleDateString('en-CA'), // YYYY-MM-DD format
                mealType: faker.helpers.arrayElement(['breakfast', 'lunch', 'dinner', 'snack'])
            };
            
            const response = await request(app)
                .post('/meal-plan')
                .send(validMealPlan)
                .expect(201);
                
            expect(response.body).toHaveProperty('eventId');
        });
    });
    
    describe('GET /recipes collection validation', () => {
        
        test('should reject empty collection parameter', async () => {
            const response = await request(app)
                .get('/recipes?collection=')
                .expect(422);
                
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    'Collection parameter must be a non-empty string'
                ])
            );
        });
        
        test('should accept valid collection parameter', async () => {
            const response = await request(app)
                .get('/recipes?collection=Favorites')
                .expect(200);
                
            expect(response.body).toHaveProperty('recipes');
        });
    });
    
    describe('DELETE /recipes/:id validation', () => {
        
        test('should reject invalid recipe ID for deletion', async () => {
            const response = await request(app)
                .delete('/recipes/%20')  // URL-encoded space
                .expect(400);
                
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Recipe ID is required');
        });
    });
    
    describe('GET /recipes/:id validation', () => {
        
        test('should reject invalid recipe ID for retrieval', async () => {
            const response = await request(app)
                .get('/recipes/%20')  // URL-encoded space
                .expect(400);
                
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Recipe ID is required');
        });
    });
});
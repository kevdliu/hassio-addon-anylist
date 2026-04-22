const request = require('supertest');

describe('GET /recipes/:id', () => {
    let app;

    beforeAll(() => {
        app = require('../../index.js');
    });

    test('should return specific recipe by ID', async () => {
        // First get all recipes to find a valid ID
        const recipesResponse = await request(app)
            .get('/recipes')
            .expect(200);

        const firstRecipe = recipesResponse.body.recipes[0];
        
        const response = await request(app)
            .get(`/recipes/${firstRecipe.id}`)
            .expect(200);

        expect(response.body).toHaveProperty('id', firstRecipe.id);
        expect(response.body).toHaveProperty('name');
        expect(response.body).toHaveProperty('ingredients');
        expect(Array.isArray(response.body.ingredients)).toBe(true);
    });

    test('should return 404 for non-existent recipe', async () => {
        await request(app)
            .get('/recipes/nonexistent-recipe-id')
            .expect(404);
    });

    test('should handle AnyList API errors gracefully', async () => {
        global.testUtils.simulateApiState('apiError');

        await request(app)
            .get('/recipes/any-recipe-id')
            .expect(500);
    });

    test('should handle empty recipes when searching by ID', async () => {
        global.testUtils.simulateApiState('emptyRecipes');

        await request(app)
            .get('/recipes/any-recipe-id')
            .expect(404);
    });
});
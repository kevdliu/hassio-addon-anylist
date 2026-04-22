const request = require('supertest');
const { createRecipe } = require('../fixtures');

describe('GET /recipes', () => {
    let app;

    beforeAll(() => {
        app = require('../../index.js');
    });

    test('should return all recipes when no collection filter', async () => {
        const response = await request(app)
            .get('/recipes')
            .expect(200);

        expect(response.body).toHaveProperty('recipes');
        expect(response.body.recipes).toHaveLength(3);
        expect(response.body.recipes[0]).toHaveProperty('id');
        expect(response.body.recipes[0]).toHaveProperty('name');
        expect(response.body.recipes[0]).toHaveProperty('ingredients');
        expect(Array.isArray(response.body.recipes[0].ingredients)).toBe(true);
    });

    test('should filter recipes by collection', async () => {
        // First get available collections
        const collectionsResponse = await request(app)
            .get('/recipe-collections')
            .expect(200);
        
        const collectionName = collectionsResponse.body.collections[0].name;
        
        const response = await request(app)
            .get(`/recipes?collection=${collectionName}`)
            .expect(200);

        expect(response.body.recipes).toHaveLength(1);
        expect(response.body.recipes[0]).toHaveProperty('id');
    });

    test('should filter recipes by collection (case-insensitive)', async () => {
        // First get available collections
        const collectionsResponse = await request(app)
            .get('/recipe-collections')
            .expect(200);
        
        const collectionName = collectionsResponse.body.collections[0].name.toLowerCase();
        
        const response = await request(app)
            .get(`/recipes?collection=${collectionName}`)
            .expect(200);

        expect(response.body.recipes).toHaveLength(1);
    });

    test('should return empty array for non-existent collection', async () => {
        const response = await request(app)
            .get('/recipes?collection=NonExistent')
            .expect(200);

        expect(response.body.recipes).toHaveLength(0);
    });

    test('should handle empty recipes gracefully', async () => {
        global.testUtils.simulateApiState('emptyRecipes');

        const response = await request(app)
            .get('/recipes')
            .expect(200);

        expect(response.body.recipes).toHaveLength(0);
    });

    test('should handle AnyList API errors gracefully', async () => {
        global.testUtils.simulateApiState('apiError');

        await request(app)
            .get('/recipes')
            .expect(500);
    });

    test('should handle collection filtering errors gracefully', async () => {
        global.testUtils.simulateApiState('collectionError');

        // Should still return recipes when collection filtering fails
        const response = await request(app)
            .get('/recipes?collection=TestCollection')
            .expect(200);

        expect(response.body.recipes).toHaveLength(3); // Returns all recipes as fallback
    });
});
const request = require('supertest');

describe('GET /recipe-collections', () => {
    let app;

    beforeAll(() => {
        app = require('../../index.js');
    });

    test('should return all recipe collections', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        expect(response.body).toHaveProperty('collections');
        expect(Array.isArray(response.body.collections)).toBe(true);
        expect(response.body.collections).toHaveLength(2);
        
        const collection = response.body.collections[0];
        expect(collection).toHaveProperty('id');
        expect(collection).toHaveProperty('name');
        expect(collection).toHaveProperty('recipeIds');
        expect(Array.isArray(collection.recipeIds)).toBe(true);
    });

    test('should include valid collection names', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        const collectionNames = response.body.collections.map(c => c.name);
        
        // Should have 2 collections
        expect(collectionNames).toHaveLength(2);
        
        // Each collection should have a valid name (non-empty string)
        collectionNames.forEach(name => {
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        });
        
        // Collection names should be unique
        expect(new Set(collectionNames).size).toBe(collectionNames.length);
    });

    test('should handle AnyList API errors gracefully', async () => {
        global.testUtils.simulateApiState('apiError');

        await request(app)
            .get('/recipe-collections')
            .expect(500);
    });

    test('should handle collection access errors', async () => {
        global.testUtils.simulateApiState('collectionError');

        await request(app)
            .get('/recipe-collections')
            .expect(500);
    });

    test('should return collections data structure properly', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        expect(response.body).toHaveProperty('collections');
        expect(Array.isArray(response.body.collections)).toBe(true);
        
        // Each collection should have the proper structure
        response.body.collections.forEach(collection => {
            expect(collection).toHaveProperty('id');
            expect(collection).toHaveProperty('name');
            expect(collection).toHaveProperty('recipeIds');
            expect(Array.isArray(collection.recipeIds)).toBe(true);
        });
    });
});
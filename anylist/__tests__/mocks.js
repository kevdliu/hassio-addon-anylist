const { faker } = require('@faker-js/faker');
const { createRecipes, createRecipeCollections } = require('./fixtures');

/**
 * Mock AnyList instance factory using MSW-inspired patterns
 * This creates a mock that behaves like the real AnyList API but is completely isolated
 */
class MockAnyListService {
    constructor() {
        this.recipes = createRecipes(3);
        this.collections = createRecipeCollections(2);
        this.lists = [];
        this.isLoggedIn = false;
        
        // Set up some default collections with recipe references using faker
        this.collections[0].name = faker.helpers.arrayElement(['Desserts', 'Sweet Treats', 'Baking', 'Pastries']);
        this.collections[0].recipeIds = [this.recipes[0].identifier];
        this.collections[1].name = faker.helpers.arrayElement(['Main Dishes', 'Entrees', 'Dinner Recipes', 'Hearty Meals']);
        this.collections[1].recipeIds = [this.recipes[1].identifier];
        
        // Add mock functions to recipes
        this.recipes.forEach(recipe => {
            recipe.save = jest.fn().mockResolvedValue(true);
            recipe.delete = jest.fn().mockResolvedValue(true);
        });
    }

    reset() {
        this.recipes = createRecipes(3);
        this.collections = createRecipeCollections(2);
        this.lists = [];
        this.isLoggedIn = false;
        
        // Reset default collections using faker
        this.collections[0].name = faker.helpers.arrayElement(['Desserts', 'Sweet Treats', 'Baking', 'Pastries']);
        this.collections[0].recipeIds = [this.recipes[0].identifier];
        this.collections[1].name = faker.helpers.arrayElement(['Main Dishes', 'Entrees', 'Dinner Recipes', 'Hearty Meals']);
        this.collections[1].recipeIds = [this.recipes[1].identifier];
        
        // Add mock functions to recipes
        this.recipes.forEach(recipe => {
            recipe.save = jest.fn().mockResolvedValue(true);
            recipe.delete = jest.fn().mockResolvedValue(true);
        });
    }

    async login(force = false) {
        this.isLoggedIn = true;
        return true;
    }

    async getLists() {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        return this.lists;
    }

    async getRecipes() {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        return true;
    }

    async _getUserData() {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        return {
            recipeDataResponse: {
                recipeCollections: this.collections
            }
        };
    }

    async createRecipe(recipeData) {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        
        const newRecipe = {
            identifier: `recipe-${Date.now()}`,
            ingredients: [],
            save: jest.fn().mockResolvedValue(true),
            delete: jest.fn().mockResolvedValue(true),
            ...recipeData
        };
        
        this.recipes.push(newRecipe);
        return newRecipe;
    }

    async createItem(itemData) {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        
        return {
            name: itemData.name,
            quantity: itemData.quantity,
            unit: itemData.unit,
            identifier: `item-${Date.now()}`
        };
    }

    async createEvent(eventData) {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in');
        }
        
        const event = {
            identifier: `event-${Date.now()}`,
            save: jest.fn().mockResolvedValue(true),
            ...eventData
        };
        
        return event;
    }

    findRecipeById(id) {
        return this.recipes.find(recipe => recipe.identifier === id);
    }
}

// Create a singleton instance for all tests to use
const mockService = new MockAnyListService();

/**
 * Create mock AnyList constructor
 */
function createMockAnyList() {
    return jest.fn().mockImplementation(() => mockService);
}

/**
 * MSW-style handlers for different scenarios
 */
const handlers = {
    // Successful operations
    success: () => {
        mockService.reset();
        return mockService;
    },

    // Login failure
    loginFailure: () => {
        const service = new MockAnyListService();
        service.login = jest.fn().mockRejectedValue(new Error('Login failed'));
        return service;
    },

    // API error during operations
    apiError: () => {
        const service = new MockAnyListService();
        service.getRecipes = jest.fn().mockRejectedValue(new Error('API Error'));
        service._getUserData = jest.fn().mockRejectedValue(new Error('API Error'));
        return service;
    },

    // Empty recipes
    emptyRecipes: () => {
        const service = new MockAnyListService();
        service.recipes = [];
        return service;
    },

    // Collection access error
    collectionError: () => {
        const service = new MockAnyListService();
        service._getUserData = jest.fn().mockImplementation(() => {
            throw new Error('Collection access error');
        });
        return service;
    }
};

module.exports = {
    MockAnyListService,
    createMockAnyList,
    handlers,
    mockService
};
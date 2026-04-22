const { faker } = require('@faker-js/faker');

/**
 * Generate a fake recipe object using faker
 */
function createRecipe(overrides = {}) {
    const recipe = {
        identifier: faker.string.uuid(),
        name: faker.helpers.arrayElement([
            faker.commerce.productName(),
            `${faker.food.adjective()} ${faker.food.dish()}`,
            `${faker.person.firstName()}'s ${faker.food.dish()}`,
            `${faker.location.country()} Style ${faker.food.dish()}`
        ]),
        note: faker.lorem.sentence(),
        sourceName: faker.helpers.arrayElement([
            faker.company.name(),
            `${faker.person.firstName()} ${faker.person.lastName()}`,
            faker.internet.domainName(),
            'Family Recipe'
        ]),
        sourceUrl: faker.internet.url(),
        ingredients: [],
        preparationSteps: [],
        photoUrls: [],
        cookTime: faker.number.int({ min: 5, max: 120 }),
        prepTime: faker.number.int({ min: 5, max: 60 }),
        servings: faker.number.int({ min: 1, max: 8 }).toString(),
        rating: faker.number.int({ min: 1, max: 5 }),
        nutritionalInfo: `Calories: ${faker.number.int({ min: 100, max: 800 })}, Protein: ${faker.number.int({ min: 5, max: 50 })}g`,
        creationTimestamp: faker.date.past().getTime()
    };

    // Generate 2-5 ingredients
    const ingredientCount = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < ingredientCount; i++) {
        recipe.ingredients.push(createIngredient());
    }

    // Generate 3-6 preparation steps
    const stepCount = faker.number.int({ min: 3, max: 6 });
    for (let i = 0; i < stepCount; i++) {
        recipe.preparationSteps.push(faker.lorem.sentence());
    }

    // Generate 0-3 photo URLs using more realistic image URLs
    const photoCount = faker.number.int({ min: 0, max: 3 });
    for (let i = 0; i < photoCount; i++) {
        recipe.photoUrls.push(faker.image.urlLoremFlickr({ 
            category: 'food',
            width: 640,
            height: 480
        }));
    }

    return { ...recipe, ...overrides };
}

/**
 * Generate a fake ingredient object using faker
 */
function createIngredient(overrides = {}) {
    const units = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'piece', 'cloves', 'pinch'];
    
    const ingredient = {
        name: faker.helpers.arrayElement([
            faker.commerce.productMaterial(),
            faker.food.ingredient(),
            faker.food.vegetable(),
            faker.food.meat(),
            faker.food.spice()
        ]),
        quantity: faker.helpers.arrayElement([
            faker.number.int({ min: 1, max: 5 }).toString(),
            faker.number.float({ min: 0.25, max: 3, fractionDigits: 2 }).toString(),
            `${faker.number.int({ min: 1, max: 2 })}-${faker.number.int({ min: 3, max: 4 })}`,
            'to taste'
        ]),
        unit: faker.helpers.arrayElement(units)
    };

    return { ...ingredient, ...overrides };
}

/**
 * Generate a fake recipe collection using faker
 */
function createRecipeCollection(overrides = {}) {
    const collectionNames = [
        'Desserts', 'Sweet Treats', 'Baking', 'Pastries',
        'Main Dishes', 'Entrees', 'Dinner Recipes', 'Hearty Meals',
        'Appetizers', 'Snacks', 'Breakfast', 'Lunch Ideas',
        'Quick Meals', 'Slow Cooker', 'Vegetarian', 'Healthy Options'
    ];
    
    const collection = {
        identifier: faker.string.uuid(),
        name: faker.helpers.arrayElement(collectionNames),
        recipeIds: []
    };

    // Generate 1-4 recipe IDs
    const recipeCount = faker.number.int({ min: 1, max: 4 });
    for (let i = 0; i < recipeCount; i++) {
        collection.recipeIds.push(faker.string.uuid());
    }

    return { ...collection, ...overrides };
}

/**
 * Generate a fake meal plan event using faker
 */
function createMealPlanEvent(overrides = {}) {
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    const event = {
        identifier: faker.string.uuid(),
        recipeId: faker.string.uuid(),
        date: faker.date.future().toLocaleDateString('en-CA'), // Return as YYYY-MM-DD string
        title: faker.helpers.arrayElement(mealTypes)
    };

    return { ...event, ...overrides };
}

/**
 * Generate multiple recipes
 */
function createRecipes(count, overrides = {}) {
    return Array.from({ length: count }, () => createRecipe(overrides));
}

/**
 * Generate multiple recipe collections
 */
function createRecipeCollections(count, overrides = {}) {
    return Array.from({ length: count }, () => createRecipeCollection(overrides));
}

module.exports = {
    createRecipe,
    createIngredient,
    createRecipeCollection,
    createMealPlanEvent,
    createRecipes,
    createRecipeCollections
};
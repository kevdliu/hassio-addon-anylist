const AnyList = require("anylist");
const express = require("express");
const minimist = require("minimist");
const fs = require("fs");

const args = minimist(process.argv.slice(2));

// Helper function to read secret from file or environment variable
function getSecret(secretName, envName) {
    const secretPath = `/run/secrets/${secretName}`;
    try {
        if (fs.existsSync(secretPath)) {
            return fs.readFileSync(secretPath, 'utf8').trim();
        }
    } catch (err) {
        // Fall back to environment variable if secret file doesn't exist or can't be read
    }
    return args[envName.toLowerCase().replace('_', '-')] || process.env[envName];
}

const PORT = args["port"] || process.env.PORT || 8080;
const EMAIL = args["email"] || process.env.EMAIL;
const PASSWORD = getSecret('anylist_password', 'PASSWORD');
const IP_FILTER = args["ip-filter"] || process.env.IP_FILTER;
const DEFAULT_LIST = args["default-list"] || process.env.DEFAULT_LIST;
const CREDENTIALS_FILE = args["credentials-file"] || process.env.CREDENTIALS_FILE;

async function initialize(onInitialized) {
    let any = new AnyList({email: EMAIL, password: PASSWORD, credentialsFile: CREDENTIALS_FILE});
    await any.login(false);
    await any.getLists();
    return await onInitialized(any);
}

async function getLists() {
    return initialize(async (any) => {
        return any.lists.map(list => list.name);
    });
}

function normalizeListName(name) {
    return name.trim().toUpperCase();
}

function getListByName(any, name) {
    return any.lists.find(l => normalizeListName(l.name) === normalizeListName(name));
}

async function getItems(listName) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return null;
        }

        let items = list.items
        return items
            .map(item => {
                return {
                    name: item.name,
                    id: item.identifier,
                    checked: item.checked || false,
                    notes: item.details || ""
                };
            });
    });
}

async function removeItemByName(listName, itemName) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (item) {
            await list.removeItem(item);
            return 200;
        } else {
            return 304;
        }
    });
}

async function removeItemById(listName, itemId) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemById(itemId);
        if (item) {
            await list.removeItem(item);
            return 200;
        } else {
            return 304;
        }
    });
}

function lookupItemCategory(any, listId, itemName) {
    let recentItems = any.getRecentItemsByListId(listId);
    if (!recentItems) {
        return null;
    }

    let recentItem = recentItems.find((item) => {
        return item.name.toLowerCase() == itemName.toLowerCase();
    });

    if (!recentItem) {
        return null;
    }

    return recentItem.categoryMatchId;
}

function populateItemUpdates(item, updates) {
    if ("name" in updates) {
        item.name = updates["name"];
    }

    if ("checked" in updates) {
        item.checked = updates["checked"];
    }

    if ("notes" in updates) {
        item.details = updates["notes"];
    }
}

async function addItem(listName, itemName, updates) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (!item) {
            let category = lookupItemCategory(any, list.identifier, itemName);
            let newItem = any.createItem({name: itemName, categoryMatchId: category});
            populateItemUpdates(newItem, updates);
            newItem.checked = false;
            await list.addItem(newItem);
            return 200;
        } else if (item.checked) {
            populateItemUpdates(item, updates);
            item.checked = false;
            await item.save();
            return 200;
        } else {
            return 304;
        }
    });
}

async function updateItem(listName, itemId, updates) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemById(itemId);
        if (!item) {
            return 400;
        }

        populateItemUpdates(item, updates);
        await item.save();
        return 200;
    });
}

async function checkItem(listName, itemName, checked) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (!item) {
            return 400;
        }

        if (item.checked == checked) {
            return 304;
        }

        item.checked = checked;
        await item.save();
        return 200;
    });
}

async function getRecipeCollections() {
    return initialize(async (any) => {
        const userData = await any._getUserData();
        const collections = userData.recipeDataResponse?.recipeCollections || [];
        
        return collections.map(collection => ({
            id: collection.identifier,
            name: collection.name,
            recipeIds: collection.recipeIds || []
        }));
    });
}

async function getRecipes(collection) {
    return initialize(async (any) => {
        let recipes = [];
        
        // If filtering by collection, optimize by getting collection recipes first
        if (collection) {
            try {
                // Get collections within the same initialized context
                const userData = await any._getUserData();
                const collections = userData.recipeDataResponse?.recipeCollections || [];
                
                const targetCollection = collections.find(c => 
                    c.name.toLowerCase() === collection.toLowerCase()
                );
                
                if (targetCollection) {
                    // Load all recipes once
                    await any.getRecipes();
                    
                    // Create a Set for faster lookups of collection recipe IDs
                    const collectionRecipeIds = new Set(targetCollection.recipeIds || []);
                    
                    // Filter recipes efficiently using the Set
                    recipes = any.recipes.filter(recipe => 
                        collectionRecipeIds.has(recipe.identifier)
                    );
                } else {
                    // Collection not found, return empty array without loading all recipes
                    return [];
                }
            } catch (error) {
                console.error('Error filtering by collection:', error);
                // If collection filtering fails, fall back to loading all recipes
                await any.getRecipes();
                recipes = any.recipes || [];
            }
        } else {
            // No collection filter, load all recipes
            await any.getRecipes();
            recipes = any.recipes || [];
        }
        
        // Transform recipes to API format
        return recipes.map(recipe => {
            return {
                id: recipe.identifier,
                name: recipe.name,
                note: recipe.note,
                sourceName: recipe.sourceName,
                sourceUrl: recipe.sourceUrl,
                ingredients: recipe.ingredients.map(ing => ({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit
                })),
                preparationSteps: recipe.preparationSteps || [],
                photoUrls: recipe.photoUrls || [],
                cookTime: recipe.cookTime,
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                rating: recipe.rating,
                nutritionalInfo: recipe.nutritionalInfo,
                creationTimestamp: recipe.creationTimestamp
            };
        });
    });
}

async function getRecipeById(recipeId) {
    return initialize(async (any) => {
        await any.getRecipes();
        let recipe = any.recipes.find(r => r.identifier === recipeId);
        
        if (!recipe) {
            return null;
        }
        
        return {
            id: recipe.identifier,
            name: recipe.name,
            note: recipe.note,
            sourceName: recipe.sourceName,
            sourceUrl: recipe.sourceUrl,
            ingredients: recipe.ingredients.map(ing => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit
            })),
            preparationSteps: recipe.preparationSteps || [],
            photoUrls: recipe.photoUrls || [],
            cookTime: recipe.cookTime,
            prepTime: recipe.prepTime,
            servings: recipe.servings,
            rating: recipe.rating,
            nutritionalInfo: recipe.nutritionalInfo,
            creationTimestamp: recipe.creationTimestamp
        };
    });
}

async function createRecipe(recipeData) {
    return initialize(async (any) => {
        try {
            let recipe = await any.createRecipe({
                name: recipeData.name,
                note: recipeData.note,
                sourceName: recipeData.sourceName,
                sourceUrl: recipeData.sourceUrl,
                preparationSteps: recipeData.preparationSteps || [],
                cookTime: recipeData.cookTime,
                prepTime: recipeData.prepTime,
                servings: recipeData.servings,
                rating: recipeData.rating,
                nutritionalInfo: recipeData.nutritionalInfo
            });
            
            // Add ingredients if provided
            if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
                recipe.ingredients = await Promise.all(
                    recipeData.ingredients.map(ing => 
                        any.createItem({
                            name: ing.name,
                            quantity: ing.quantity,
                            unit: ing.unit
                        })
                    )
                );
            }
            
            await recipe.save();
            return { success: true, id: recipe.identifier };
        } catch (error) {
            console.error('Error creating recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function updateRecipe(recipeId, updates) {
    return initialize(async (any) => {
        try {
            await any.getRecipes();
            let recipe = any.recipes.find(r => r.identifier === recipeId);
            
            if (!recipe) {
                return { success: false, error: 'Recipe not found' };
            }
            
            // Update recipe properties
            if ('name' in updates) recipe.name = updates.name;
            if ('note' in updates) recipe.note = updates.note;
            if ('sourceName' in updates) recipe.sourceName = updates.sourceName;
            if ('sourceUrl' in updates) recipe.sourceUrl = updates.sourceUrl;
            if ('preparationSteps' in updates) recipe.preparationSteps = updates.preparationSteps;
            if ('cookTime' in updates) recipe.cookTime = updates.cookTime;
            if ('prepTime' in updates) recipe.prepTime = updates.prepTime;
            if ('servings' in updates) recipe.servings = updates.servings;
            if ('rating' in updates) recipe.rating = updates.rating;
            if ('nutritionalInfo' in updates) recipe.nutritionalInfo = updates.nutritionalInfo;
            
            // Update ingredients if provided
            if ('ingredients' in updates && Array.isArray(updates.ingredients)) {
                // Clear old ingredients
                recipe.ingredients = [];
                
                // Create and await new ingredients
                const newIngredients = await Promise.all(
                    updates.ingredients.map(ing => 
                        any.createItem({
                            name: ing.name,
                            quantity: ing.quantity,
                            unit: ing.unit
                        })
                    )
                );
                
                // Assign resolved ingredients
                recipe.ingredients = newIngredients;
            }
            
            await recipe.save();
            return { success: true, id: recipe.identifier };
        } catch (error) {
            console.error('Error updating recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function deleteRecipe(recipeId) {
    return initialize(async (any) => {
        try {
            await any.getRecipes();
            let recipe = any.recipes.find(r => r.identifier === recipeId);
            
            if (!recipe) {
                return { success: false, error: 'Recipe not found' };
            }
            
            await recipe.delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function addToMealPlan(recipeId, date, mealType) {
    return initialize(async (any) => {
        try {
            let event = await any.createEvent({
                recipeId: recipeId,
                date: new Date(date),
                title: mealType || 'Meal'
            });
            
            await event.save();
            return { success: true, eventId: event.identifier };
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            return { success: false, error: error.message };
        }
    });
}

function getListName(list) {
    return list || DEFAULT_LIST;
}

function enforceRequestSource(req, res) {
    if (!IP_FILTER) {
        return true;
    }

    let ip = req.socket.remoteAddress
    if (ip.startsWith(IP_FILTER)) {
        return true;
    }

    res.sendStatus(403);
    return false;
}

// Input validation helper functions
function validateRecipeData(recipeData, isPartialUpdate = false) {
    const errors = [];
    
    // Required field validation (only for full updates, not partial)
    if (!isPartialUpdate && (!recipeData.name || typeof recipeData.name !== 'string' || recipeData.name.trim() === '')) {
        errors.push('Recipe name is required and must be a non-empty string');
    } else if (isPartialUpdate && recipeData.name !== undefined && (typeof recipeData.name !== 'string' || recipeData.name.trim() === '')) {
        errors.push('Recipe name must be a non-empty string');
    }
    
    // Optional field type validation
    if (recipeData.note !== undefined && typeof recipeData.note !== 'string') {
        errors.push('Recipe note must be a string');
    }
    
    if (recipeData.sourceName !== undefined && typeof recipeData.sourceName !== 'string') {
        errors.push('Source name must be a string');
    }
    
    if (recipeData.sourceUrl !== undefined) {
        if (typeof recipeData.sourceUrl !== 'string') {
            errors.push('Source URL must be a string');
        } else if (recipeData.sourceUrl.trim() !== '' && !isValidUrl(recipeData.sourceUrl)) {
            errors.push('Source URL must be a valid URL format');
        }
    }
    
    // Numeric field validation
    if (recipeData.cookTime !== undefined && (!Number.isInteger(recipeData.cookTime) || recipeData.cookTime < 0)) {
        errors.push('Cook time must be a non-negative integer');
    }
    
    if (recipeData.prepTime !== undefined && (!Number.isInteger(recipeData.prepTime) || recipeData.prepTime < 0)) {
        errors.push('Prep time must be a non-negative integer');
    }
    
    if (recipeData.rating !== undefined && (!Number.isInteger(recipeData.rating) || recipeData.rating < 1 || recipeData.rating > 5)) {
        errors.push('Rating must be an integer between 1 and 5');
    }
    
    // Array field validation
    if (recipeData.ingredients !== undefined) {
        if (!Array.isArray(recipeData.ingredients)) {
            errors.push('Ingredients must be an array');
        } else {
            recipeData.ingredients.forEach((ingredient, index) => {
                if (!ingredient.name || typeof ingredient.name !== 'string' || ingredient.name.trim() === '') {
                    errors.push(`Ingredient ${index + 1}: name is required and must be a non-empty string`);
                }
                if (ingredient.quantity !== undefined && typeof ingredient.quantity !== 'string') {
                    errors.push(`Ingredient ${index + 1}: quantity must be a string`);
                }
                if (ingredient.unit !== undefined && typeof ingredient.unit !== 'string') {
                    errors.push(`Ingredient ${index + 1}: unit must be a string`);
                }
            });
        }
    }
    
    if (recipeData.preparationSteps !== undefined) {
        if (!Array.isArray(recipeData.preparationSteps)) {
            errors.push('Preparation steps must be an array');
        } else {
            recipeData.preparationSteps.forEach((step, index) => {
                if (typeof step !== 'string' || step.trim() === '') {
                    errors.push(`Preparation step ${index + 1}: must be a non-empty string`);
                }
            });
        }
    }
    
    if (recipeData.photoUrls !== undefined) {
        if (!Array.isArray(recipeData.photoUrls)) {
            errors.push('Photo URLs must be an array');
        } else {
            recipeData.photoUrls.forEach((url, index) => {
                if (typeof url !== 'string' || !isValidUrl(url)) {
                    errors.push(`Photo URL ${index + 1}: must be a valid URL format`);
                }
            });
        }
    }
    
    return errors;
}

function validateMealPlanData(data) {
    const errors = [];
    
    if (!data.recipeId || typeof data.recipeId !== 'string' || data.recipeId.trim() === '') {
        errors.push('Recipe ID is required and must be a non-empty string');
    }
    
    if (!data.date || typeof data.date !== 'string') {
        errors.push('Date is required and must be a string');
    } else if (!isValidDate(data.date)) {
        errors.push('Date must be a valid date format (YYYY-MM-DD or ISO string)');
    }
    
    if (data.mealType !== undefined) {
        if (typeof data.mealType !== 'string') {
            errors.push('Meal type must be a string');
        } else {
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'meal'];
            if (!validMealTypes.includes(data.mealType.toLowerCase())) {
                errors.push(`Meal type must be one of: ${validMealTypes.join(', ')}`);
            }
        }
    }
    
    return errors;
}

function validateCollectionParameter(collection) {
    if (collection !== undefined && (typeof collection !== 'string' || collection.trim() === '')) {
        return ['Collection parameter must be a non-empty string'];
    }
    return [];
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isRateLimitError(error) {
    // Check if the error indicates rate limiting from the AnyList API
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const statusCode = error.status || error.statusCode;
    
    // Check for explicit 429 status code
    if (statusCode === 429) return true;
    
    // Check for rate limiting keywords in error messages
    const rateLimitKeywords = [
        'rate limit',
        'too many requests',
        'throttle',
        'rate exceeded',
        'request limit'
    ];
    
    return rateLimitKeywords.some(keyword => 
        errorMessage.toLowerCase().includes(keyword)
    );
}

function handleApiError(error, res, defaultMessage = 'Internal server error') {
    // Handle rate limiting
    if (isRateLimitError(error)) {
        res.status(429);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60 // Suggest retry after 60 seconds
        }));
        return true;
    }
    
    // Handle other specific error types
    const statusCode = error.status || error.statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
        res.status(statusCode);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify({ error: error.message || defaultMessage }));
        return true;
    }
    
    // Default to 500 for unhandled errors
    return false;
}

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$|^\d{4}-\d{2}-\d{2}T/);
}

const app = express();
app.use(express.json());

app.get("/lists", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let lists = await getLists();
    let response = {
        lists: lists
    };

    res.status(200);
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(response));
});

app.get("/items", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.query.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let items = await getItems(listName);
    if (items == null) {
        res.sendStatus(500);
        return;
    }

    let response = {
        items: items
    };

    res.status(200);
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(response));
});

app.post("/add", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let item = req.body.name;
    if (!item) {
        res.sendStatus(400);
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let code = await addItem(listName, item, req.body);
    res.sendStatus(code);
});

app.post("/remove", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    if (req.body.name) {
        let code = await removeItemByName(listName, req.body.name);
        res.sendStatus(code);
    } else if (req.body.id) {
        let code = await removeItemById(listName, req.body.id);
        res.sendStatus(code);
    } else {
        res.sendStatus(400);
    }
});

app.post("/update", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let itemId = req.body.id;
    if (!itemId) {
        res.sendStatus(400);
        return;
    }

    let code = await updateItem(listName, itemId, req.body);
    res.sendStatus(code);
});

app.post("/check", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let itemName = req.body.name;
    if (!itemName) {
        res.sendStatus(400);
        return;
    }

    let checked = req.body.checked;
    if (checked === undefined) {
        res.sendStatus(400);
        return;
    }

    let code = await checkItem(listName, itemName, checked);
    res.sendStatus(code);
});

// Recipe endpoints

app.get("/recipes", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let collection = req.query.collection;
        
        // Validate collection parameter
        const collectionErrors = validateCollectionParameter(collection);
        if (collectionErrors.length > 0) {
            res.status(422);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ errors: collectionErrors }));
            return;
        }
        
        let recipes = await getRecipes(collection);
        
        let response = {
            recipes: recipes
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(response));
    } catch (error) {
        console.error('Error fetching recipes:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.get("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId || typeof recipeId !== 'string' || recipeId.trim() === '') {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: 'Recipe ID is required and must be a non-empty string' }));
            return;
        }

        let recipe = await getRecipeById(recipeId);
        if (!recipe) {
            res.sendStatus(404);
            return;
        }

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(recipe));
    } catch (error) {
        console.error('Error fetching recipe:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.post("/recipes", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeData = req.body;
        
        // Validate recipe data
        const validationErrors = validateRecipeData(recipeData);
        if (validationErrors.length > 0) {
            res.status(422);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ errors: validationErrors }));
            return;
        }

        let result = await createRecipe(recipeData);
        if (result.success) {
            res.status(201);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ id: result.id }));
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error creating recipe:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.put("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId || typeof recipeId !== 'string' || recipeId.trim() === '') {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: 'Recipe ID is required and must be a non-empty string' }));
            return;
        }

        let updates = req.body;
        
        // Validate update data (allow partial updates, so only validate provided fields)
        const validationErrors = validateRecipeData(updates, true);
        if (validationErrors.length > 0) {
            res.status(422);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ errors: validationErrors }));
            return;
        }
        
        let result = await updateRecipe(recipeId, updates);
        
        if (result.success) {
            res.status(200);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ id: result.id }));
        } else if (result.error === 'Recipe not found') {
            res.sendStatus(404);
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.delete("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId || typeof recipeId !== 'string' || recipeId.trim() === '') {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: 'Recipe ID is required and must be a non-empty string' }));
            return;
        }

        let result = await deleteRecipe(recipeId);
        
        if (result.success) {
            res.sendStatus(200);
        } else if (result.error === 'Recipe not found') {
            res.sendStatus(404);
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.get("/recipe-collections", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let collections = await getRecipeCollections();
        let response = {
            collections: collections
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(response));
    } catch (error) {
        console.error('Error fetching recipe collections:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

app.post("/meal-plan", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let mealPlanData = req.body;
        
        // Validate meal plan data
        const validationErrors = validateMealPlanData(mealPlanData);
        if (validationErrors.length > 0) {
            res.status(422);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ errors: validationErrors }));
            return;
        }
        
        let { recipeId, date, mealType } = mealPlanData;
        let result = await addToMealPlan(recipeId, date, mealType);
        
        if (result.success) {
            res.status(201);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ eventId: result.eventId }));
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error adding to meal plan:', error);
        if (!handleApiError(error, res)) {
            res.sendStatus(500);
        }
    }
});

function start() {
    if (!EMAIL || !PASSWORD) {
        console.error("Missing username or password");
        return;
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server port: ${PORT}`);

        if (IP_FILTER) {
            console.log(`IP filter: ${IP_FILTER}`);
        }

        if (DEFAULT_LIST) {
            console.log(`Default list: ${DEFAULT_LIST}`);
        }

        if (CREDENTIALS_FILE) {
            console.log(`Credentials file: ${CREDENTIALS_FILE}`);
        }
    });
}

// Export the app for testing
module.exports = app;

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
    start();
}

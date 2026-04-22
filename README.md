# Home Assistant Addon For Anylist
This addon allows you to add, remove, and fetch items from your Anylist list using REST APIs, and now also supports recipe management and meal planning. If you're looking for a Home Assistant integration to manage your Anylist lists via intents, service calls, and the [to-do list feature](https://www.home-assistant.io/integrations/todo), you need to also install the [Anylist custom integration](https://github.com/tdorsey/hacs-anylist).

## Features
- **Shopping Lists**: Add, remove, update, and fetch items from your shopping lists
- **Recipe Management**: Create, update, delete, and retrieve recipes
- **Meal Planning**: Add recipes to your meal planning calendar


## Installation Methods

### Home Assistant Addon
To install the addon, you have to first add this repository to your Home Assistant addon store. You may do so manually or by clicking the button:


[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Ftdorsey%2Fhassio-addon-anylist)


### Docker Container
The addon is also available as a docker image. If you prefer to use docker compose, download and import [docker-compose.yaml](https://github.com/tdorsey/hassio-addon-anylist/blob/main/anylist/docker-compose.yaml) from the repository. Otherwise, you can also run the container by executing the docker command inside [run-docker.txt](https://github.com/tdorsey/hassio-addon-anylist/blob/main/anylist/run-docker.txt) from the repository. 
In both cases, please make sure to replace the placeholder environment variables with your actual values. 


## Configuration
This addon supports multiple configuration parameters
| Name        | Description                                      | Required |
| ----------- | ------------------------------------------------ | -------- |
| Email       | Anylist account email                            | Yes      |
| Password    | Anylist account password                         | Yes      |
| List        | Name of Anylist list if not specified in request | No       |
| IP Filter*  | Allow requests only from specified IP prefix     | No       |

*Note on IP filter: The server performs a simple check on whether the IP address of the request origin starts with the specified value. Leave it blank to allow requests from all IPs.

For example, if you specify "192.168.1." as the filter, the server will only allow requests from the 192.168.1.x subnet.


## Usage
### Adding an item
Endpoint: POST /add


Body: JSON payload.
| Field  | Description        |
| ------ | ------------------ |
| name   | Name of the item   |
| notes  | Notes for the item |
| list   | Name of the list   |


Response: 200 if added, 304 if item is already on the list.


### Removing an item
Endpoint: POST /remove


Body: JSON payload.
| Field | Description      |
| ----- | ---------------- |
| name  | Name of the item |
| id    | ID of the item   |
| list  | Name of the list |


Note: Either `name` or `id` is required, but not both.

Response: 200 if removed, 304 if item is not on the list.


### Updating an item
Endpoint: POST /update


Body: JSON payload.
| Field   | Description             |
| ------- | ----------------------- |
| id      | ID of the item          |
| name    | New name for the item   |
| checked | New status for the item |
| notes   | Notes for the item      |
| list    | Name of the list        |


Note: Either `name` or `checked` is required. Both can be provided in order to update both properties.

Response: 200 if updated.


### Check or unchecking an item
Endpoint: POST /check


Body: JSON payload.
| Field   | Description             |
| ------- | ----------------------- |
| name    | Name of the item        |
| checked | New status for the item |
| list    | Name of the list        |


Response: 200 if updated, 304 if item status is already the same as `checked`.


### Getting items
Endpoint: GET /items


Query Parameters:
| Field | Description      |
| ----- | ---------------- |
| list  | Name of the list |


Response: 200 with JSON payload.
| Field  | Description      |
| ------ | ---------------- |
| items  | List of items    |


### Getting lists
Endpoint: GET /lists


Response: 200 with JSON payload.
| Field  | Description      |
| ------ | ---------------- |
| lists  | List of lists    |


## Recipe Management
The addon now supports comprehensive recipe management through REST API endpoints. See [RECIPE_API.md](anylist/RECIPE_API.md) for detailed documentation of all recipe endpoints including:

- **GET /recipes** - Retrieve all recipes
- **GET /recipes/{id}** - Get specific recipe details  
- **POST /recipes** - Create new recipe
- **PUT /recipes/{id}** - Update existing recipe
- **DELETE /recipes/{id}** - Delete recipe
- **GET /recipe-collections** - Get recipe collections
- **POST /meal-plan** - Add recipe to meal planning calendar

### Quick Recipe Examples

#### Get all recipes
```bash
curl http://localhost:8080/recipes
```

#### Create a new recipe
```bash
curl -X POST http://localhost:8080/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pasta Carbonara",
    "ingredients": [
      {"name": "Pasta", "quantity": "200", "unit": "g"},
      {"name": "Eggs", "quantity": "2", "unit": ""}
    ],
    "preparationSteps": ["Boil pasta", "Mix eggs with cheese", "Combine"],
    "cookTime": 15,
    "prepTime": 10,
    "servings": "2"
  }'
```

#### Add recipe to meal plan
```bash
curl -X POST http://localhost:8080/meal-plan \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "recipe-id",
    "date": "2024-01-15", 
    "mealType": "Dinner"
  }'
```


# Credit
This addon is made possible by the [Anylist library](https://github.com/codetheweb/anylist) created by [@codetheweb](https://github.com/codetheweb)

# Home Assistant Addon For Anylist
This addon allows you to add, remove, and fetch items from your Anylist list using REST APIs. If you're looking for a Home Assistant integration to manage your Anylist lists via intents, service calls, and the [to-do list feature](https://www.home-assistant.io/integrations/todo), you need to also install the [Anylist custom integration](https://github.com/kevdliu/hacs-anylist).


## Installtion Methods

### Home Assistant Addon
To install the addon, you have to first add this repository to your Home Assistant addon store. You may do so manually or by clicking the button:


[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fkevdliu%2Fhassio-addon-anylist)


### Docker Container
The addon is also available as a docker image. If you prefer to use docker compose, download and import [docker-compose.yaml](https://github.com/kevdliu/hassio-addon-anylist/blob/main/anylist/docker-compose.yaml) from the repository. Otherwise, you can also run the container by executing the docker command inside [run-docker.txt](https://github.com/kevdliu/hassio-addon-anylist/blob/main/anylist/run-docker.txt) from the repository. 
In both cases, please make sure to replace the placeholder envrionment variables with your actual values. 


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


# Credit
This addon is made possible by the [Anylist library](https://github.com/codetheweb/anylist) created by [@codetheweb](https://github.com/codetheweb)

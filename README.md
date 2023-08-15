# Home Assistant Addon For Anylist
This addon allows you to add, remove, and fetch items from your Anylist list using REST APIs.

## Installtion
To install the addon, you have to first add this repository to your Home Assistant addon store. You may do so manually or by clicking the button:


[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fkevdliu%2Fhassio-addon-anylist)


## Configuration
This addon supports multiple configuration parameters
| Name        | Description                                     | Required |
| ----------- | ----------------------------------------------- | -------- |
| Email       | Anylist account email                           | Yes      |
| Password    | Anylist account password                        | Yes      |
| List        | Name of Anylist list                            | Yes      |
| IP Filter*  | Allow requests only from specified IP prefix    | No       |

*Note on IP filter: The server performs a simple check on whether the IP address of the request origin starts with the specified value. Leave it blank to allow requests from all IPs.

For example, if you specify "192.168.1." as the filter, the server will only allow requests from the 192.168.1.x subnet.

# Credit
This addon is made possible by the [Anylist library](https://github.com/codetheweb/anylist) created by [@codetheweb](https://github.com/codetheweb)

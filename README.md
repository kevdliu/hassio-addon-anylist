# Home Assistant Addon For Anylist
This addon allows you to add, remove, and fetch items from your Anylist list using REST APIs.

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

const AnyList = require("anylist");
const express = require("express");
const minimist = require("minimist");

const args = minimist(process.argv.slice(2));

const PORT = args["port"] || process.env.PORT || 8080;
const EMAIL = args["email"] || process.env.EMAIL;
const PASSWORD = args["password"] || process.env.PASSWORD;
const IP_FILTER = args["ip-filter"] || process.env.IP_FILTER;
const DEFAULT_LIST = args["default-list"] || process.env.DEFAULT_LIST;
const CREDENTIALS_FILE = args["credentials-file"] || process.env.CREDENTIALS_FILE;

async function initialize(onInitialized) {
    let any = new AnyList({email: EMAIL, password: PASSWORD, credentialsFile: CREDENTIALS_FILE});
    try {
        await any.login();
        await any.getLists();

        return await onInitialized(any);
    } finally {
        any.teardown();
    }
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
            list.addItem(newItem);
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

start();

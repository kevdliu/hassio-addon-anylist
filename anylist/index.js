const AnyList = require("anylist");
const express = require("express");

const CONTAINER_PORT = 8080;

const config = require("./data/options.json");
const EMAIL = config.email;
const PASSWORD = config.password;
const IP_FILTER = config.ip_filter;

async function initialize(onInitialized) {
    let any = new AnyList({email: EMAIL, password: PASSWORD});
    try {
        await any.login();
        await any.getLists();

        return await onInitialized(any);
    } finally {
        any.teardown();
    }
}

async function getItems(listName) {
    return initialize(async (any) => {
        let list = any.getListByName(listName);
        if (!list) {
            return null;
        }

        let items = list.items
        return items
            .filter(item => {
                return !item.checked
            })
            .map(item => {
                return item.name
            });
    });
}

async function removeItem(listName, itemName) {
    return initialize(async (any) => {
        let list = any.getListByName(listName);
        if (!list) {
            return 500;
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

async function addItem(listName, itemName) {
    return initialize(async (any) => {
        let list = any.getListByName(listName);
        if (!list) {
            return 500;
        }

        let item = list.getItemByName(itemName);
        if (!item) {
            let category = lookupItemCategory(any, list.identifier, itemName);
            let newItem = any.createItem({name: itemName, categoryMatchId: category});
            list.addItem(newItem);
            return 200;
        } else if (item.checked) {
            item.checked = false;
            await item.save();
            return 200;
        } else {
            return 304;
        }
    });
}

function getListName(list) {
    return list || config.list;
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

app.get("/list", async (req, res) => {
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

    let item = req.body.item;
    if (!item) {
        res.sendStatus(400);
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let code = await addItem(listName, item);
    res.sendStatus(code);
});

app.post("/remove", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let item = req.body.item;
    if (!item) {
        res.sendStatus(400);
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let code = await removeItem(listName, item);
    res.sendStatus(code);
});

function start() {
    if (!EMAIL || !PASSWORD) {
        console.error("Missing username or password");
        return;
    }

    app.listen(CONTAINER_PORT, "0.0.0.0", () => {
        let port = process.env.PORT || CONTAINER_PORT;
        console.log(`Server listening on port ${port}`);

        if (IP_FILTER) {
            console.log(`Filtering by IP: ${IP_FILTER}`)
        }
    });
}

start();

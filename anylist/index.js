const AnyList = require("anylist");
const express = require("express");

const CONTAINER_PORT = 8080;

const config = require("./data/options.json");
const EMAIL = config.email;
const PASSWORD = config.password;
const LIST = config.list;
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

async function getItems() {
    return initialize(async (any) => {
        let list = any.getListByName(LIST);
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

async function removeItem(name) {
    return initialize(async (any) => {
        let list = any.getListByName(LIST);
        let item = list.getItemByName(name);
        if (item) {
            await list.removeItem(item);
            return true;
        } else {
            return false;
        }
    });
}

function lookupItemCategory(any, listId, name) {
    let recentItems = any.getRecentItemsByListId(listId);
    if (!recentItems) {
        return null;
    }

    let recentItem = recentItems.find((item) => {
        return item.name.toLowerCase() == name.toLowerCase();
    });

    if (!recentItem) {
        return null;
    }

    return recentItem.categoryMatchId;
}

async function addItem(name) {
    return initialize(async (any) => {
        let list = any.getListByName(LIST);
        let item = list.getItemByName(name);
        if (!item) {
            let category = lookupItemCategory(any, list.identifier, name);
            let newItem = any.createItem({name: name, categoryMatchId: category});
            list.addItem(newItem);
            return true;
        } else if (item.checked) {
            item.checked = false;
            await item.save();
            return true;
        } else {
            return false;
        }
    });
}

function enforceRequestSource(req, res) {
    if (!IP_FILTER) {
        return true;
    }

    let ip = req.socket.remoteAddress
    if (ip.startsWith(IP_FILTER)) {
        return true;
    }

    res.status(403);
    res.header("Content-Type", "text/plain");
    res.send("Forbidden");
    return false;
}

const app = express();
app.use(express.json());

app.get("/list", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let items = await getItems();
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
        res.status(400);
        res.header("Content-Type", "text/plain");
        res.send("Bad request");
        return;
    }

    let added = await addItem(item);
    res.status(added ? 200 : 304);
    res.header("Content-Type", "text/plain");
    res.send(added ? "OK" : "Not modified");
});

app.post("/remove", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let item = req.body.item;
    if (!item) {
        res.status(400);
        res.header("Content-Type", "text/plain");
        res.send("Bad request");
        return;
    }

    let removed = await removeItem(item);
    res.status(removed ? 200 : 304);
    res.header("Content-Type", "text/plain");
    res.send(removed ? "OK" : "Not modified");
});

function start() {
    if (!EMAIL || !PASSWORD || !LIST) {
        console.error("Missing required configuration");
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

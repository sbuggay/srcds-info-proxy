import express from "express";
import http from "http";
import fs from "fs";
import NodeCache from "node-cache";
import gamedig from "gamedig";

const cors = require("cors");

const port = process.env.SRCDS_PORT || 8040;
const filename = process.env.SRCDS_SERVERS || "servers.txt";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

const cache = new NodeCache();
const lastSeenCache = new NodeCache({
    maxKeys: 100
});

const cacheKey = (host: string, port: number) => `${host}:${port || 0}`;

async function getStatus(host: string, port: number, type: gamedig.Type, clearCache = false) {

    const key = cacheKey(host, port)

    if (clearCache) {
        cache.del(key);
    }
    else {
        const cacheResponse = cache.get(key);

        if (cacheResponse) {
            return cacheResponse;
        }
    }

    return gamedig.query({ host, port, type }).then((state) => {
        const { players, bots, ...stripped } = state; // strip out players & bots, we don't care about them and it screws up node-cache.

        const result = {
            lastSeen: Date.now(),
            ...stripped
        }

        cache.set(key, result, 60);
        lastSeenCache.set(key, result)
        return result;
    }).catch(() => { // We don't actually care what the error is, from what I've seen it doesn't even seem to be useful to the end user.
        // If there is an error & we know what it was last, just return that with an extra flag.
        if (lastSeenCache.has(key)) {
            return {
                error: "error",
                ...lastSeenCache.get(key)
            }
        }

        // Otherwise just error.
        cache.set(key, "error", 60);
        return "error";
    });
}

app.get("/", async (req, res) => {
    const host = req.query.host as string;
    const port = parseInt(req.query.port as string);
    const type = req.query.type as gamedig.Type;

    if (!host)
        return res.status(400).send("please provide an ip");

    if (isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");

    if (!type)
        return res.status(400).send("please provide server type");

    const result = await getStatus(host, port, type);
    res.status(200).send(result);
});

const servers = fs.existsSync(filename) && fs.readFileSync(filename).toString().split(/\r?\n/).map(line => {
    const parts = line.split(" ");
    const [host, port] = parts[1].split(":");

    return {
        type: parts[0],
        host: host,
        port: parseInt(port)
    }
});

app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    res.send(servers);
});

app.get("/auto", async (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    const ret: { [key: string]: any } = {};

    await Promise.all(servers.map(async (server) => {
        const status = await getStatus(server.host, server.port, server.type as gamedig.Type);
        ret[cacheKey(server.host, server.port)] = status
    }));

    res.send(ret);
});

app.get("/stats", (_, res) => {
    return res.send({
        cache: cache.stats,
        lastSeenCache: lastSeenCache.stats
    });
});

const INTERVAL = 15000; //update every 15 seconds 

function start() {


    if (servers) {
        const buildCache = () => servers.forEach(async (server) => {
            getStatus(server.host, server.port, server.type as gamedig.Type, true);
        });

        buildCache();
        setInterval(() => buildCache(), INTERVAL);
    }

    http.createServer(app).listen(port, () => {
        console.log(`listening on ${port}`);
    });
}

module.exports = start;

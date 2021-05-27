import express from "express";
import http from "http";
import fs from "fs";
import NodeCache from "node-cache";
import gamedig from "gamedig";
import * as readline from "readline";

const cors = require("cors");

const port = process.env.GAMEDIG_PROXY_PORT || 8040;
const filename = process.env.GAMEDIG_PROXY_SERVERS || "./servers.ini";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

interface IServer {
    type: gamedig.Type;
    host: string;
    port?: number;
}

const cache = new NodeCache();
const lastSeenCache = new NodeCache({
    maxKeys: 100
});
let servers: IServer[] = null;

const parseServers = async (file: string) => {
    console.log(`loading ${file}`);

    if (!fs.existsSync(file)) return null;

    try {
        const fileStream = fs.createReadStream(file);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const servers: IServer[] = [];

        for await (const line of rl) {
            if (!line) continue;

            const parts = line.split(" ");
            const [host, port] = parts[1]?.split(":");

            servers.push({
                type: parts[0] as gamedig.Type,
                host: host,
                port: port && parseInt(port)
            });
        }

        return servers;
    }
    catch (e) {
        console.error(e);
        return null;
    }
}

const cacheKey = (server: IServer) => `${server.type}/${server.host}${server.port ? ":" + server.port : ""}`;

async function getStatus(server: IServer, clearCache = false): Promise<Partial<gamedig.QueryResult & { error: any, lastSeen: any }>> {

    const { host, port, type } = server;
    const key = cacheKey(server);

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
        cache.set(key, { error: "error" }, 60);
        return { error: "error" };
    });
}

app.get("/", async (req, res) => {
    const host = req.query.host as string;
    const port = parseInt(req.query.port as string);
    const type = req.query.type as gamedig.Type;

    if (!host)
        return res.status(400).send("please provide an ip");

    if (port && isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");

    if (!type)
        return res.status(400).send("please provide server type");

    const result = await getStatus({ host, port, type });
    res.send(result);
});

app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    res.send(servers);
});

app.get("/auto", async (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    const result = await Promise.all(servers.map(async (server) => {
        const status = await getStatus(server);
        return {
            host: server.host,
            type: server.type,
            ...status
        }
    }));

    res.send(result);
});

app.get("/stats", (_, res) => {
    return res.send({
        cache: cache.stats,
        lastSeenCache: lastSeenCache.stats
    });
});

const INTERVAL = 15000; //update every 15 seconds 

async function start() {

    servers = await parseServers(filename);

    if (servers) {

        fs.watch(filename, {}, async () => {
            console.log(`${filename} changed`);
            servers = await parseServers(filename);
        });

        const buildCache = () => {
            if (!servers) return;
            servers.forEach((server) => {
                getStatus(server, true);
            });
        }

        buildCache();
        setInterval(() => buildCache(), INTERVAL);
    }

    http.createServer(app).listen(port, () => {
        console.log(`listening on ${port}`);
    });
}

module.exports = start;

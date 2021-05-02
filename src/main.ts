import express from "express";
import http from "http";
import fs from "fs";

const cors = require("cors");
const srcds = require("srcds-info");

const port = process.env.SRCDS_PORT || 8040;
const filename = process.env.SRCDS_SERVERS || "servers.txt";

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

function getStatus(host: string, port: number) {
    return new Promise(resolve => {
        srcds(host, port || 27015, { timeout: 3000 }).info((error: any, info: any) => {
            resolve({ error: error ? error.toString() : undefined, info });
        });
    });
}

app.get("/", async (req, res) => {
    const host = req.query.host as string;
    const port = parseInt(req.query.port as string);

    if (!host)
        return res.status(400).send("please provide an ip");

    if (isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");

    const result = await getStatus(host, port);
    res.status(200).send(result);
});

const servers = fs.existsSync(filename) && fs.readFileSync(filename).toString().split(/\r?\n/);

app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    res.send(servers);
});

const cache: {[key: string]: any} = {};

app.get("/auto", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    const result: {[key: string]: any} = {};

    servers.forEach(server => {
        result[server] = cache[server];
    });

    res.send(result);
});

const INTERVAL = 15000; //cache every 10 seconds 

function start() {

    const buildCache = () => servers.forEach(async (server) => {
        const split = server.split(":");
        const host = split[0];
        const port = parseInt(split[1]) || 27015;

        const result = await getStatus(host, port) as any;

        cache[server] = {
            info: result.info || cache[server]?.info,
            error: result.error,
            lastSeen: result.info ? Date.now() : cache[server]?.lastSeen
        };
    });

    if (servers) {
        buildCache();
        setInterval(() => buildCache(), INTERVAL);
    }

    http.createServer(app).listen(port, () => {
        console.log(`listening on ${port}`);
    });
}

module.exports = start;

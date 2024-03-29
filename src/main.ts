import express from 'express';
import http from 'http';
import NodeCache from 'node-cache';
import { query, Type, QueryResult } from 'gamedig';
import { watch } from 'fs';
import { parseServers } from './utils';

const cors = require('cors');

const port = process.env.GAMEDIG_PROXY_PORT || 8040;
const filename = process.env.GAMEDIG_PROXY_SERVERS || './servers.ini';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

export interface IServer {
    type: Type;
    host: string;
    port?: number;
}

const cache = new NodeCache();
const lastSeenCache = new NodeCache({
    maxKeys: 100
});
let servers: IServer[] = null;

const cacheKey = (server: IServer) => `${server.type}/${server.host}${server.port ? ':' + server.port : ''}`;

async function getStatus(server: IServer, clearCache = false): Promise<Partial<QueryResult & { error: any, lastSeen: any }>> {

    const { host, port, type } = server;
    const key = cacheKey(server);

    if (!clearCache) {
        // Check if it's in the cache already
        const cacheResponse = cache.get(key);

        if (cacheResponse) {
            return cacheResponse;
        }
    }

    const response = query({ host, port, type }).then((state) => {
        const { players, bots, ...stripped } = state; // strip out players & bots, we don't care about them and it screws up node-cache.

        const result = {
            lastSeen: Date.now(),
            ...stripped
        }

        cache.set(key, result, 120);
        lastSeenCache.set(key, result)
        return result;
    }).catch(() => { // We don't actually care what the error is, from what I've seen it doesn't even seem to be useful to the end user.
        // If there is an error & we know what it was last, just return that with an extra flag.
        if (lastSeenCache.has(key)) {
            return {
                error: 'error',
                ...lastSeenCache.get(key) as IServer
            }
        }

        // Otherwise just error.
        cache.set(key, { error: 'error' }, 120);
        return { error: 'error' };
    });

    cache.set(key, query, 120);

    return response;
}

app.get('/', async (req, res) => {
    const host = req.query.host as string;
    const port = parseInt(req.query.port as string);
    const type = req.query.type as Type;

    if (!host)
        return res.status(400).send('please provide an ip');

    if (port && isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send('please provide a valid port');

    if (!type)
        return res.status(400).send('please provide server type');

    const result = await getStatus({ host, port, type });
    res.send(result);
});

app.get('/servers', (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);

    res.send(servers);
});

app.get('/auto', async (_, res) => {
    if (!servers) {
        return res.status(404).send(`no ${filename} found`);
    }

    const result = await Promise.all(servers.map(async (server) => {
        const time = Date.now();
        const status = await getStatus(server);
        return {
            host: server.host,
            type: server.type,
            ...status
        }
    }));

    res.send(result);
});

const INTERVAL = 90000; //update every 90 seconds 

async function start() {

    servers = await parseServers(filename);

    if (servers) {

        watch(filename, {}, async () => {
            console.log(`${filename} changed`);
            servers = await parseServers(filename);
        });

        const buildCache = () => {
            if (!servers) return;
            console.log('build cache');
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

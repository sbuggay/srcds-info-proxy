"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const node_cache_1 = __importDefault(require("node-cache"));
const gamedig_1 = __importDefault(require("gamedig"));
const cors = require("cors");
const port = process.env.SRCDS_PORT || 8040;
const filename = process.env.SRCDS_SERVERS || "servers.txt";
const app = express_1.default();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use(cors());
const cache = new node_cache_1.default();
const lastSeenCache = new node_cache_1.default({
    maxKeys: 100
});
const cacheKey = (host, port) => `${host}:${port || 0}`;
function getStatus(host, port, type, clearCache = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = cacheKey(host, port);
        if (clearCache) {
            cache.del(key);
        }
        else {
            const cacheResponse = cache.get(key);
            if (cacheResponse) {
                return cacheResponse;
            }
        }
        return gamedig_1.default.query({ host, port, type }).then((state) => {
            const { players, bots } = state, stripped = __rest(state, ["players", "bots"]); // strip out players & bots, we don't care about them and it screws up node-cache.
            const result = Object.assign({ lastSeen: Date.now() }, stripped);
            cache.set(key, result, 60);
            lastSeenCache.set(key, result);
            return result;
        }).catch((_) => {
            // If there is an error & we know what it was last, just return that with an extra flag.
            if (lastSeenCache.has(key)) {
                return Object.assign({ error: "error" }, lastSeenCache.get(key));
            }
            // Otherwise just error.
            cache.set(key, "error", 60);
            return "error";
        });
    });
}
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const host = req.query.host;
    const port = parseInt(req.query.port);
    const type = req.query.type;
    if (!host)
        return res.status(400).send("please provide an ip");
    if (isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");
    if (!type)
        return res.status(400).send("please provide server type");
    const result = yield getStatus(host, port, type);
    res.status(200).send(result);
}));
const servers = fs_1.default.existsSync(filename) && fs_1.default.readFileSync(filename).toString().split(/\r?\n/).map(line => {
    const parts = line.split(" ");
    const [host, port] = parts[1].split(":");
    return {
        type: parts[0],
        host: host,
        port: parseInt(port)
    };
});
app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    res.send(servers);
});
app.get("/auto", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    const ret = {};
    yield Promise.all(servers.map((server) => __awaiter(void 0, void 0, void 0, function* () {
        const status = yield getStatus(server.host, server.port, server.type);
        ret[cacheKey(server.host, server.port)] = status;
    })));
    res.send(ret);
}));
app.get("/stats", (_, res) => {
    return res.send({
        cache: cache.stats,
        lastSeenCache: lastSeenCache.stats
    });
});
const INTERVAL = 15000; //update every 15 seconds 
function start() {
    const buildCache = () => servers.forEach((server) => __awaiter(this, void 0, void 0, function* () {
        getStatus(server.host, server.port, server.type, true);
    }));
    if (servers) {
        buildCache();
        setInterval(() => buildCache(), INTERVAL);
    }
    http_1.default.createServer(app).listen(port, () => {
        console.log(`listening on ${port}`);
    });
}
module.exports = start;
//# sourceMappingURL=main.js.map
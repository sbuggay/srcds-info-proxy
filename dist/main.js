"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
const readline = __importStar(require("readline"));
const cors = require("cors");
const port = process.env.GAMEDIG_PROXY_PORT || 8040;
const filename = process.env.GAMEDIG_PROXY_SERVERS || "./servers.ini";
const app = express_1.default();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use(cors());
const cache = new node_cache_1.default();
const lastSeenCache = new node_cache_1.default({
    maxKeys: 100
});
let servers = null;
const parseServers = (file) => __awaiter(void 0, void 0, void 0, function* () {
    var e_1, _a;
    var _b;
    console.log(`loading ${file}`);
    if (!fs_1.default.existsSync(file))
        return null;
    try {
        const fileStream = fs_1.default.createReadStream(file);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        const servers = [];
        try {
            for (var rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = yield rl_1.next(), !rl_1_1.done;) {
                const line = rl_1_1.value;
                if (!line)
                    continue;
                const parts = line.split(" ");
                const [host, port] = (_b = parts[1]) === null || _b === void 0 ? void 0 : _b.split(":");
                servers.push({
                    type: parts[0],
                    host: host,
                    port: port && parseInt(port)
                });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (rl_1_1 && !rl_1_1.done && (_a = rl_1.return)) yield _a.call(rl_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return servers;
    }
    catch (e) {
        console.error(e);
        return null;
    }
});
const cacheKey = (server) => `${server.type}/${server.host}${server.port ? ":" + server.port : ""}`;
function getStatus(server, clearCache = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const { host, port, type } = server;
        const key = cacheKey(server);
        if (!clearCache) {
            // Check if it's in the cache already
            const cacheResponse = cache.get(key);
            if (cacheResponse) {
                return cacheResponse;
            }
        }
        const query = gamedig_1.default.query({ host, port, type }).then((state) => {
            const { players, bots } = state, stripped = __rest(state, ["players", "bots"]); // strip out players & bots, we don't care about them and it screws up node-cache.
            const result = Object.assign({ lastSeen: Date.now() }, stripped);
            cache.set(key, result, 120);
            lastSeenCache.set(key, result);
            return result;
        }).catch(() => {
            // If there is an error & we know what it was last, just return that with an extra flag.
            if (lastSeenCache.has(key)) {
                return Object.assign({ error: "error" }, lastSeenCache.get(key));
            }
            // Otherwise just error.
            cache.set(key, { error: "error" }, 120);
            return { error: "error" };
        });
        cache.set(key, query, 120);
        return query;
    });
}
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const host = req.query.host;
    const port = parseInt(req.query.port);
    const type = req.query.type;
    if (!host)
        return res.status(400).send("please provide an ip");
    if (port && isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");
    if (!type)
        return res.status(400).send("please provide server type");
    const result = yield getStatus({ host, port, type });
    res.send(result);
}));
app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    res.send(servers);
});
app.get("/auto", (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    console.log("auto");
    const result = yield Promise.all(servers.map((server) => __awaiter(void 0, void 0, void 0, function* () {
        const time = Date.now();
        const status = yield getStatus(server);
        console.log(server.host, server.type, Date.now() - time);
        return Object.assign({ host: server.host, type: server.type }, status);
    })));
    res.send(result);
}));
app.get("/stats", (_, res) => {
    return res.send({
        cache: cache.stats,
        lastSeenCache: lastSeenCache.stats
    });
});
const INTERVAL = 90000; //update every 90 seconds 
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        servers = yield parseServers(filename);
        if (servers) {
            fs_1.default.watch(filename, {}, () => __awaiter(this, void 0, void 0, function* () {
                console.log(`${filename} changed`);
                servers = yield parseServers(filename);
            }));
            const buildCache = () => {
                if (!servers)
                    return;
                console.log("build cache");
                servers.forEach((server) => {
                    getStatus(server, true);
                });
            };
            buildCache();
            setInterval(() => buildCache(), INTERVAL);
        }
        http_1.default.createServer(app).listen(port, () => {
            console.log(`listening on ${port}`);
        });
    });
}
module.exports = start;
//# sourceMappingURL=main.js.map
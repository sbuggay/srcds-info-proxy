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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const cors = require("cors");
const srcds = require("srcds-info");
const port = process.env.SRCDS_PORT || 8040;
const filename = process.env.SRCDS_SERVERS || "servers.txt";
const app = express_1.default();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use(cors());
function getStatus(host, port) {
    return new Promise(resolve => {
        srcds(host, port || 27015, { timeout: 3000 }).info((error, info) => {
            resolve({ error: error ? error.toString() : undefined, info });
        });
    });
}
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const host = req.query.host;
    const port = parseInt(req.query.port);
    if (!host)
        return res.status(400).send("please provide an ip");
    if (isNaN(port) || port <= 0 || port >= 65536)
        return res.status(400).send("please provide a valid port");
    const result = yield getStatus(host, port);
    res.status(200).send(result);
}));
const servers = fs_1.default.existsSync(filename) && fs_1.default.readFileSync(filename).toString().split(/\r?\n/);
app.get("/servers", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    res.send(servers);
});
const cache = {};
app.get("/auto", (_, res) => {
    if (!servers)
        return res.status(404).send(`no ${filename} found`);
    const result = {};
    servers.forEach(server => {
        result[server] = cache[server];
    });
    res.send(result);
});
const INTERVAL = 15000; //cache every 10 seconds 
function start() {
    const buildCache = () => servers.forEach((server) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const split = server.split(":");
        const host = split[0];
        const port = parseInt(split[1]) || 27015;
        const result = yield getStatus(host, port);
        cache[server] = {
            info: result.info || ((_a = cache[server]) === null || _a === void 0 ? void 0 : _a.info),
            error: result.error,
            lastSeen: result.info ? Date.now() : (_b = cache[server]) === null || _b === void 0 ? void 0 : _b.lastSeen
        };
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
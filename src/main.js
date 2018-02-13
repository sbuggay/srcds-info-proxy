const restify = require("restify");
const srcds = require("srcds-info");

const server = restify.createServer({
    name: "srcds-info-proxy",
    version: '1.0.0'
});

function getStatus(address, port = 27015) {
    return new Promise((resolve, reject) => {
        const client = srcds(address, port);
        client.info((err, info) => {
            if (err) {
                reject(err)
            }
            resolve(info);
            client.close();
        });
    });
}

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.get("/", (req, res, next) => {
    if (!req.query.ip) {
        res.send(500);
    }

    getStatus(req.query.ip, req.query.port).then((result) => {
        res.send(result);
    });

    return next();
});

server.listen(8080, () => {
    console.log("%s listening at %s", server.name, server.url);
});